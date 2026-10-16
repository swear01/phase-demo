// Historical eight-room campaign wall-relay probes.
const baseline=require('./legacy/campaign.cjs'),G=baseline.loadGame(),{idle}=baseline,assert=require('node:assert/strict');
let direct=0;
for(let walk=0;walk<65;walk++)for(const dx of [-1,0,1])for(const dy of [-1,0,1])if(dx||dy)for(const direction of [-1,0,1]){
 const s=G.create(1);for(let i=0;i<walk&&!s.respawn;i++)G.step(s,{...idle,x:1});if(s.respawn)continue;
 for(let i=0;i<110&&!s.respawn;i++){
  G.step(s,{...idle,x:i<5?dx:direction,y:i<5?dy:-1,dash:i===0,grab:i>=5});
  assert(!s.won);assert(G.wallAt(s.player,G.solid(s),direction||s.player.facing)?.block!==G.levels[1].blocks.find(b=>b.phase===0&&b.h>8),JSON.stringify({walk,dx,dy,direction,i,x:s.player.x,y:s.player.y}));
 }
 direct++;
}
const firstWallX=G.levels[1].blocks.find(b=>b.phase===1&&b.h>8).x-8;
const route=baseline.routes.find(r=>r.level===1),first=G.create(1);
outer:for(const a of route.actions)for(let i=0;i<route.ticks;i++){
 G.step(first,{...a,jump:!i&&a.jump,dash:!i&&a.dash});if(first.jumps===1&&first.player.wall===1&&Math.abs(first.player.x-firstWallX)<4)break outer;
}
assert(first.jumps===1&&first.player.wall===1&&Math.abs(first.player.x-firstWallX)<4&&!first.deaths&&!first.respawn,'shortcut probe starts on first blue wall');let shortcuts=0;
for(let climb=0;climb<160;climb+=4)for(const push of [-1,0,1])for(let delay=-1;delay<70;delay+=4)for(const dy of [-1,0,1]){
 const s=structuredClone(first);for(let i=0;i<climb&&!s.respawn;i++)G.step(s,{...idle,x:1,y:-1,grab:true});if(s.respawn)continue;
 G.step(s,{...idle,x:push,grab:true,jump:true,jumpHeld:true});if(s.jumps!==2)continue;
 for(let i=0;i<150&&!s.respawn&&!s.won;i++)G.step(s,{...idle,x:1,y:i>=delay&&i<delay+6?dy:0,jumpHeld:true,dash:i===delay});
 assert(!s.won,JSON.stringify({climb,push,delay,dy,x:s.player.x,y:s.player.y}));shortcuts++;
}
console.log(`PASS historical campaign: ${direct} walk-off dash/grab variants and ${shortcuts} two-jump climb/dash variants cannot bypass the wall relay. Bounded search, not a proof of minimum jumps.`);
