const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),context={};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../index.html','utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1]+'\nglobalThis.Game=Game;',context);
const G=context.Game,fixture=JSON.parse(fs.readFileSync(__dirname+'/reference-actions.json'));
let failures=0;
for(const c of fixture.cases){
 const level=G.levels.length,p=c.initial;
 G.levels.push({phase:0,spawn:[p.pos.x-4,p.pos.y-11],facing:p.facing===false?-1:1,goal:[-1000,-1000],goalPhase:0,blocks:[0,1,2].flatMap(phase=>c.solids.map(b=>({x:b.x,y:b.y,w:b.width,h:b.height,phase})))});G.palettes.push(G.colors);
 const s=G.create(level);Object.assign(s.player,{vx:p.speed.x,vy:p.speed.y,grounded:p.on_ground,coyote:p.on_ground?G.P.grace:0,maxFall:(p.max_fall||160)});
 let previous={};
 for(let i=0;i<c.inputs.length;i++){
  const a=c.inputs[i];G.step(s,{x:Number(a.right)-Number(a.left),y:Number(a.down)-Number(a.up),jump:a.jump&&!previous.jump,jumpHeld:a.jump,dash:a.dash&&!previous.dash,dashHeld:a.dash,grab:a.grab},fixture.dt);previous=a;
  const expected=c.expected[i],actual={x:s.player.x+4,y:s.player.y+s.player.h,vx:s.player.vx,vy:s.player.vy,stamina:s.player.stamina};
  const diff=Object.keys(expected).filter(k=>Math.abs(actual[k]-expected[k])>(k==='x'||k==='y'?0:.002));
  if(diff.length){console.log(c.name,'frame',i+1,{actual,expected,diff});failures++;break;}
 }
}
assert.equal(failures,0,'movement timings match independently executed reference');console.log(`PASS: ${fixture.cases.length} action traces agree frame by frame.`);
