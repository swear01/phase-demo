const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const hz=Number(process.env.BROWSER_HZ||60),url='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../index.html'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Applications/Chromium.app/Contents/MacOS/Chromium'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(hz=>{let queue=[],time=1000;window.requestAnimationFrame=cb=>queue.push(cb);window.advance=n=>{for(let i=0;i<n;i++){let q=queue;queue=[];q.forEach(cb=>cb(time));time+=1000/hz+.000001;}};},hz);
  const tick=n=>page.evaluate(n=>advance(n),n*hz/60);
  await page.goto(url);await page.evaluate(()=>{Game.levels[0]={...Game.levels[0],spawn:[24,149],goal:[-100,-100],spikes:[],blocks:[{x:8,y:160,w:56,h:8,phase:0}]};const step=Game.step;Game.step=(s,i,d)=>{step(s,i,d);window.live=s;};advance(1);});
  for(const key of ['Space','z'])for(let delay=0;delay<8;delay++){
   await page.locator('#level').selectOption('0');await page.locator('#stage').click();await page.keyboard.down('ArrowRight');
   for(let i=0;i<100;i++){await tick(1);if(await page.evaluate(()=>live&&!live.player.grounded))break;}
   assert(await page.evaluate(()=>!live.player.grounded&&live.player.coyote>0),'keyboard walks naturally off ledge');
   await tick(delay);await page.keyboard.down(key);await tick(1);
   const state=await page.evaluate(()=>({jumps:live.jumps,phase:live.phase,vy:live.player.vy}));
   assert.equal(state.jumps,delay<5?1:0,`${hz} Hz, ${key}, airborne input frame ${delay+1}`);
   assert.equal(state.phase,delay<5?1:0,'only successful takeoff changes color');
   await page.keyboard.up(key);await page.keyboard.up('ArrowRight');
  }
  assert.deepEqual(errors,[]);await page.close();
  const realtime=await browser.newPage();await realtime.goto(url);
  await realtime.evaluate(()=>{Game.levels[0]={...Game.levels[0],spawn:[24,149],goal:[-100,-100],spikes:[],blocks:[{x:8,y:160,w:56,h:8,phase:0}]};const step=Game.step;Game.step=(s,i,d)=>{const was=s.player.grounded,jumps=s.jumps;step(s,i,d);window.live=s;if(was&&!s.player.grounded&&!s.jumps)window.edgeAt=performance.now();if(s.jumps>jumps)window.jumpAt=performance.now();};});
  await realtime.locator('#level').selectOption('0');await realtime.locator('#stage').click();await realtime.keyboard.down('ArrowRight');await realtime.waitForFunction(()=>window.edgeAt!==undefined,{polling:'raf'});await realtime.keyboard.down('Space');await realtime.waitForFunction(()=>window.jumpAt!==undefined,{timeout:1000});
  const elapsed=await realtime.evaluate(()=>jumpAt-edgeAt);assert(elapsed<=100,`real-time coyote jump responds within 100 ms: ${elapsed}`);await realtime.close();
  console.log(`PASS: ${hz} Hz, 16 actual keyboard coyote boundary cases (Space/Z); real-time walk-off jump after ${elapsed.toFixed(1)} ms.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
