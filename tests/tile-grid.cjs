const {G,idle,ticks}=require('./controller.cjs'),assert=require('node:assert/strict'),source=require('../levels.json'),routes=require('./route.json');
assert.equal(G.TILE,8);assert.equal(G.W,320);assert.equal(G.H,180);assert.equal(G.levels.length,source.rooms.length);
assert.deepEqual(JSON.parse(JSON.stringify(G.tileMap)),source,'standalone game embeds current editable map');
const phases={R:0,B:1,G:2,Y:3,M:3,C:3,W:-1,'#':-1};
for(let i=0;i<source.rooms.length;i++){
 const room=source.rooms[i],level=G.levels[i],s=G.create(i);
 for(const b of level.blocks)for(const key of ['x','y','w','h'])assert.equal(b[key]%8,0,`${room.name} ${key} on tile grid`);
 for(let y=0;y<source.rows;y++)for(let x=0;x<source.columns;x++){
  const hits=level.blocks.filter(b=>x*8>=b.x&&x*8<b.x+b.w&&y*8>=b.y&&y*8<b.y+b.h);
  assert.equal(hits.length,room.terrain[y][x]==='.'?0:1,'compiled rectangles exactly cover tile data');
  if(hits.length){const tile=room.terrain[y][x];assert.equal(hits[0].phase,phases[tile]);assert.equal(hits[0].tile,tile);assert.equal(hits[0].phaseMask,G.phaseMasks[tile]);}
 }
 assert.equal(s.player.x,room.spawn[0]*8);assert.equal(s.player.y+s.player.h,room.spawn[1]*8);
 ticks(s,1);assert(s.player.grounded&&s.phase===room.phase&&!s.won,'spawn stands on its starting color');
 assert(level.blocks.some(b=>level.goal[0]>=b.x&&level.goal[0]<b.x+b.w&&b.y===level.goal[1]+16&&G.activeInPhase(b,room.goalPhase)),'exit feet align with destination platform');
 s.player.y=200;ticks(s,20);assert.equal(s.level,i);assert.equal(s.phase,room.phase);assert.equal(s.deaths,1);assert.equal(s.player.dash,1);
}
const bad=structuredClone(source.rooms[0]);bad.terrain[0]='?'+bad.terrain[0].slice(1);assert.throws(()=>G.compileRoom(bad),/Invalid tile room/);bad.terrain[0]='.';assert.throws(()=>G.compileRoom(bad),/Invalid tile room/);
const M=require('./mover-fixtures.cjs')(G);
const invalidMover=structuredClone(M.rooms[0]);invalidMover.mover.nodes[0]=[39,22];assert.throws(()=>G.compileRoom(invalidMover),/Invalid tile mover/);
let s=G.create(M.ret);for(const phase of [0,1,2]){s.phase=phase;assert.equal(G.solid(s).filter(b=>b.phase<0).length,3,'gray terrain stays solid in every color');}
s=G.create(M.loop);Object.assign(s.player,{x:s.mover.x+8,y:s.mover.y-11,grounded:true});ticks(s,20);
for(const index of [2,3,0,1]){
 ticks(s,1,{...idle,y:1,dash:true});const count=s.dashes,pending=s.mover.pending;ticks(s,1,{...idle,y:1,dash:true});assert.equal(s.dashes,count);assert.equal(s.mover.pending,pending,'failed dash queues no node');ticks(s,6,{...idle,y:1});ticks(s,18);
 assert.equal(s.mover.index,index);assert.equal(s.mover.x,s.mover.nodes[index][0]);assert.equal(s.mover.y,s.mover.nodes[index][1]);assert.equal(s.player.y+s.player.h,s.mover.y,'rider follows both axes');assert.equal(s.player.x-s.mover.x,8);assert.equal(s.phase,0);
}
s=G.create(M.ret);const home=s.mover.nodes[0][0],far=s.mover.nodes[1][0];Object.assign(s.player,{x:home+16,y:s.mover.y-11,grounded:true});ticks(s,20);
ticks(s,1,{...idle,y:1,dash:true});ticks(s,6,{...idle,y:1});ticks(s,10);assert.equal(s.mover.x,far);assert.equal(s.player.x,far+16,'fast trip carries rider');ticks(s,30);assert(s.mover.index===0&&s.mover.x>home&&s.mover.x<far,'automatic slow return');
const before=s.mover.x;ticks(s,1,{...idle,y:1,dash:true});assert.equal(s.mover.index,1);assert.equal(s.mover.fromX,s.mover.x);assert(Math.abs(s.mover.x-before)<=2,'retrigger starts at current position');assert.equal(s.mover.pending,0);ticks(s,6,{...idle,y:1});ticks(s,114);assert.equal(s.mover.x,home);assert.equal(s.deaths,0);
s=G.create(M.ret);Object.assign(s.player,{x:home-8,y:s.mover.y+14,facing:1,grounded:false,coyote:0});ticks(s,1,{...idle,grab:true});assert(s.player.climbing);Object.assign(s.mover,{index:1,fromX:home,fromY:s.mover.y,duration:.2,moving:true,elapsed:0});ticks(s,8,{...idle,grab:true});assert.equal(s.player.x+s.player.w,s.mover.x,'grabbed side carries player');const relative=s.player.x-s.mover.x;ticks(s,1);assert(s.player.x-s.mover.x<relative,'release detaches');
assert.equal(routes.length,source.rooms.length);assert.deepEqual(routes.map(r=>r.level),source.rooms.map((_,i)=>i));
for(const route of routes){let previous={};for(const action of route.actions){assert(!action.jumpHeld||previous.jumpHeld||action.jump,'route represents actual keyboard press edges');assert(!action.dashHeld||previous.dashHeld||action.dash,'route represents actual dash press edges');previous=action;}const replay=G.create(route.level);for(const action of route.actions)ticks(replay,route.ticks,action);assert(replay.won&&!replay.deaths,`room ${route.level+1} clears from its real spawn`);}
console.log(`PASS: 8 px tile geometry, exact tile coverage, editable data and embed, map validation, aligned spawn/exit, checkpoints, neutral terrain on mover fixtures, mover cycle/return/retrigger/carry, ${routes.length} real-spawn campaign routes.`);
