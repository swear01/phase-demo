// Historical campaign bypass regressions and independent search self-checks.
const assert=require('node:assert/strict'),A=require('../scripts/audit-mechanisms.cjs'),baseline=require('./legacy/campaign.cjs'),{contracts,routes}=baseline;
async function main(){
 const G=baseline.loadGame();
 for(const room of contracts.rooms){const r=A.replay(G,room.level,room.mechanisms,A.expand(routes.find(x=>x.level===room.level)));assert(r.s.won&&!r.s.deaths,`room ${room.level+1} reference clears`);assert.deepEqual(r.missing,[],`room ${room.level+1} contract describes dependencies, not exact keys`);}
 for(const [level,file] of [[0,'room-1-direct-return.json'],[5,'room-6-wall-jump.json']]){
  const r=A.replay(G,level,contracts.rooms[level].mechanisms,A.expand(require('./legacy/witnesses/'+file)));
  assert(r.s.won&&!r.s.deaths&&r.missing.length===0,'legitimate direct return or wall-jump variant remains accepted');
 }
 // The known old shortcut must genuinely clear with hazards removed, and fail against the repaired room.
 const witness=require('./legacy/witnesses/room-7-red-pillar.json'),room=G.levels[6],items=contracts.rooms[6].mechanisms;
 const old=G.compileRoom({...G.tileMap.rooms[6],spikes:[]});G.levels[6]=old;
 let check=A.replay(G,6,items,A.expand(witness));
 assert(check.s.won&&!check.s.deaths&&check.missing.includes('red-return-climb')&&check.missing.includes('red-middle-rest'),'old route really skipped the left-side dependencies');
 G.levels[6]=room;check=A.replay(G,6,items,A.expand(witness));assert(!check.s.won&&check.s.deaths,'phase spikes stop the reproduced shortcut');
 for(const file of ['room-7-blue-start.json','room-7-reverse-pillar.json']){
  const route=require('./legacy/witnesses/'+file);G.levels[6]=G.compileRoom({...G.tileMap.rooms[6],spikes:route.candidateSpikes});
  check=A.replay(G,6,items,A.expand(route));assert(check.s.won&&!check.s.deaths,'intermediate patch really admitted '+file);
  G.levels[6]=room;check=A.replay(G,6,items,A.expand(route));assert(!check.s.won&&check.s.deaths,'final hazards stop '+file);
 }
 check=A.replay(G,6,items,A.expand(require('./legacy/witnesses/room-7-optional-floor.json')));
 assert(check.s.won&&!check.s.deaths&&check.missing.length===0,'a valid no-floor-landing variant remains playable');
 const last=G.levels[7],overWall=require('./legacy/witnesses/room-8-over-wall.json'),lastItems=contracts.rooms[7].mechanisms;
 G.levels[7]=G.compileRoom({...G.tileMap.rooms[7],spikes:overWall.candidateSpikes});
 check=A.replay(G,7,lastItems,A.expand(overWall));assert(check.s.won&&!check.s.deaths&&check.missing.includes('blue-right-face'),'new-room draft had a real over-wall shortcut');
 G.levels[7]=last;check=A.replay(G,7,lastItems,A.expand(overWall));assert(!check.s.won&&check.s.deaths,'blue ceiling stops the over-wall shortcut');
 const level=G.levels.length;G.levels.push({name:'audit self-check',phase:0,spawn:[8,133],facing:1,goal:[200,128],goalPhase:0,blocks:[{x:0,y:144,w:320,h:8,phase:-1}]});G.palettes.push(G.colors);
 const optional=[{id:'unused-decoration',kind:'visit',rect:[0,0,1,1],phaseMask:7}],mandatory=[{id:'only-floor',kind:'contact',rect:[0,18,40,1],phaseMask:7}],seed=Array.from({length:160},()=>({...A.idle,x:1}));
 const found=await A.search(G,level,optional,{seeds:[seed],seconds:2,states:10000,frames:240});assert.equal(found.status,'found');assert.deepEqual(found.missing,['unused-decoration']);assert(A.replay(G,level,optional,found.route.actions).s.won);
 const notFound=await A.search(G,level,mandatory,{seeds:[seed],seconds:2,states:10000,frames:240});assert.equal(notFound.status,'no witness within budget');
 const branch=await A.search(G,level,[{id:'middle',kind:'visit',rect:[12,16,1,2],phaseMask:7}],{seeds:[seed],seconds:2,states:5000,frames:80,step:6,width:20});
 assert(branch.prefixStarts>0,'beam samples reachable route prefixes before interactions');assert.equal(branch.method,'reachable-prefix beam');assert(branch.depthFrames<=80&&branch.branchDepthFrames<=80,'frame limit includes the replayed prefix');
 const middle=[{id:'middle',kind:'visit',rect:[12,16,1,2],phaseMask:7}],bypass=await A.search(G,level,middle,{seeds:[seed],seconds:10,states:10000,frames:240,step:6,width:20});
 assert.equal(bypass.status,'found');assert.equal(bypass.method,'reachable-prefix beam');assert(bypass.prefixStarts>0);
 const full=A.replay(G,level,middle,bypass.route.actions);assert(full.s.won&&!full.s.deaths&&full.missing.includes('middle'),'found prefix branch includes the complete legal spawn-to-exit path');
 const s=G.create(level);assert.notEqual(A.stateKey(s,0,A.idle),A.stateKey(s,1,A.idle),'visited includes completed mechanisms');
 const held=A.input({x:1,y:0,jumpHeld:true},A.idle);assert(held.jump);assert(!A.input({x:1,y:0,jumpHeld:true},held).jump,'holding jump does not invent another key edge');assert(A.input({x:1,y:0,jumpHeld:true,jump:true},held).jump,'explicit browser release/repress is retained');
 const q={player:{x:0,y:0,w:8,h:11},jumps:0,phase:0};for(const phase of [0,1,2])assert.equal(A.hit({kind:'visit',rect:[0,0,2,2],phaseMask:5},q,{...q,phase}),phase!==1,'combined masks match R and G');
 console.log('PASS historical campaign: all intended routes satisfy broad mechanism contracts; optional fixture yields replayable skip, sole-floor fixture does not; masks, input edges and mechanism-aware visited checked. Finite search is not a necessity proof.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
