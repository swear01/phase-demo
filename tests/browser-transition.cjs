const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const hz=Number(process.env.BROWSER_HZ||60);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Applications/Chromium.app/Contents/MacOS/Chromium'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(hz=>{
  let q=[],time=1000;window.paint=[];window.advance=n=>{for(let i=0;i<n;i++){window.paint=[];const old=q;q=[];old.forEach(cb=>cb(time));time+=1000/hz+.000001;}};window.requestAnimationFrame=cb=>q.push(cb);
  const proto=CanvasRenderingContext2D.prototype,fill=proto.fillRect;
  proto.fillRect=function(x,y,w,h){if(this.fillStyle==='#0e1621'&&w===320&&h===180&&this.globalAlpha<1)window.paint.push({kind:'mask',alpha:this.globalAlpha});return fill.call(this,x,y,w,h);};
 },hz);
 const target=process.argv[2]||path.resolve(__dirname,'../index.html');
 const response=/^https?:/.test(target)?await page.goto(target):null,html=response?await response.text():fs.readFileSync(path.resolve(target),'utf8');
 const player=/function drawPlayer\(p,t\)\s*\{/,scene=/function drawScene\([^)]*\)\s*\{/;
 assert.equal(html.match(new RegExp(player.source,'g'))?.length,1);assert.equal(html.match(new RegExp(scene.source,'g'))?.length,1);
 // Observe actual render calls in a test-only copy, independently of sprite pixels and palette.
 const observed=html.replace(player,match=>match+"window.paint.push({kind:'player',x:p.x,y:p.y,alpha:ctx.globalAlpha,tx:ctx.getTransform().e,ty:ctx.getTransform().f});").replace(scene,match=>match+"window.paint.push({kind:'scene',tx:ctx.getTransform().e,ty:ctx.getTransform().f});");
 await page.route('https://phase-transition.test/',route=>route.fulfill({contentType:'text/html',body:observed}));
 async function open(reduced=false){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.goto('https://phase-transition.test/');
  await page.waitForFunction(()=>typeof Game!=='undefined'&&document.querySelector('#level').options.length>1,null,{polling:50});
  await page.evaluate(()=>{
   const create=Game.create,step=Game.step;window.steps=0;window.inputs=[];
   Game.create=i=>{window.latest=create(i);return latest;};
   Game.step=(s,i,d)=>{steps++;inputs.push(i);if(window.forceWin){forceWin=false;s.player.x=Game.levels[s.level].goal[0];s.player.y=Game.levels[s.level].goal[1]+16-s.player.h;s.won=true;}else step(s,i,d);};advance(1);
  });
 }
 const tick=n=>page.evaluate(n=>advance(n),n*hz/60),paint=()=>page.evaluate(()=>paint);
 async function win(exit,entry,entryFeet=120){
  for(const key of ['ArrowRight','Space','x'])await page.keyboard.up(key);
  await page.evaluate(({exit,entry,entryFeet})=>{
   const room=(name,x,feet)=>{const terrain=Array.from({length:23},()=>'.'.repeat(40));terrain[feet/8]='#'.repeat(40);return {name,phase:0,facing:1,exitDir:-1,spawn:[x/8,feet/8],goal:[x/8,feet/8],goalPhase:0,terrain};};
   const destination=room('入口',entry,entryFeet);destination.goal=[20,1];
   Game.levels[0]=Game.compileRoom(room('出口',exit,120));Game.levels[1]=Game.compileRoom(destination);
  },{exit,entry,entryFeet});
  await page.locator('#level').selectOption('0');await page.locator('#stage').click();
  await page.evaluate(()=>{forceWin=true;});await tick(1);
  assert.equal(await page.locator('#level').inputValue(),'1');assert.equal(await page.evaluate(()=>latest.level),1);
 }
 const heads=p=>p.filter(v=>v.kind==='player'&&v.alpha>0),mask=p=>p.find(v=>v.kind==='mask'),camera=p=>p.filter(v=>v.kind==='scene'&&Math.abs(v.tx)>0);
 await open();
 for(const [exit,entry,dir] of [[304,8,1],[8,304,-1]]){
  await win(exit,entry);const steps=await page.evaluate(()=>steps);
  await tick(6);let p=await paint();assert.equal(camera(p).length,2,'opposite edges scroll their room snapshots');
  assert.equal(Math.sign(camera(p)[0].tx),-dir);assert.equal(Math.sign(camera(p)[1].tx),dir);
  assert.equal(mask(p),undefined);assert.deepEqual(heads(p).map(v=>v.x),[exit],'old player remains at its own local position');
  await tick(12);p=await paint();assert.deepEqual(heads(p).map(v=>v.x),[entry],'new player appears at its own spawn, without interpolation');
  assert.equal(await page.evaluate(()=>steps),steps,'simulation freezes during transition');await tick(8);
 }
 for(const [exit,entry,entryFeet] of [[304,304,120],[8,8,120],[160,8,120],[304,8,136]]){
  await win(exit,entry,entryFeet);await tick(6);let p=await paint();
  assert.equal(camera(p).length,0,'same side, interior exits and misaligned rooms do not imply adjacency');
  assert(mask(p).alpha>.45&&mask(p).alpha<.55);assert.deepEqual(heads(p).map(v=>[v.x,v.tx]),[[exit,0]]);
  await tick(12);p=await paint();assert.deepEqual(heads(p).map(v=>[v.x,v.tx]),[[entry,0]]);assert(mask(p).alpha>.45&&mask(p).alpha<.55);await tick(8);
 }
 await win(304,304);await tick(6);await page.keyboard.press('Escape');assert(await page.locator('#overlay').isVisible());
 const paused=await paint(),steps=await page.evaluate(()=>steps);await tick(60);assert.deepEqual(await paint(),paused,'pause freezes transition rendering');assert.equal(await page.evaluate(()=>steps),steps);
 await page.keyboard.press('Escape');await tick(3);assert.notDeepEqual(await paint(),paused,'resume continues the same transition');await tick(20);
 await win(304,304);await tick(6);await page.locator('#level').selectOption('2');await page.locator('#stage').click();await tick(1);
 assert.equal(await page.evaluate(()=>latest.level),2);assert.equal(mask(await paint()),undefined,'selecting a room cancels the old transition');
 await win(304,304);await tick(6);await page.keyboard.press('r');await tick(1);assert.equal(await page.evaluate(()=>latest.level),1);assert.equal(mask(await paint()),undefined,'restart cancels transition and resets the destination');
 await win(304,304);await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await tick(30);
 assert.equal(await page.evaluate(()=>latest.jumps),0,'transition input cannot become a queued jump');assert.equal(await page.evaluate(()=>latest.player.vx),0,'held transition input is cleared before play');
 await page.keyboard.up('ArrowRight');await page.keyboard.up('Space');await page.keyboard.down('ArrowRight');await tick(3);assert(await page.evaluate(()=>latest.player.vx>0),'fresh input works after transition');await page.keyboard.up('ArrowRight');
 await open(true);await win(304,304);assert.equal(camera(await paint()).length,0);assert.equal(mask(await paint()),undefined,'reduced motion cuts directly to destination');
 assert.deepEqual(heads(await paint()).map(v=>v.x),[304]);const before=await page.evaluate(()=>steps);await tick(1);assert.equal(await page.evaluate(()=>steps),before+1,'reduced motion does not wait for animation');
 assert.deepEqual(errors,[]);console.log(`PASS ${hz} Hz: opposite-edge scroll, same-side/interior/height-mismatch fades, player-local rendering, pause/resume, selection/reset cancellation, input clearing and reduced motion.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
