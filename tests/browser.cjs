const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const target=process.argv[2]||root+'/index.html',hz=Number(process.env.BROWSER_HZ||60);
const routes=JSON.parse(fs.readFileSync(root+'/tests/route.json')),A=require('../scripts/audit-mechanisms.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Applications/Chromium.app/Contents/MacOS/Chromium'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(hz=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.advance=n=>{for(let i=0;i<n;i++){const a=q;q=[];a.forEach(f=>f(t));t+=1000/hz+.000001;}};},hz);
 const response=await page.goto(/^https?:/.test(target)?target:'file://'+path.resolve(target));if(/^https?:/.test(target))assert.equal(response.status(),200);
 await page.waitForFunction(n=>document.querySelector('#level')?.options.length===n,routes.length,{polling:50});
 await page.evaluate(()=>{const step=Game.step;Game.step=(s,i,d)=>{step(s,i,d);window.observed=s;};advance(1);});
 const tick=n=>page.evaluate(n=>advance(n),n*hz/60);
 assert.equal(await page.locator('#game').getAttribute('width'),'320');assert.equal(await page.locator('#game').getAttribute('height'),'180');assert.equal(await page.evaluate(()=>Game.TILE),8);
 assert.equal(await page.locator('#level option').count(),routes.length);assert(await page.locator('#overlay').isVisible());
 await page.locator('#ov-primary').click();await tick(2);
 await page.keyboard.press('Space');await tick(1);assert.match(await page.locator('#phase-name').textContent(),/藍/);
 await page.keyboard.press('x');await tick(8);assert.match(await page.locator('#phase-name').textContent(),/藍/);
 await page.keyboard.press('Escape');assert(await page.locator('#overlay').isVisible());
 const frozen=await page.evaluate(()=>[observed.time,observed.player.x,observed.player.y]);await tick(60);
 assert.deepEqual(await page.evaluate(()=>[observed.time,observed.player.x,observed.player.y]),frozen);
 await page.keyboard.press('Escape');assert(!(await page.locator('#overlay').isVisible()));
 async function select(level){await page.locator('#level').selectOption(String(level));await page.locator('#stage').click();await tick(1);}
 async function replay(route){
  const held=new Set();
  for(const a of route.actions){
   const next=new Set();if(a.x>0)next.add('ArrowRight');if(a.x<0)next.add('ArrowLeft');if(a.y>0)next.add('ArrowDown');if(a.y<0)next.add('ArrowUp');if(a.jumpHeld)next.add('Space');if(a.dashHeld)next.add('x');if(a.grab)next.add('c');
   for(const key of held)if(!next.has(key)||(a.jump&&key==='Space')||(a.dash&&key==='x'))await page.keyboard.up(key);
   for(const key of next)if(!held.has(key)||(a.jump&&key==='Space')||(a.dash&&key==='x'))await page.keyboard.down(key);
   if(a.dash&&!next.has('x'))await page.keyboard.press('x');held.clear();for(const key of next)held.add(key);
   await tick(route.ticks);
  }
  for(const key of held)await page.keyboard.up(key);
 }
 await select(0);
 for(const route of routes){await replay(route);if(route.level<routes.length-1){assert.equal(await page.locator('#level').inputValue(),String(route.level+1));assert(!(await page.locator('#overlay').isVisible()));await tick(70);}}
 assert(await page.locator('#overlay').isVisible());assert.match(await page.locator('#ov-title').textContent(),/完成/);assert.equal(await page.evaluate(()=>observed.deaths),0);
 await page.locator('#ov-primary').click();await tick(2);assert.equal(await page.locator('#level').inputValue(),'0');
 const mistake=require('./mistakes.json').find(r=>r.level===1);
 await select(1);await replay({ticks:1,actions:A.expand(mistake)});assert.equal(await page.evaluate(()=>observed.level),1);assert((await page.evaluate(()=>observed.deaths))>=1);await tick(25);
 await page.keyboard.press('r');await tick(2);assert.equal(await page.evaluate(()=>observed.deaths),0);await replay(routes[1]);assert.equal(await page.locator('#level').inputValue(),'2');
 assert.equal(await page.locator('.pad,[data-key]').count(),0,'desktop game has no virtual controls');
 await page.locator('#level').focus();assert.equal(await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{key:'ArrowDown',code:'ArrowDown',bubbles:true,cancelable:true});document.getElementById('level').dispatchEvent(e);return e.defaultPrevented;}),false);
 assert.deepEqual(errors,[]);console.log(`PASS ${hz} Hz: ${routes.length} rooms clear with keyboard, phase/dash, transitions, completion/replay, pause, checkpoint, reset, no virtual controls and select key handling.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
