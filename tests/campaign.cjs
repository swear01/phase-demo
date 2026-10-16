// Current campaign: real-spawn successes, timing variants and actual spike deaths.
const assert=require('node:assert/strict'),A=require('../scripts/audit-mechanisms.cjs'),T=require('./route-tools.cjs'),R=require('../scripts/audit-rooms.cjs');
const maps=require('../levels.json'),routes=require('./route.json'),contracts=require('./mechanisms.json'),plan=require('./campaign.json'),mistakes=require('./mistakes.json'),variants=require('./tolerances.json'),G=A.loadGame();
assert.equal(maps.rooms.length,8);assert.equal(routes.length,8);assert.equal(contracts.units,'tiles');assert.equal(plan.rooms.length,8);
const key=a=>JSON.stringify([a.x,a.y,!!a.jumpHeld,!!a.dashHeld,!!a.grab]);
function moving(actions){return actions.filter(a=>a.x||a.y||a.jumpHeld||a.dashHeld||a.grab).map(key);}
for(let level=0;level<8;level++){
 const room=maps.rooms[level],items=contracts.rooms.find(r=>r.level===level).mechanisms,reference=routes.find(r=>r.level===level),expected=plan.rooms.find(r=>r.level===level);
 assert(!Object.hasOwn(room,'tip'),'no solution prose in map UI');assert(room.spikes.length>0,'every room is authored with hazards');A.validate(items);
 const initial=G.create(level);for(let i=0;i<60;i++)G.step(initial,A.idle);assert(!initial.deaths&&initial.player.grounded,'spawn is a safe observation point');
 const actions=A.expand(reference),r=A.replay(G,level,items,actions);
 assert(r.s.won&&!r.s.deaths,`room ${level+1} normal route clears`);assert.deepEqual(r.missing,[],`room ${level+1} declared interactions occur`);
 assert.equal(r.s.phase,room.goalPhase);assert.equal(r.s.jumps,expected.jumps);assert.equal(r.s.dashes,expected.dashes);
 const tolerances=variants.filter(v=>v.level===level);assert(tolerances.length>=3,'three complete tolerance routes per room');
 const distinct=new Set();let changedMovement=false;
 for(const variant of tolerances){const a=A.expand(variant),v=A.replay(G,level,items,a);assert(v.s.won&&!v.s.deaths,`room ${level+1} tolerance ${variant.name} clears`);assert.deepEqual(v.missing,[],`tolerance keeps the puzzle: ${variant.name}`);distinct.add(JSON.stringify(a));if(JSON.stringify(moving(a))!==JSON.stringify(moving(actions)))changedMovement=true;}
 assert(distinct.size>=3,'variants are not duplicates');assert(changedMovement,'variants change movement timing, not only idle waits');
 const errors=mistakes.filter(m=>m.level===level);assert(errors.length,'one plausible mistake per room');
 for(const route of R.cases(level).filter(r=>r.id.startsWith('accepted-'))){const replay=A.replay(G,level,items,route.actions);assert(replay.s.won&&!replay.s.deaths);assert.deepEqual(replay.missing,[],'same-element alternatives retain the actual puzzle dependencies');}
 assert.equal(R.cases(level).filter(r=>r.id.startsWith('tolerances.json:')).length,tolerances.length,'whole-map audit includes current timing variants');
 assert.equal(R.cases(level).filter(r=>r.id.startsWith('mistakes.json:')).length,errors.length,'whole-map audit includes current mistake routes');
 for(const mistake of errors){
  const s=G.create(level);let held=A.idle,death=null;
  for(const raw of A.expand(mistake)){
   const before=T.clone(s),a=A.input(raw,held);G.step(s,a);held=a;
   if(s.deaths){
    const p=s.player,q=before.player;
    const hazard=G.levels[level].spikes.find(h=>{if(!G.activeInPhase(h,s.phase))return false;const b=G.spikeBox(h);return Math.min(q.x,p.x)<b.x+b.w&&Math.max(q.x,p.x)+p.w>b.x&&Math.min(q.y,p.y)<b.y+b.h&&Math.max(q.y,p.y)+p.h>b.y;});
    death={hazard,offscreen:p.y>G.H};break;
   }
   if(s.won)break;
  }
  assert(death?.hazard&&!death.offscreen,`room ${level+1} ${mistake.name} dies on an active spike, not a fall`);
 }
 const original=G.levels[level],inventory=R.inspect(G,level,items);
 assert.strictEqual(G.levels[level],original,'whole-map ablation restores the exact room');assert.equal(inventory.parts.length,original.blocks.length+original.spikes.length);
 assert(inventory.parts.some(p=>p.kind==='spikes'&&Object.values(p.observed).some(labels=>labels.some(label=>label.startsWith('death-overlap:')))),`room ${level+1} inventory ties an actual mistake death to its spike group`);
}
const benchmark=plan.benchmarkLevel,route=routes.find(r=>r.level===benchmark),s=G.create(benchmark),launches=[];let held=A.idle;
for(const raw of A.expand(route)){const a=A.input(raw,held);G.step(s,a);held=a;if(s.auditJump)launches.push({...s.auditJump,nextPhase:s.phase});if(s.won||s.deaths)break;}
assert(s.won&&!s.deaths);assert.equal(launches.length,5,'three-wall benchmark retains five successful jumps');
assert.deepEqual(launches.map(j=>j.nextPhase),[1,2,0,1,2]);assert(launches.slice(1).every(j=>j.wall),'last four jumps actually borrow walls');
assert(launches.slice(2).every((j,i)=>j.wall===-launches[i+1].wall),'relay alternates wall faces');
for(const skip of require('./known-skips.json')){
 const original=G.levels[skip.level],actions=A.expand(skip);let old;
 try{G.levels[skip.level]=G.compileRoom(skip.oldRoom);old=A.replay(G,skip.level,[],actions);}
 finally{G.levels[skip.level]=original;}
 assert(old.s.won&&!old.s.deaths,`recorded shortcut really clears its old draft: ${skip.name}`);
 assert(!A.replay(G,skip.level,[],actions).s.won,`repaired campaign stops the exact shortcut: ${skip.name}`);
 assert(R.cases(skip.level).some(r=>r.id==='known-skips.json:'+skip.name),'whole-map ablations include known bypasses');
}
console.log(`PASS current campaign: eight safe spawns and full clears, ${variants.length} complete timing/rest variants, ${mistakes.length} active-spike mistakes, broad interaction contracts and three-wall five-jump benchmark. Local tolerance is not human difficulty testing.`);
