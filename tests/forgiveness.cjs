const {G,idle,ticks}=require('./controller.cjs'),assert=require('node:assert/strict');
function room(width=320){
 const level=G.levels.length;G.levels.push({phase:0,spawn:[28,139],facing:1,goal:[-1000,-1000],goalPhase:0,blocks:[0,1,2].map(phase=>({x:0,y:150,w:width,h:8,phase}))});G.palettes.push(G.colors);return G.create(level);
}
for(let delay=0;delay<8;delay++){
 const s=room(36);s.player.vx=90;
 for(let i=0;i<40&&s.player.grounded;i++)G.step(s,{...idle,x:1});
 assert(!s.player.grounded&&s.player.coyote>0,'walk naturally past the platform edge');
 ticks(s,delay,{...idle,x:1});ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});
 assert.equal(s.jumps,delay<5?1:0,`coyote input at airborne frame ${delay+1}`);
 if(s.jumps){assert.equal(s.phase,1);ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.jumps,1,'coyote is consumed once');}
}
for(const held of [true,false]){
 const s=room();Object.assign(s.player,{y:136,vy:53.333333333333,grounded:false,coyote:0});ticks(s,1,{...idle,jump:true,jumpHeld:true});ticks(s,5,{...idle,jumpHeld:held});assert.equal(s.jumps,held?1:0,'release cancels buffered jump');
 const d=room();Object.assign(d.player,{y:136,vy:53.333333333333,grounded:false,coyote:0,dash:0});ticks(d,1,{...idle,x:1,dash:true,dashHeld:true});ticks(d,5,{...idle,x:1,dashHeld:held});assert.equal(d.dashes,held?1:0,'held dash buffers through landing and cancels on release');assert.equal(d.phase,0,'buffered dash keeps color');
}
let s=room();G.levels[s.level].blocks.push(...[0,1,2].map(phase=>({x:0,y:133,w:100,h:8,phase})));Object.assign(s.player,{h:6,y:144,ducking:true});ticks(s,1,{...idle,jump:true,jumpHeld:true});assert(s.jumps===1&&s.player.h===6&&s.player.vy<0,'normal crouch jump fits under low ceiling');
for(const x of [192,188]){
 s=room();G.levels[s.level].blocks.push(...[0,1,2].map(phase=>({x:200,y:0,w:8,h:180,phase})));Object.assign(s.player,{x,y:83,vy:-120,grounded:false,coyote:0,dx:0,dy:-1,dashTime:0,dashAttack:.1});ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.player.vy,-160,'up-dash wall bounce survives after dash movement ends');assert.equal(s.player.vx,-170,'wide wall-bounce window');
}
s=room();G.levels[s.level].blocks.push(...[0,1,2].map(phase=>({x:200,y:0,w:8,h:180,phase})));Object.assign(s.player,{x:187,y:83,grounded:false,coyote:0,dy:-1,dashAttack:.1});ticks(s,1,{...idle,jump:true,jumpHeld:true});assert.equal(s.jumps,0,'wall-bounce probe needs overlap, not just edge contact');
for(const up of [false,true]){
 s=room();G.levels[s.level].blocks.push(...[0,1,2].map(phase=>({x:200,y:0,w:8,h:180,phase})));Object.assign(s.player,{x:188,y:83,grounded:false,coyote:0,dy:-1});const aim={...idle,x:up?0:-1,y:up?-1:0};ticks(s,1,{...aim,dash:true,dashHeld:true});assert.equal(s.player.dy,0,'new dash clears old aim');while(s.freeze>1e-9)ticks(s,1,aim);ticks(s,1,{...aim,jump:true,jumpHeld:true});assert.equal(s.jumps,0,'dash callback runs before aim is published');ticks(s,1,{...aim,jumpHeld:true});assert.equal(s.jumps,up?1:0,'next dash callback uses the published aim');
}
s=room();ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});for(let i=0;i<30;i++){ticks(s,1,{...idle,x:1,jumpHeld:true});assert(Number.isInteger(s.player.x)&&Number.isInteger(s.player.y),'movement stays on source pixel grid');}
s=room();G.levels[s.level].blocks.push(...[0,1,2].map(phase=>({x:200,y:0,w:8,h:180,phase})));Object.assign(s.player,{x:192,vx:90});ticks(s,1,{...idle,x:1});assert.equal(s.player.remX,0,'wall impact clears horizontal remainder');ticks(s,1,{...idle,x:-1});assert.equal(s.player.x,192,'wall reversal receives no residual pixel');
s=room();Object.assign(s.player,{y:136,vy:53.333333333333,grounded:false,coyote:0});ticks(s,6);assert.equal(s.player.remY,0,'landing impact clears vertical remainder');
console.log('PASS: natural ledge departure, all coyote boundary frames and consumption, held/released jump and dash buffers, low-ceiling crouch jump, delayed/wide wall bounce, pixel grid.');
