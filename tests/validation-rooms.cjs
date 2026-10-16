// Historical campaign rooms 3-8 (index 2-7): the saved real-spawn routes use the intended surfaces in order,
// plus a few mistaken-plan probes. Bounded checks, not proofs of uniqueness.
const baseline=require('./legacy/campaign.cjs'),G=baseline.loadGame(),{idle,routes}=baseline,assert=require('node:assert/strict'),T=require('./route-tools.cjs');
function replay(level){
 const route=routes.find(r=>r.level===level),acts=route.ticks===1?route.actions:route.actions.flatMap(a=>T.frames(a,route.ticks));
 const s=G.create(level),frames=[];
 for(const a of acts){const before=T.clone(s);G.step(s,a);frames.push({before,s:T.clone(s)});if(s.won)break;}
 assert(s.won&&!s.deaths,`room ${level+1} clears from its real spawn`);
 return {s,frames,t:T.trace(G,level,acts)};
}
const jumpSurfaces=t=>t.contacts.filter(c=>c.startsWith('J:')).map(c=>c.replace(/^J:(floor|wall[<>]) /,''));
function inOrder(list,wanted,message){let i=0;for(const x of list)if(x===wanted[i])i++;assert.equal(i,wanted.length,`${message}: ${list.join(' / ')}`);}
const inside=(p,col)=>p.x+p.w>col*8&&p.x<col*8+8;

// Room 3 「門」: the green exit sits behind a green wall, so it must be crossed in blue.
let r=replay(2);
inOrder(jumpSurfaces(r.t),['R1-7:19-20','B10:9-17','G13-18:15','R22:0-12','B32:0-7'],'door order');
assert.deepEqual([r.s.jumps%3,r.s.phase],[2,2]);
assert(r.frames.some(({s})=>inside(s.player,27)&&s.player.y<104&&s.phase===1),'crosses the green gate in blue');
assert(!r.frames.some(({s})=>inside(s.player,27)&&s.player.y<104&&s.phase===2),'never overlaps the gate while green');
const red=r.frames.findIndex(({before,s})=>s.jumps>before.jumps&&before.phase===0&&before.player.x<176);
assert(red>0&&r.frames.slice(red).some(({s})=>s.phase===1&&s.player.x>=176),'turns back through the red wall it just left');
assert(r.frames.some(({before,s})=>s.player.grounded&&!before.player.grounded&&s.phase===2&&s.player.y+s.player.h===120),'refills on the green step');

// Room 4 「回程」: out low in red without jumping, back high over the same span.
r=replay(3);
inOrder(jumpSurfaces(r.t),['R23-32:17-18','B35:6-15','G21-27:9','R8:0-4'],'return order');
const outbound=r.frames.find(({before,s})=>s.player.grounded&&!before.player.grounded&&s.player.y+s.player.h===136);
assert(outbound&&outbound.s.jumps===0&&outbound.s.phase===0,'reaches the far red floor with zero jumps');
assert(r.frames.some(({before,s})=>s.player.grounded&&!before.player.grounded&&s.phase===2&&s.player.y+s.player.h===72),'refills on the green floor on the way back');
assert(r.s.dashes>=2,'needs dashes on both legs');
// Mistaken plan: jump at the start and dash straight up toward the exit above.
let highest=Infinity;
for(let delay=0;delay<20;delay++)for(const x of [-1,0,1]){
 const s=G.create(3);G.step(s,{...idle,jump:true,jumpHeld:true});
 for(let i=0;i<delay;i++)G.step(s,{...idle,x,jumpHeld:true});
 G.step(s,{...idle,x,y:-1,dash:true});
 for(let i=0;i<40;i++){G.step(s,{...idle,x,y:-1});highest=Math.min(highest,s.player.y+s.player.h);}
 assert(!s.won);
}
assert(highest>40,'jump plus dash from the start stays below the exit floor');
// Room 5 「夾層」: pass the blue slab upward in red, stand on it in blue, drop through it in green.
const slabTop=96,slabBottom=104;
r=replay(4);
inOrder(jumpSurfaces(r.t),['R7:0-11','B0-39:12','G28:0-11','R23:3-10','B0-39:12'],'slab order');
const above=r.frames.findIndex(({s})=>s.player.y+s.player.h<=slabTop);
assert(above>0&&r.frames[above].s.phase===0&&r.frames[above].s.jumps===0,'first rises above the slab in red without jumping');
const slabLandings=r.frames.filter(({before,s})=>s.player.grounded&&!before.player.grounded&&s.player.y+s.player.h===slabTop).map(({s})=>[s.phase,s.player.x]);
assert(slabLandings.every(([phase])=>phase===1)&&slabLandings.some(([,x])=>x<152)&&slabLandings.some(([,x])=>x>=232),'lands on the slab only in blue, before the blue gate and past the green wall');
assert(r.frames.some(({s})=>s.phase===2&&s.player.y>=slabBottom&&s.player.x>=232),'drops through the slab in green beside the exit');
// Mistaken plan: jump from the red floor (optionally up-dash): turning blue under the slab never gets above it.
for(let delay=0;delay<16;delay+=3)for(const x of [-1,0,1]){
 const s=G.create(4);for(let i=0;i<8;i++)G.step(s,{...idle,x:1});G.step(s,{...idle,x,jump:true,jumpHeld:true});
 for(let i=0;i<70&&!s.respawn;i++){G.step(s,{...idle,x,y:-1,jumpHeld:true,dash:i===delay,grab:true});assert(s.player.y>=slabBottom||s.respawn,'blue cannot pass the slab from below');}
}

// Room 6 「雙門」: out in red through ghost doors and below the red post, back in blue; the red-to-blue jump must happen between the doors.
const greenDoor=9*8,blueDoor=19*8;
r=replay(5);
inOrder(jumpSurfaces(r.t),['R1-29:21','B31:9-20','G21-24:11','R15:0-10'],'two-door order');
const crossings=r.frames.filter(({before,s})=>(before.player.x+4-greenDoor-4)*(s.player.x+4-greenDoor-4)<=0&&before.player.x!==s.player.x).map(({s})=>s.phase);
assert(crossings.length>=2&&crossings[0]===0&&crossings.at(-1)===1,'green door: out in red, back in blue');
const lastJump=r.frames.filter(({before,s})=>s.jumps>before.jumps).at(-1);
assert(lastJump.s.phase===1&&lastJump.before.player.x>greenDoor&&lastJump.before.player.x+8<blueDoor,'turns blue between the doors');
assert(r.frames.some(({before,s})=>s.player.grounded&&!before.player.grounded&&s.phase===2&&s.player.y+s.player.h===88),'refills on the green ledge');
// Mistaken plans: blue from the floor (jump + up-dash) cannot reach the exit ledge; blue on the far blue wall cannot pass the blue door.
for(let walk=0;walk<60;walk+=4)for(const x of [-1,0,1]){
 const s=G.create(5);for(let i=0;i<walk;i++)G.step(s,{...idle,x:1});G.step(s,{...idle,x,jump:true,jumpHeld:true});
 for(let i=0;i<60&&!s.respawn;i++){G.step(s,{...idle,x,y:-1,jumpHeld:true,dash:i===10,grab:i>20});assert(!s.won&&s.player.y>72,'jump + up-dash from the floor stays below the exit ledge');}
}
{const s=G.create(5);for(let i=0;i<130;i++)G.step(s,{...idle,x:1});for(let i=0;i<20;i++)G.step(s,idle);G.step(s,{...idle,x:1,jump:true,jumpHeld:true});
 for(let i=0;i<170;i++)G.step(s,{...idle,x:i<122?1:0,y:i<29?0:-1,grab:i>=19&&i<122,jumpHeld:i<19});for(let i=0;i<20;i++)G.step(s,idle);
 assert(s.phase===1&&s.player.grounded&&s.player.y+s.player.h===72,'stands on the far blue wall in blue');
 for(let i=0;i<60&&!s.respawn;i++){G.step(s,{...idle,x:-1,y:i<10?-1:0,dash:i===0});assert(s.player.x>=blueDoor,'blue cannot cross the blue door');}}
// Room 7 「回升」: preserve red while descending/climbing; cross the red gate in green, then turn red on its right.
r=replay(6);
inOrder(jumpSurfaces(r.t),['R20-29:9','B30:0-9','G35-39:6'],'ascent order');
for(const feet of [160,72])assert(r.frames.some(({s})=>s.player.grounded&&s.player.y+s.player.h===feet&&s.phase===0&&s.jumps===0),'reaches red floor and middle ledge without jumping');
assert(r.frames.some(({s})=>inside(s.player,32)&&s.phase===2),'crosses the red gate in green');
const finalJump=r.frames.filter(({before,s})=>s.jumps>before.jumps).at(-1);
assert(finalJump.before.player.x>=272&&finalJump.s.phase===0,'turns red on the right side, after resting on green');
// Walking right in red meets the red spikes guarding the gate.
const middle=r.frames.findIndex(({s})=>s.player.grounded&&s.player.y+s.player.h===72&&s.phase===0);
let probe=G.create(6);for(const a of routes[6].actions.slice(0,middle+1))G.step(probe,a);
for(let i=0;i<180;i++)G.step(probe,{...idle,x:1});
assert(!probe.won&&probe.deaths>0,'red spikes stop a direct walk or climb into the red gate');
// Walking off the right-side green ledge preserves green, so the red exit cannot catch the player.
const rest=r.frames.findIndex(({s})=>s.player.grounded&&s.phase===2&&s.player.y+s.player.h===48&&s.player.x>=272);
probe=G.create(6);for(const a of routes[6].actions.slice(0,rest+1))G.step(probe,a);
for(let i=0;i<16;i++)G.step(probe,{...idle,x:-1});for(let i=0;i<140;i++)G.step(probe,idle);
assert(!probe.won&&probe.deaths>0,'leaving the green ledge without jumping misses the red exit');
// Room 8 「轉色台」 uses both phases of the same yellow platform before returning to the blue wall's other face.
r=replay(7);
inOrder(jumpSurfaces(r.t),['R1-7:20','B12:5-22','Y15-22:12','Y15-22:12'],'two-phase yellow order');
for(const phase of [2,0])assert(r.frames.some(({before,s})=>s.player.grounded&&!before.player.grounded&&s.phase===phase&&s.player.y+s.player.h===96),'yellow catches both green and red');
const eighth=G.levels[7];
for(const tile of ['R','G']){
 const changed={...G.tileMap.rooms[7],terrain:G.tileMap.rooms[7].terrain.map(row=>row.replaceAll('Y',tile))};G.levels[7]=G.compileRoom(changed);
 const s=G.create(7);for(const a of routes[7].actions)G.step(s,a);assert(!s.won&&s.deaths,'saved route really needs both yellow phases, not just a decorative mixed tile');
}
G.levels[7]=eighth;
console.log('PASS historical campaign: rooms 3-8 use intended surfaces, phase and gate directions; mistaken plans fail; the mixed-color route uses both yellow phases.');
