// Bounded counterexample search against the real engine; no game state is teleported.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),T=require('../tests/route-tools.cjs');
const idle={x:0,y:0,jump:false,dash:false,jumpHeld:false,dashHeld:false,grab:false};
function loadGame(file=path.join(root,'index.html')){
 const c={},source=fs.readFileSync(file,'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)?.[1],marker='s.jumps++;shift(s);';
 if(!source||source.split(marker).length!==2)throw Error('Expected one successful-jump observation point');
 // Observe the actual launch before its phase changes, including the 5 px wall-bounce reach.
 const observed=source.replace(marker,'s.auditJump={phase:s.phase,wall,x:p.x,y:p.y,w:p.w,h:p.h,reach:upDash?P.wallBounceCheck:P.wallCheck};'+marker);
 vm.createContext(c);vm.runInContext(observed+'\nglobalThis.Game=Game;',c);const G=c.Game,step=G.step;
 G.step=(s,...args)=>{delete s.auditJump;return step(s,...args);};return G;
}
function validate(items){
 if(!Array.isArray(items)||!items.length||items.length>30)throw Error('Expected 1-30 mechanisms');
 const ids=new Set();for(const m of items){
  if(typeof m.id!=='string'||!m.id||ids.has(m.id)||!['visit','land','climb','wall','contact','cross','change'].includes(m.kind)||!Array.isArray(m.rect)||m.rect.length!==4||!m.rect.every(Number.isFinite)||m.rect[2]<=0||m.rect[3]<=0||!Number.isInteger(m.phaseMask)||m.phaseMask<1||m.phaseMask>7||m.axis&&!['x','y'].includes(m.axis)||m.direction!==undefined&&![-1,1].includes(m.direction)||m.side!==undefined&&![-1,1].includes(m.side))throw Error('Invalid mechanism '+m.id);
  ids.add(m.id);
 }
}
function phaseMatches(s,m){return !!(m.phaseMask&(1<<s.phase));}
function hit(m,before,s){
 const j=s.auditJump;
 if(j&&['wall','contact'].includes(m.kind)&&phaseMatches({phase:j.phase},m)){
  const [x,y,w,h]=m.rect.map(n=>n*8),distance=j.wall>0?x-j.x-j.w:j.x-x-w;
  if(j.wall&&j.y+j.h>y&&j.y<y+h&&distance>=-.01&&distance<j.reach&&(m.side===undefined||m.side===-j.wall))return true;
 }
 if(!phaseMatches(s,m))return false;
 const p=s.player,q=before.player,[x,y,w,h]=m.rect.map(n=>n*8),overlap=(a,b,c,d)=>a<c+d&&a+b>c;
 if(m.kind==='land')return p.grounded&&!q.grounded&&Math.abs(p.y+p.h-y)<.01&&overlap(p.x,p.w,x,w);
 if(m.kind==='contact'&&p.grounded&&Math.abs(p.y+p.h-y)<.01&&overlap(p.x,p.w,x,w))return true;
 if(['climb','wall','contact'].includes(m.kind)){const reach=m.kind==='climb'?1.01:4.99;return (p.climbing||m.kind!=='climb'&&p.wall)&&overlap(p.y,p.h,y,h)&&((m.side!==1&&Math.abs(p.x+p.w-x)<reach)||(m.side!==-1&&Math.abs(p.x-x-w)<reach));}
 if(m.kind==='cross'){
  const vertical=m.axis==='y',a=vertical?q.y+q.h/2:q.x+q.w/2,b=vertical?p.y+p.h/2:p.x+p.w/2,line=vertical?y+h/2:x+w/2;
  return (m.direction!==-1&&a<=line&&b>line||m.direction!==1&&a>=line&&b<line)&&(vertical?overlap(p.x,p.w,x,w):overlap(p.y,p.h,y,h));
 }
 return (m.kind!=='change'||s.jumps>before.jumps)&&overlap(p.x,p.w,x,w)&&overlap(p.y,p.h,y,h);
}
function observe(items,before,s,bits){for(let i=0;i<items.length;i++)if(!(bits&(1<<i))&&hit(items[i],before,s))bits|=1<<i;return bits;}
// An explicit edge may release/repress a held key between two simulation frames, like browser.cjs.
function input(a,held){const jumpHeld=!!a.jumpHeld,dashHeld=!!a.dashHeld;return {...idle,...a,jumpHeld,dashHeld,jump:!!a.jump||jumpHeld&&!held.jumpHeld,dash:!!a.dash||dashHeld&&!held.dashHeld};}
function expand(route,maxFrames=3600){
 const segments=route.segments||route.actions?.map(input=>({frames:route.ticks||1,input}));
 if(!Array.isArray(segments)||segments.length>10000)throw Error('Invalid route');
 const out=[];for(const segment of segments){if(!Number.isInteger(segment.frames)||segment.frames<1||segment.frames>3600||!segment.input||![-1,0,1].includes(segment.input.x)||![-1,0,1].includes(segment.input.y))throw Error('Invalid route segment');out.push(...T.frames(segment.input,Math.min(segment.frames,maxFrames-out.length)));if(out.length>=maxFrames)break;}return out;
}
function replay(G,level,items,actions){
 const s=G.create(level),events=[],legal=[];let bits=0,held=idle;
 for(const a of actions){const before=T.clone(s),i=input(a,held);G.step(s,i);const next=observe(items,before,s,bits);
  for(let j=0;j<items.length;j++)if((next^bits)&(1<<j))events.push({frame:legal.length,id:items[j].id,phase:s.phase});
  bits=next;held=i;legal.push(i);if(s.won||s.deaths||s.respawn)break;
 }
 return {s,bits,events,actions:legal,missing:items.filter((_,i)=>!(bits&(1<<i))).map(m=>m.id)};
}
function stateKey(s,bits,held){
 const p=s.player,m=s.mover;
 // Quantized positions/timers and beam pruning make this a search, not a proof.
 return [bits,Math.round(p.x/2),Math.round(p.y/2),Math.round(p.vx/20),Math.round(p.vy/20),s.phase,p.dash,p.grounded,p.climbing,p.wall,p.ducking,Math.round(p.stamina/15),...['dashTime','dashCooldown','varTime','coyote','buffer','dashBuffer','wallLock','climbWait','wallBoost','retention','dashRefill'].map(k=>Math.round(p[k]*60)),p.dashPending,p.hopX,Math.round(s.freeze*60),[...s.blocked].join('.'),held.jumpHeld,held.dashHeld,m?`${m.index},${Math.round(m.x/2)},${Math.round(m.y/2)},${m.pending},${Math.round(m.elapsed*60)}`:''].join(',');
}
function macros(){const out=[];
 for(const x of [-1,0,1])for(const jumpHeld of [false,true])out.push({...idle,x,jumpHeld});
 for(const x of [-1,0,1])for(const y of [-1,0,1])for(const jumpHeld of [false,true])out.push({...idle,x,y,grab:true,jumpHeld});
 for(const x of [-1,0,1])for(const y of [-1,0,1])if(x||y)for(const jumpHeld of [false,true])out.push({...idle,x,y,dashHeld:true,jumpHeld});
 return out;
}
function actionsOf(node){const out=[];for(let n=node;n.parent;n=n.parent)out.push(n.chunk);return out.reverse().flat();}
async function search(G,level,items,options={}){
 validate(items);const opt={seconds:15,states:120000,frames:1200,step:6,width:180,...options},started=Date.now(),all=(1<<items.length)-1;
 let count=0,reason='frame budget',cancelled=false,method='seed',depthFrames=0,prefixStarts=0,branchDepthFrames=0;const abort=()=>{cancelled=true;};
 const focused=opt.avoid===undefined?-1:items.findIndex(m=>m.id===opt.avoid);if(opt.avoid!==undefined&&focused<0)throw Error('Unknown mechanism '+opt.avoid);
 process.on('SIGINT',abort);
 const missing=bits=>focused<0?bits!==all:!(bits&(1<<focused));
 const result=(status,extra={})=>({level,name:G.levels[level].name,status,reason,states:count,elapsedMs:Date.now()-started,method,depthFrames,prefixStarts,branchDepthFrames,budget:Object.fromEntries(Object.entries(opt).filter(([k])=>k!=='seeds')),...extra});
 const budget=()=>cancelled?'interrupted':Date.now()-started>=opt.seconds*1000?'time budget':count>=opt.states?'state budget':null;
 const witness=actions=>{const r=replay(G,level,items,actions.slice(0,opt.frames));if(!r.s.won||r.s.deaths||!missing(r.bits))throw Error('Counterexample replay failed');reason='counterexample replayed';return result('found',{missing:r.missing,route:{level,ticks:1,actions:r.actions},events:r.events,jumps:r.s.jumps,dashes:r.s.dashes});};
 try{
  // Try replayable seeds and local action replacements before broader exploration.
  const seeds=opt.seeds||[];
  for(const seed of seeds){if((reason=budget()))return result(cancelled?'incomplete':'no witness within budget');count++;const r=replay(G,level,items,seed.slice(0,opt.frames));if(r.s.won&&!r.s.deaths&&missing(r.bits))return witness(seed);}
  method='route-mutation';let mutations=0;
  mutate:for(const seed of seeds)for(const span of [120,60,30,12])for(let start=0;start<Math.min(seed.length,opt.frames);start+=Math.max(6,span/2))for(const mode of ['cut','walk','no-grab','no-dash']){
   if((reason=budget()))return result(cancelled?'incomplete':'no witness within budget');
   if(mutations++>=128||Date.now()-started>opt.seconds*250)break mutate;
   const trial=mode==='cut'?seed.slice(0,start).concat(seed.slice(start+span)):seed.map((a,i)=>i<start||i>=start+span?a:mode==='walk'?{...idle,x:a.x}:mode==='no-grab'?{...a,grab:false}:{...a,dash:false,dashHeld:false});
   count++;const r=replay(G,level,items,trial.slice(0,opt.frames));if(r.s.won&&!r.s.deaths&&missing(r.bits))return witness(trial);
  }
  method='reachable-prefix beam';
  const actions=macros(),seen=new Map(),goal=G.levels[level].goal,spawn={s:G.create(level),bits:0,held:idle,parent:null,frame:0,startFrame:0};let beam=[spawn];
  // Every branch retains its full real-spawn input prefix, resource state and completed mechanisms.
  for(const seed of seeds){
   const s=G.create(level),prefix=[],sampled=new Set();let bits=0,held=idle;
   const sample=(state,done,keys,frame)=>{if(frame>0&&frame<opt.frames&&!sampled.has(frame)&&missing(done)){sampled.add(frame);prefixStarts++;beam.push({s:T.clone(state),bits:done,held:keys,parent:spawn,chunk:prefix.slice(0,frame),frame,startFrame:frame});}};
   for(const raw of seed.slice(0,opt.frames)){
    if((reason=budget()))return result(cancelled?'incomplete':'no witness within budget');count++;
    const before=T.clone(s),a=input(raw,held),oldBits=bits;G.step(s,a);bits=observe(items,before,s,bits);
    if(s.deaths||s.respawn)break;
    const event=bits!==oldBits||s.jumps!==before.jumps||s.dashes!==before.dashes||s.player.grounded!==before.player.grounded||s.player.climbing!==before.player.climbing;
    if(event)sample(before,oldBits,held,prefix.length);prefix.push(a);held=a;
    if(event||prefix.length%60===0)sample(s,bits,held,prefix.length);
    if(s.won)break;
   }
  }
  if(!prefixStarts)method='beam';
  for(let branch=0;branch<opt.frames&&beam.length;branch+=opt.step){
   const pool=new Map();
   for(const node of beam)for(const action of actions){
    if(node.frame>=opt.frames)continue;
    if((reason=budget()))return result(cancelled?'incomplete':'no witness within budget');count++;
    const s=T.clone(node.s),chunk=[];let bits=node.bits,held=node.held;
    for(let n=0;n<Math.min(opt.step,opt.frames-node.frame)&&!s.won&&!s.respawn&&!s.deaths;n++){
     const before=T.clone(s),a=input(action,held);G.step(s,a);bits=observe(items,before,s,bits);held=a;chunk.push(a);
    }
    const frame=node.frame+chunk.length;depthFrames=Math.max(depthFrames,frame);branchDepthFrames=Math.max(branchDepthFrames,frame-node.startFrame);
    if(s.deaths||s.respawn||!missing(bits))continue;
    const child={s,bits,held,parent:node,chunk,frame,startFrame:node.startFrame};if(s.won)return witness(actionsOf(child));
    const key=stateKey(s,bits,held);if(seen.has(key)&&seen.get(key)<=frame)continue;seen.set(key,frame);
    const p=s.player,score=-Math.hypot(p.x-goal[0],p.y-goal[1])+p.dash*10+p.stamina*.05+(p.grounded?5:0);
    // Preserve color/jump diversity so a nearby wrong-color exit does not dominate.
    const bucket=`${bits}:${s.phase}:${Math.min(s.jumps,9)}`;
    if(!pool.has(bucket))pool.set(bucket,[]);pool.get(bucket).push({...child,score});
   }
   const groups=[...pool.values()];beam=groups.flatMap(group=>group.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.floor(opt.width/Math.max(1,groups.length))))).slice(0,opt.width);
   await new Promise(resolve=>setImmediate(resolve));
  }
  reason=beam.length?'frame budget':'frontier exhausted (quantized beam)';return result('no witness within budget');
 }finally{process.off('SIGINT',abort);}
}
async function main(){
 const args=process.argv.slice(2),flags={};for(let i=0;i<args.length;i++){if(!args[i].startsWith('--')||!args[i+1]||args[i+1].startsWith('--'))throw Error('Expected --option value');flags[args[i].slice(2)]=args[++i];}
 for(const k of Object.keys(flags))if(!['level','seconds','states','frames','step','width','avoid','seed','out','game','contracts'].includes(k))throw Error('Unknown option '+k);
 const G=loadGame(flags.game),contract=JSON.parse(fs.readFileSync(flags.contracts||path.join(root,'tests/mechanisms.json'))),routes=require('../tests/route.json'),selected=flags.level?contract.rooms.filter(r=>r.level===Number(flags.level)-1):contract.rooms;
 if(contract.units!=='tiles')throw Error('Expected tile-coordinate contracts');if(!selected.length)throw Error('Unknown level');
 const out=path.resolve(flags.out||path.join(root,'scratch/mechanism-audit'));fs.mkdirSync(out,{recursive:true});
 const summary=[];
 for(const room of selected){
  const opt={};for(const k of ['seconds','states','frames','step','width'])if(flags[k]!==undefined){opt[k]=Number(flags[k]);if(!Number.isFinite(opt[k])||opt[k]<=0||k!=='seconds'&&!Number.isInteger(opt[k]))throw Error('Invalid --'+k);}
  if((opt.frames||1200)>3600||(opt.step||6)>120)throw Error('Maximum frames 3600; maximum step 120');
  if(flags.avoid)opt.avoid=flags.avoid;
  opt.seeds=[expand(routes.find(r=>r.level===room.level),opt.frames||1200)];if(flags.seed){const seed=JSON.parse(fs.readFileSync(flags.seed));opt.seeds.unshift(expand(seed.route||seed,opt.frames||1200));}
  const r=await search(G,room.level,room.mechanisms,opt),{route,...report}=r;
  if(route){const file=path.join(out,`room-${room.level+1}-witness.json`);fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');report.witness=file;}
  summary.push(report);console.log(JSON.stringify(report));fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 }
}
if(require.main===module)main().catch(error=>{console.error(JSON.stringify({status:'incomplete',error:error.message}));process.exitCode=1;});
module.exports={loadGame,validate,hit,observe,input,replay,search,stateKey,expand,idle};
