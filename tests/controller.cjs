const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),context={};
vm.createContext(context);vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1]+'\nglobalThis.Game=Game;',context);
const G=context.Game,levelCount=G.levels.length,idle={x:0,y:0,jump:false,dash:false,jumpHeld:false,grab:false};
function ticks(s,n,input=idle){for(let i=0;i<n;i++)G.step(s,{...input,jump:!i&&input.jump,dash:!i&&input.dash});}
function near(actual,expected,message){assert(Math.abs(actual-expected)<1e-6,`${message}: ${actual} vs ${expected}`);}
function arena(){
 const level=G.levels.length;
 G.levels.push({phase:0,spawn:[67,139],facing:1,goal:[-1000,-1000],goalPhase:0,blocks:[0,1,2].flatMap(phase=>[{x:0,y:150,w:320,h:8,phase},{x:200,y:33,w:8,h:117,phase}])});
 G.palettes.push(G.colors);return G.create(level);
}
let s=arena();ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.phase,1);assert.equal(s.jumps,1);
ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.phase,1,'failed aerial jump cannot change phase');
ticks(s,20,{...idle,y:-1,dash:true,jumpHeld:true});assert.equal(s.phase,1,'dash keeps the jump color');assert.equal(s.dashes,1);
ticks(s,1,{...idle,dash:true});assert.equal(s.dashes,1,'no second aerial dash');
for(const phase of [0,1,2]){
 s=arena();s.phase=phase;Object.assign(s.player,{x:267,y:33,grounded:false,coyote:.1});ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.phase,(phase+1)%3);
 s=arena();s.phase=phase;Object.assign(s.player,{x:267,y:33,grounded:false,coyote:0});ticks(s,12,{...idle,x:1,dash:true});assert.equal(s.phase,phase);
}
s=arena();ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});near(s.player.vx,170/3,'run acceleration precedes jump boost');near(s.player.vy,-105,'takeoff velocity');near(s.player.varTime,.2,'takeoff gets full variable-jump duration');
const tall=arena(),short=arena();ticks(tall,1,{...idle,jump:true,jumpHeld:true});ticks(short,1,{...idle,jump:true,jumpHeld:true});ticks(tall,18,{...idle,jumpHeld:true});ticks(short,18);assert(tall.player.y<short.player.y-8,'held jump is higher');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0,dash:0});ticks(s,1,{...idle,x:1,grab:true});assert(s.player.climbing);ticks(s,6,{...idle,x:1,grab:true});const before=s.player.stamina;ticks(s,60,{...idle,x:1,grab:true});near(before-s.player.stamina,10,'idle climb drains 10 stamina per second');
s=arena();Object.assign(s.player,{x:192,y:50,grounded:false,coyote:0});ticks(s,20,{...idle,x:1,y:1,grab:true});near(s.player.vy,80,'climb-down speed');
s=arena();Object.assign(s.player,{x:192,y:83,vy:160,grounded:false,coyote:0});ticks(s,1,{...idle,x:1,grab:true});near(s.player.vy,32,'first grab preserves 20 percent vertical speed before climb update');
s=arena();Object.assign(s.player,{x:192,y:77,vy:-105,grounded:false,coyote:0});ticks(s,1,{...idle,x:1,grab:true});assert(!s.player.climbing&&s.player.vy<0,'grab does not cancel upward jump');
s=arena();Object.assign(s.player,{x:190,y:83,grounded:false,coyote:0});ticks(s,1,{...idle,x:1,grab:true});assert(!s.player.climbing,'wall-jump reach is not grab reach');ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});assert.equal(s.jumps,1);near(s.player.vx,-130,'wall jump pushes away');assert.equal(s.phase,1);ticks(s,8,{...idle,x:1,jumpHeld:true});assert(s.player.x<183,'forced push survives holding toward wall');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0,dash:0});ticks(s,1,{...idle,x:1,grab:true,jump:true,jumpHeld:true});assert.equal(s.jumps,0,'new grab enters climb before processing jump');ticks(s,1,{...idle,x:1,grab:true,jumpHeld:true});assert.equal(s.jumps,1);assert.equal(s.player.dash,0,'wall jump never refills dash');near(s.player.stamina,82.5,'climb jump costs 27.5');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0,dash:0,stamina:0});ticks(s,1,{...idle,x:1,grab:true,jump:true,jumpHeld:true});near(s.player.vx,-130,'exhausted grab cannot climb-jump');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0});ticks(s,1,{...idle,grab:true});ticks(s,1,{...idle,grab:true,jump:true,jumpHeld:true});ticks(s,1,{...idle,x:-1,jumpHeld:true});near(s.player.vx,-130+G.P.reduce*G.P.air*G.DT,'late away input converts climb jump to wall boost');near(s.player.stamina,110,'wall boost refunds climb jump');
s=arena();Object.assign(s.player,{x:192,y:56,grounded:false,coyote:0,dash:0});let hopped=false;for(let i=0;i<140&&!s.player.grounded;i++){const waiting=s.player.hopX;G.step(s,{...idle,x:1,y:-1,grab:true});if(waiting&&!s.player.hopX&&s.player.vx>0){near(s.player.vx,100-G.P.accel*G.P.air*G.DT,'ledge hop speed before normal friction');hopped=true;}}assert(hopped,'ledge hop clears the lip');assert(s.player.grounded&&s.player.y===22,'climb reaches top');assert.equal(s.player.dash,1,'standing on top refills dash');
s=arena();Object.assign(s.player,{x:183,y:67,grounded:false,coyote:0});ticks(s,1,{...idle,x:1,y:-1,dash:true});assert.equal(s.player.vx,0,'dash waits during freeze');ticks(s,8,{...idle,x:1,y:-1});assert(s.player.dashTime>0);assert(s.player.vx===0&&s.player.vy<0,'diagonal wall collision keeps vertical dash');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0});ticks(s,7,{...idle,y:-1,dash:true});ticks(s,1,{...idle,y:-1,jump:true,jumpHeld:true});near(s.player.vx,-170,'up dash wall bounce horizontal speed');near(s.player.vy,-160,'up dash wall bounce vertical speed');near(s.player.varTime,.25,'wall bounce variable jump');assert.equal(s.jumps,1,'wall bounce switches color once');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0});ticks(s,7,{...idle,y:-1,dash:true});ticks(s,1,{...idle,y:-1,grab:true,jump:true,jumpHeld:true});near(s.player.vx,-170,'holding grab cannot turn a dash wall bounce into climb jump');near(s.player.vy,-160,'grab wall bounce vertical speed');near(s.player.stamina,110,'dash wall bounce costs no climb stamina');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0});ticks(s,2,{...idle,grab:true});s.player.retention=.06;s.player.retained=240;ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.player.retention,0,'leaving climb clears old wall impact momentum');near(s.player.vx,0,'release plus jump from climb still jumps vertically');near(s.player.stamina,82.5,'release plus climb jump consumes stamina');
s=arena();Object.assign(s.player,{x:192,y:83,grounded:false,coyote:0});ticks(s,2,{...idle,grab:true});ticks(s,1,{...idle,grab:true,jump:true,jumpHeld:true,dash:true});assert(s.jumps===1&&s.dashes===0&&s.phase===1&&s.player.dash===1,'climb jump takes priority over same-frame dash');
s=arena();ticks(s,8,{...idle,x:1,dash:true});assert.equal(s.player.dash,0,'ground does not refill dash before cooldown');ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});near(s.player.vx,260,'horizontal dash jump keeps super-jump momentum');assert.equal(s.jumps,1);
s=arena();Object.assign(s.player,{x:67,y:83,vy:160,grounded:false,coyote:0});ticks(s,1,{...idle,y:1});near(s.player.maxFall,165,'fast-fall limit ramps instead of snapping');
s=arena();ticks(s,1,{...idle,y:1});assert(s.player.ducking&&s.player.h===6);near(s.player.y+s.player.h,150,'crouch keeps feet planted');ticks(s,1);assert(!s.player.ducking&&s.player.h===11);
s=arena();ticks(s,7,{...idle,x:1,y:1,dash:true});assert(s.player.ducking&&s.player.dy===0&&s.player.dx===1,'down diagonal becomes ground dash slide');near(s.player.vx,240/Math.sqrt(2)*1.2,'dash slide horizontal speed');ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});near(s.player.vx,325,'crouched dash jump horizontal speed');near(s.player.vy,-52.5,'crouched dash jump vertical speed');assert(!s.player.ducking&&s.player.h===11);
s=arena();Object.assign(s.player,{x:67,y:67,vx:300,grounded:false,coyote:0});ticks(s,7,{...idle,x:1,dash:true});near(s.player.vx,300,'dash preserves faster incoming horizontal momentum');
s=arena();ticks(s,1,{...idle,x:1,dash:true});ticks(s,4,{...idle,y:-1});assert(s.player.dx===0&&s.player.dy===-1,'dash aim samples after freeze');
s=arena();const materialized={x:67,y:64,w:8,h:40,phase:1};G.levels[s.level].blocks.push(materialized);const materializedIndex=G.levels[s.level].blocks.length-1;Object.assign(s.player,{x:67,y:67,coyote:.1,grounded:false});ticks(s,1,{...idle,jump:true,jumpHeld:true});assert(s.blocked.has(materializedIndex),'overlapping materialized wall is deferred');assert(s.player.y<67,'materialization does not trap takeoff');ticks(s,30,{...idle,x:-1,jumpHeld:true});assert(!s.blocked.has(materializedIndex),'wall becomes solid once player exits');
for(const direction of [-1,1]){
 s=arena();G.levels[s.level].blocks.push(...[0,1,2].map(phase=>({x:75,y:120,w:30,h:8,phase})));Object.assign(s.player,{x:70,y:128,vx:20*direction,vy:-60,grounded:false,coyote:0});ticks(s,1,{...idle,x:direction});assert(direction<0?s.player.vy<0:s.player.vy===0,'ceiling correction respects travel direction');
}
s=arena();Object.assign(s.player,{y:67,vy:0,grounded:false,coyote:0,autoJump:true});ticks(s,1);near(s.player.vy,7.5,'post-dash apex uses half gravity without held jump');
s=arena();Object.assign(s.player,{y:137,vy:54,coyote:0,grounded:false});ticks(s,1,{...idle,jump:true,jumpHeld:true});ticks(s,12,{...idle,jumpHeld:true});assert(s.jumps===1&&s.phase===1&&s.player.vy<0,'buffer fires once on actual landing');
s=arena();s.player.y=200;ticks(s,1);assert.equal(s.deaths,1);ticks(s,20);assert.equal(s.phase,0);assert.equal(s.player.dash,1);
// The arena exists only for isolated controller checks; routes use the real rooms.
G.levels.length=levelCount;G.palettes.length=levelCount;
console.log('PASS: jump-only cycle; failed inputs; Celeste takeoff order, variable height, grab/slide reach, stamina, climb/down/hop/boost, forced wall jump, diagonal dash collision, wall bounce, super/hyper jump, crouch/slide, corner correction, safe materialization, delayed aim and momentum, refill delay, fast fall, buffer and respawn.');
module.exports={G,idle,ticks};
