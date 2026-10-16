const {G,idle,ticks}=require('./controller.cjs'),assert=require('node:assert/strict');
const masks={R:1,B:2,G:4,Y:5,M:3,C:6,W:7,'#':7};
function room(){return {name:'surface fixture',phase:0,facing:1,spawn:[3,20],goal:[36,20],goalPhase:0,terrain:Array.from({length:23},(_,y)=>y===20?'W'.repeat(40):'.'.repeat(40))};}
function add(r){const index=G.levels.length;G.levels.push(G.compileRoom(r));G.palettes.push(G.colors);return G.create(index);}
for(const [tile,mask] of Object.entries(masks)){
 const r=room();r.terrain[10]='.'.repeat(10)+tile.repeat(3)+'.'.repeat(27);const s=add(r),b=G.levels[s.level].blocks.find(b=>b.tile===tile&&b.y===80);
 assert(b);assert.equal(b.phaseMask,mask);assert.equal(b.w,24);
 for(let phase=0;phase<3;phase++){s.phase=phase;assert.equal(G.activeInPhase(b,phase),!!(mask&(1<<phase)));assert.equal(G.solid(s).includes(b),!!(mask&(1<<phase)));}
 if('YMC'.includes(tile))assert.equal(b.phase,3,'mixed surfaces never masquerade as permanent terrain');
}
for(const phase of [-1,0,1,2])for(let current=0;current<3;current++)assert.equal(G.activeInPhase({phase},current),phase<0||phase===current,'old independent movement fixtures retain their phase contract');
let r=room();r.terrain[10]='.'.repeat(10)+'M'+'.'.repeat(29);let s=add(r),index=G.levels[s.level].blocks.findIndex(b=>b.tile==='M');
Object.assign(s.player,{x:80,y:78,grounded:false,coyote:.1});ticks(s,1,{...idle,jump:true,jumpHeld:true});
assert.equal(s.phase,1);assert(!s.blocked.has(index),'red-to-blue never defers a continuously active purple block');assert(G.solid(s).includes(G.levels[s.level].blocks[index]));
r=room();r.phase=1;r.terrain[10]='.'.repeat(10)+'Y'+'.'.repeat(29);s=add(r);index=G.levels[s.level].blocks.findIndex(b=>b.tile==='Y');
Object.assign(s.player,{x:80,y:78,grounded:false,coyote:.1});ticks(s,1,{...idle,jump:true,jumpHeld:true});
assert.equal(s.phase,2);assert(s.blocked.has(index),'blue-to-green newly materialized yellow block is deferred while overlapping');assert(!G.solid(s).includes(G.levels[s.level].blocks[index]));
Object.assign(s.player,{x:16,y:100,vx:0,vy:0});ticks(s,1);assert(!s.blocked.has(index));assert(G.solid(s).includes(G.levels[s.level].blocks[index]),'yellow becomes solid after leaving it');
for(const value of [null,{},['short'],Array(23).fill(null)]){r=room();r.terrain=value;assert.throws(()=>G.compileRoom(r),/Invalid tile room/);}
r=room();r.terrain[0]='?'+'.'.repeat(39);assert.throws(()=>G.compileRoom(r),/Invalid tile room/);
console.log('PASS: 7 phase masks and neutral alias, all 3 phase truth tables, mixed collision/materialization continuity, legacy reference fixtures and tile validation.');
