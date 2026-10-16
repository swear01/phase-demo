const {G,idle,ticks}=require('./controller.cjs'),assert=require('node:assert/strict'),M=require('./mover-fixtures.cjs')(G);
function board(level,node=0){const s=G.create(level),m=s.mover;Object.assign(m,{index:node,x:m.nodes[node][0],y:m.nodes[node][1],moving:false,pending:0,hold:.2});Object.assign(s.player,{x:m.x+16,y:m.y-11,vx:0,vy:0,grounded:true,coyote:.1});return s;}
function dash(s,x,y=0){ticks(s,1,{...idle,x,y,dash:true,dashHeld:true});}
for(const [level,node,direction] of [[M.loop,0,1],[M.loop,2,-1],[M.ret,0,1]]){
 const s=board(level,node),offset=s.player.x-s.mover.x;dash(s,direction);
 for(let i=0;i<14;i++){ticks(s,1,{...idle,x:direction});assert.equal(s.player.x-s.mover.x,offset,`mover ${level===M.loop?'loop':'return'}, same-direction dash stays at its boarding offset, frame ${i}`);assert.equal(s.player.y+s.player.h,s.mover.y);}
 assert.equal(s.dashes,1);assert.equal(s.phase,0);assert.equal(s.deaths,0);
}
let s=board(M.loop,0),offset=s.player.x-s.mover.x;dash(s,-1);ticks(s,8,{...idle,x:-1});assert(s.player.x-s.mover.x<offset,'opposite-direction dash moves relative to platform');
s=board(M.loop,0);offset=s.player.x-s.mover.x;dash(s,1,-1);ticks(s,8,{...idle,x:1,y:-1});assert(s.player.y+s.player.h<s.mover.y,'up diagonal launches off platform');assert.notEqual(s.player.x-s.mover.x,offset,'up diagonal is not carried as a horizontal dash');
s=board(M.loop,0);offset=s.player.x-s.mover.x;dash(s,1);ticks(s,6,{...idle,x:1});ticks(s,1,{...idle,x:1,jump:true,jumpHeld:true});assert.equal(s.jumps,1);assert.equal(s.phase,1);assert(s.player.y+s.player.h<s.mover.y,'jump cancels carried dash and leaves platform');assert(s.player.x-s.mover.x>offset,'jump keeps its own horizontal movement');
s=board(M.loop,0);dash(s,1);while(s.player.dashTime>0)ticks(s,1,{...idle,x:1});offset=s.player.x-s.mover.x;ticks(s,4,{...idle,x:1});assert(s.player.x-s.mover.x>offset,'normal movement resumes when dash ends');
s=board(M.ret,0);s.player.y-=30;s.player.grounded=false;s.player.coyote=0;offset=s.player.x-s.mover.x;dash(s,1);ticks(s,8,{...idle,x:1});assert.notEqual(s.player.x-s.mover.x,offset,'airborne dash is independent of platform');
s=board(M.ret,1);offset=s.player.x-s.mover.x;dash(s,1);ticks(s,8,{...idle,x:1});assert(s.player.x-s.mover.x>offset,'stationary platform does not pin horizontal dash');
s=board(M.loop,1);offset=s.player.x-s.mover.x;dash(s,1);ticks(s,8,{...idle,x:1});assert(s.player.x-s.mover.x>offset,'vertical platform does not pin horizontal dash');
s=board(M.ret,0);s.mover.x=s.mover.nodes[1][0]-8;s.player.x=s.mover.x+16;offset=16;dash(s,1);for(let i=0;i<14;i++){ticks(s,1,{...idle,x:1});assert.equal(s.player.x-s.mover.x,offset,'arrival during dash does not resume relative drift');}assert.equal(s.mover.moving,false);
s=board(M.loop,0);dash(s,1);ticks(s,6,{...idle,x:1});Object.assign(s.mover,{fromX:s.mover.x,fromY:s.mover.y,index:0,elapsed:0,duration:.3,moving:true});offset=s.player.x-s.mover.x;ticks(s,1,{...idle,x:1});assert(s.player.x-s.mover.x>offset,'reversal ends same-direction carry');
console.log('PASS: left/right dash keeps boarding offset on same-direction movers; opposite/diagonal/airborne dash, jump cancellation, phase and normal movement after dash.');
