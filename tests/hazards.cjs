const {G,idle,ticks}=require('./controller.cjs'),assert=require('node:assert/strict');
function room(spikes=[]){return {name:'hazard fixture',phase:0,facing:1,spawn:[3,20],goal:[36,20],goalPhase:0,terrain:Array.from({length:23},(_,y)=>y===20?'W'.repeat(40):'.'.repeat(40)),spikes};}
function add(r){const index=G.levels.length;G.levels.push(G.compileRoom(r));G.palettes.push(G.colors);return G.create(index);}
const dirs=['up','down','left','right'],colors=['R','B','G','Y','M','C','W'];
for(const dir of dirs)for(const color of colors)for(let phase=0;phase<3;phase++){
 const s=add(room([{x:10,y:10,length:2,dir,color}])),h=G.levels[s.level].spikes[0],b=G.spikeBox(h);s.phase=phase;
 assert.equal(h.phaseMask,G.phaseMasks[color]);assert.equal(G.solid(s).length,1,'spikes are hazards, never standable or climbable solids');
 Object.assign(s.player,{x:b.x,y:b.y,grounded:false,coyote:0,vx:-90});ticks(s,1,{...idle,x:-1});
 assert.equal(s.deaths,Number(G.activeInPhase(h,phase)),`${color} ${dir} activation in phase ${phase}`);
}
for(const patch of [{x:-1},{y:-1},{x:40},{y:23},{x:39,length:2},{length:0},{length:1.5},{dir:'diagonal'},{color:'#'},{color:'Q'},{color:['R']},{x:1.2}]){
 const r=room([{x:10,y:10,length:1,dir:'up',color:'R',...patch}]);assert.throws(()=>G.compileRoom(r),/Invalid tile spikes/);
}
assert.throws(()=>G.compileRoom(room(null)),/Invalid tile spikes/);assert.throws(()=>G.compileRoom(room([null])),/Invalid tile spikes/);
assert.throws(()=>G.compileRoom(room([{x:1,y:22,length:2,dir:'left',color:'W'}])),/Invalid tile spikes/);
for(const dir of dirs){
 const s=add(room([{x:10,y:10,length:1,dir,color:'W'}])),b=G.spikeBox(G.levels[s.level].spikes[0]);
 const horizontal=dir==='left'||dir==='right';Object.assign(s.player,{x:horizontal?b.x-8:b.x,y:horizontal?b.y:b.y-11,grounded:false,coyote:0});ticks(s,1);
 assert.equal(s.deaths,0,`${dir}: touching the 3 px box edge without overlap remains safe`);
}
for(const dir of dirs){
 const s=add(room([{x:10,y:10,length:1,dir,color:'W'}])),b=G.spikeBox(G.levels[s.level].spikes[0]);
 const horizontal=dir==='left'||dir==='right',sign=dir==='up'||dir==='left'?1:-1;
 Object.assign(s.player,{x:horizontal?(sign>0?b.x-20:b.x+b.w+12):b.x,y:horizontal?b.y:(sign>0?b.y-24:b.y+b.h+12),vx:horizontal?sign*3000:0,vy:horizontal?0:sign*3000,grounded:false,coyote:0,dashTime:.15,dx:horizontal?sign:0,dy:horizontal?0:sign});
 ticks(s,1);assert.equal(s.deaths,1,`${dir}: a high-speed traversal cannot tunnel through a 3 px spike strip`);
}
for(const dir of dirs){
 const s=add(room([{x:10,y:10,length:1,dir,color:'W'}])),b=G.spikeBox(G.levels[s.level].spikes[0]);
 const horizontal=dir==='left'||dir==='right',sign=dir==='up'||dir==='left'?1:-1;
 Object.assign(s.player,{x:horizontal?(sign>0?b.x-20:b.x+b.w+12):b.x,y:horizontal?b.y:(sign>0?b.y-24:b.y+b.h+12),grounded:false,coyote:0});
 for(let i=0;i<20&&!s.deaths;i++)G.step(s,{...idle,x:horizontal?sign:0,y:horizontal?0:sign,dash:i===0,dashHeld:true});
 assert.equal(s.dashes,1);assert.equal(s.deaths,1,`${dir}: actual keyboard dash meets lethal strip`);
}
let r=room([{x:10,y:18,length:1,dir:'up',color:'B'}]);r.spawn=[10,20];r.goal=[10,20];r.goalPhase=1;let s=add(r);
ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.phase,1);assert.equal(s.deaths,1,'jump activation kills immediately, without solid materialization grace');assert.equal(s.blocked.size,0);assert(!s.won&&!s.events.includes('win'),'death wins priority over same-frame goal contact');
ticks(s,20);assert.equal(s.deaths,1);assert.equal(s.phase,0);assert.equal(s.player.dash,1);assert.equal(s.respawn,0,'respawn restores safe starting color and movement state');
r=room([{x:10,y:18,length:1,dir:'up',color:'W'}]);r.spawn=[10,20];r.goal=[10,20];s=add(r);ticks(s,1);assert.equal(s.deaths,1);assert(!s.won,'initial lethal overlap wins priority over the exit');
r=room([{x:10,y:18,length:1,dir:'up',color:'W'}]);r.spawn=[10,20];s=add(r);s.freeze=.05;ticks(s,1);assert.equal(s.deaths,1,'dash freeze does not postpone an existing lethal overlap');
r=room([{x:10,y:10,length:1,dir:'up',color:'W'}]);s=add(r);Object.assign(s.player,{x:71,y:82,grounded:false,coyote:0});ticks(s,4,{...idle,x:1});assert.equal(s.deaths,1,'side contact with the active strip is lethal');
r=room([{x:12,y:8,length:4,dir:'right',color:'W'}]);r.terrain=Array(23).fill('.'.repeat(40));r.spawn=[5,10];r.mover={kind:'return',nodes:[[5,10],[20,10]],w:2,h:1,start:0};s=add(r);
Object.assign(s.mover,{moving:true,index:1,fromX:40,fromY:80,elapsed:0,duration:.2});for(let i=0;i<12&&!s.deaths;i++)ticks(s,1);assert.equal(s.deaths,1,'a carried rider hits spikes throughout the platform path');
console.log('PASS: 7 spike masks in 4 orientations, compiler bounds, initial/phase/side contact, high-speed and actual dash sweeps, platform carry, death priority and safe respawn.');
