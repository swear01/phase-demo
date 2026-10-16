// Replay helpers for the saved campaign routes.
function clone(s){
 return {...s,player:{...s.player},mover:s.mover&&{...s.mover},blocked:new Set(s.blocked),particles:[],trails:[],events:[]};
}
function frames(action,count){return Array.from({length:count},(_,i)=>({...action,jump:!i&&action.jump,dash:!i&&action.dash}));}
// Names a terrain block by color letter and tile rectangle, e.g. B13:0-19 or R2-8:20.
function blockName(G,level,b){
 if(!b)return '?';if(b===undefined||b.nodes)return 'mover';
 const c=b.tile||(b.phase<0?'#':'RBG'[b.phase]),x0=b.x/8,x1=(b.x+b.w)/8-1,y0=b.y/8,y1=(b.y+b.h)/8-1;
 return c+(x0===x1?x0:x0+'-'+x1)+':'+(y0===y1?y0:y0+'-'+y1);
}
function under(G,s){const p=s.player;return G.solid(s).find(b=>p.x+p.w>b.x&&p.x<b.x+b.w&&p.y+p.h===b.y);}
function side(G,s,dir){const p=s.player;return G.solid(s).find(b=>p.y+p.h>b.y&&p.y<b.y+b.h&&(dir>0?Math.abs(b.x-(p.x+p.w))<P_REACH:Math.abs(p.x-(b.x+b.w))<P_REACH));}
const P_REACH=5;
// Replays actions from spawn and reports contacts: jumps, dashes, landings and grabs.
// `contacts` lists the surfaces that launched each jump or caught each landing/grab.
function trace(G,level,actions){
 const s=G.create(level),events=[],contacts=[];let prev=clone(s);
 actions.forEach((a,i)=>{
  const q=prev.player,before=prev;G.step(s,a);const p=s.player;
  if(s.jumps>prev.jumps){
   const floor=q.grounded||q.coyote>0&&!q.wall?under(G,before):null,wall=floor?null:side(G,before,q.wall||q.facing);
   const name=floor?'floor '+blockName(G,level,floor):'wall'+(q.wall>0||(!q.wall&&q.facing>0)?'>':'<')+' '+blockName(G,level,wall);
   events.push(`f${i} jump ${name} @(${q.x},${q.y+q.h}) -> ${'RBG'[s.phase]}`);contacts.push('J:'+name);
  }
  if(s.dashes>prev.dashes){events.push(`f${i} dash (${a.x},${a.y}) @(${q.x},${q.y+q.h}) ${'RBG'[s.phase]}`);contacts.push('D');}
  if(p.grounded&&!q.grounded){const b=under(G,s),name=b===s.mover?'mover':blockName(G,level,b);events.push(`f${i} land ${name} @(${p.x},${p.y+p.h}) ${'RBG'[s.phase]}`);contacts.push('L:'+name);}
  if(p.climbing&&!q.climbing){const name=blockName(G,level,side(G,s,p.facing));events.push(`f${i} grab ${p.facing>0?'>':'<'} ${name} @(${p.x},${p.y+p.h}) ${'RBG'[s.phase]}`);contacts.push('C:'+name);}
  if(s.deaths>prev.deaths)events.push(`f${i} DEATH`);
  if(s.won&&!prev.won)events.push(`f${i} WIN ${'RBG'[s.phase]}`);
  prev=clone(s);
 });
 return {s,events,contacts};
}
module.exports={clone,frames,trace};
