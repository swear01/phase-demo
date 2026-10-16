const {G,idle}=require('./controller.cjs'),fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=JSON.parse(fs.readFileSync(__dirname+'/reference-movement.json'));
let failures=0;
for(const c of fixture.cases){
 const index=G.levels.length,b=c.floor,init=c.initial;
 G.levels.push({phase:0,spawn:[init.pos.x-4,init.pos.y-11],facing:1,goal:[-1000,-1000],goalPhase:0,blocks:[0,1,2].map(phase=>({x:b.x,y:b.y,w:b.width,h:b.height,phase}))});G.palettes.push(G.colors);
 const s=G.create(index);s.player.vx=init.speed.x;s.player.vy=init.speed.y;s.player.grounded=init.on_ground;s.player.coyote=init.on_ground?G.P.grace:0;
 let held=false;
 for(let i=0;i<c.inputs.length;i++){
  const a=c.inputs[i];G.step(s,{...idle,x:1,jump:a.jump&&!held,jumpHeld:a.jump},fixture.dt);held=a.jump;
  const expected=c.expected[i],actual={x:s.player.x+4,y:s.player.y+s.player.h,vx:s.player.vx,vy:s.player.vy};
  const diff=Object.keys(expected).filter(k=>Math.abs(actual[k]-expected[k])>(k==='x'||k==='y'?0:.002));
  if(diff.length){console.log(c.name,'first mismatch',i+1,{actual,expected,diff});failures++;break;}
 }
}
assert.equal(failures,0,'per-frame movements match independent Rust reference');console.log('PASS: seven source-informed reference traces agree frame by frame.');
