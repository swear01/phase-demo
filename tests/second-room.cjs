// Historical eight-room campaign; this does not validate the current level 2.
const baseline=require('./legacy/campaign.cjs'),G=baseline.loadGame(),{idle}=baseline,assert=require('node:assert/strict');
const route=baseline.routes.find(r=>r.level===1),s=G.create(1),phases=[],walls=[];
let count=0,minY=Infinity;
for(const a of route.actions)for(let i=0;i<route.ticks&&!s.won;i++){
 const wall=s.player.wall;G.step(s,{...a,jump:!i&&a.jump,dash:!i&&a.dash});minY=Math.min(minY,s.player.y);
 if(s.jumps!==count){phases.push(s.phase);if(count)walls.push(wall);count=s.jumps;}
}
assert(s.won&&s.jumps===5&&s.dashes===1&&s.deaths===0);
assert.deepEqual(phases,[1,2,0,1,2]);assert.deepEqual(walls,[1,-1,1,-1]);assert(minY>=0,'route stays visible');
assert.equal(G.palettes[0][2].name,'綠');assert.equal(G.palettes[1][2].name,'綠');
for(const phase of [0,1,2]){
 const check=G.create(1);check.phase=phase;Object.assign(check.player,{x:G.levels[1].goal[0],y:G.levels[1].goal[1]});G.step(check,idle);assert.equal(check.won,phase===2,'exit needs green phase');
}
const retry=G.create(1);retry.player.y=200;G.step(retry,idle);for(let i=0;i<20;i++)G.step(retry,idle);assert.equal(retry.level,1);assert.equal(retry.phase,0);assert.equal(retry.player.dash,1);
console.log(`PASS historical campaign room 2: ${s.time.toFixed(1)}s, five jumps, one dash, zero deaths, blue-green-red-blue-green; four alternating wall jumps stay on screen; green exit and room checkpoint.`);
