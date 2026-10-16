// Whole-map inventory, single-part ablations, and a separate search for each declared interaction.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),A=require('./audit-mechanisms.cjs'),T=require('../tests/route-tools.cjs');
const root=path.resolve(__dirname,'..');
function cases(level){
 const reference=require('../tests/route.json').find(r=>r.level===level),out=[{id:'reference',actions:A.expand(reference)}];
 for(const file of ['tolerances.json','mistakes.json','known-skips.json'])for(const route of require('../tests/'+file))if(route.level===level)out.push({id:file+':'+route.name,actions:A.expand(route)});
 const folder=path.join(root,'tests/witnesses');
 for(const file of (fs.existsSync(folder)?fs.readdirSync(folder):[]).filter(f=>f.endsWith('.json'))){const raw=JSON.parse(fs.readFileSync(path.join(folder,file))),route=raw.route||raw;if(route.level===level)out.push({id:file,actions:A.expand(route)});}
 return out;
}
function parts(G,level){const l=G.levels[level];return [...l.blocks.map((b,index)=>({id:'terrain-'+index,kind:'terrain',index,color:b.tile,rect:[b.x,b.y,b.w,b.h].map(n=>n/8),phaseMask:b.phaseMask})),...(l.spikes||[]).map((b,index)=>({id:'spikes-'+index,kind:'spikes',index,color:b.color,dir:b.dir,rect:[b.x,b.y,b.w,b.h].map(n=>n/8),phaseMask:b.phaseMask}))];}
function inspect(G,level,items,routes=cases(level)){
 const original=G.levels[level],inventory=parts(G,level),marks=inventory.map(()=>new Map()),baseline=routes.map(route=>({id:route.id,...A.replay(G,level,items,route.actions)}));let routeId;
 const add=(n,label)=>{if(!marks[n].has(routeId))marks[n].set(routeId,new Set());marks[n].get(routeId).add(label);};
 function record(s,before=s){
  const p=s.player;
  for(let n=0;n<inventory.length;n++){
   const part=inventory[n],b=part.kind==='terrain'?original.blocks[part.index]:original.spikes[part.index],phase='RBG'[s.phase],mark=label=>add(n,label+':'+phase);
   if(!G.activeInPhase(b,s.phase)){if(G.overlap(p,b))mark('inactive-overlap');continue;}
   if(part.kind==='spikes'){if(G.overlap(p,G.spikeBox(b)))mark((s.deaths>before.deaths?'death':'active')+'-overlap');continue;}
   if(s.blocked.has(part.index)){mark('deferred-materialization');continue;}
   if(p.grounded&&p.y+p.h===b.y&&p.x+p.w>b.x&&p.x<b.x+b.w)mark('floor');
   if(p.y+p.h>b.y&&p.y<b.y+b.h){if(p.wall===1&&b.x-p.x-p.w>=0&&b.x-p.x-p.w<G.P.wallCheck)mark('left-face');if(p.wall===-1&&p.x-b.x-b.w>=0&&p.x-b.x-b.w<G.P.wallCheck)mark('right-face');}
   if(before.player.vy<0&&p.vy===0&&p.y===b.y+b.h&&p.x+p.w>b.x&&p.x<b.x+b.w)mark('ceiling');
  }
  if(s.auditJump?.wall)for(let n=0;n<inventory.length;n++){const part=inventory[n];if(part.kind==='terrain'&&(part.phaseMask&(1<<s.auditJump.phase))&&A.hit({kind:'wall',rect:part.rect,phaseMask:part.phaseMask},before,s))add(n,'jump-launch:'+ 'RBG'[s.auditJump.phase]);}
 }
 for(const route of routes){routeId=route.id;const s=G.create(level);let held=A.idle;record(s);for(const raw of route.actions){const before=T.clone(s),input=A.input(raw,held);G.step(s,input);held=input;record(s,before);if(s.won||s.deaths||s.respawn)break;}}
 try{
  for(let n=0;n<inventory.length;n++){
   const part=inventory[n];part.observed=Object.fromEntries([...marks[n]].map(([id,labels])=>[id,[...labels].sort()]));
   G.levels[level]={...original,[part.kind==='terrain'?'blocks':'spikes']:(part.kind==='terrain'?original.blocks:original.spikes).filter((_,i)=>i!==part.index)};
   const start=G.create(level),p=start.player;
   if(!G.solid(start).some(b=>p.y+p.h===b.y&&p.x+p.w>b.x&&p.x<b.x+b.w)){
    part.referenceWithout={status:'not run: removal invalidates spawn support'};part.unlocks=[];part.survivingVariants=[];continue;
   }
   const changed=routes.map(route=>({id:route.id,...A.replay(G,level,items,route.actions)}));
   const brief=r=>({won:r.s.won,deaths:r.s.deaths,missing:r.missing});part.referenceWithout=brief(changed[0]);
   part.unlocks=changed.filter((r,i)=>r.s.won&&!r.s.deaths&&(!baseline[i].s.won||baseline[i].s.deaths)).map(r=>({route:r.id,...brief(r)}));
   part.survivingVariants=changed.filter((r,i)=>i>0&&baseline[i].s.won&&!baseline[i].s.deaths&&r.s.won&&!r.s.deaths).map(r=>r.id);
  }
 }finally{G.levels[level]=original;}
 return {level,name:original.name,parts:inventory,routes:baseline.map(r=>({id:r.id,won:r.s.won,deaths:r.s.deaths,missing:r.missing}))};
}
async function main(){
 const flags={};for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i]?.slice(2),value=process.argv[i+1];if(!process.argv[i]?.startsWith('--')||!['level','seconds','states','frames','step','width','out'].includes(key)||value===undefined)throw Error('Expected --level/seconds/states/frames/step/width/out value');flags[key]=value;}
 const opt={seconds:8,states:180000,frames:1200,step:6,width:48};for(const key of Object.keys(opt))if(flags[key]!==undefined){const v=Number(flags[key]);if(!Number.isFinite(v)||v<(key==='seconds'?0:1)||key!=='seconds'&&!Number.isInteger(v))throw Error('Invalid --'+key);opt[key]=v;}
 if(opt.frames>3600||opt.step>120)throw Error('Maximum frames 3600; maximum step 120');
 const G=A.loadGame(),contracts=require('../tests/mechanisms.json'),selected=flags.level?contracts.rooms.filter(r=>r.level===Number(flags.level)-1):contracts.rooms;if(!selected.length)throw Error('Unknown level');
 const out=path.resolve(flags.out||path.join(root,'scratch/full-room-audit'));fs.mkdirSync(out,{recursive:true});
 const report={sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),budget:opt,limits:'Contacts and single-part route ablations do not prove necessity or irrelevance; searches are bounded.',rooms:[]};
 for(const room of selected){
  A.validate(room.mechanisms);const routes=cases(room.level),result=inspect(G,room.level,room.mechanisms,routes);result.searches=[];
  report.rooms.push(result);fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
  if(opt.seconds)for(const item of room.mechanisms){
   const found=await A.search(G,room.level,room.mechanisms,{...opt,avoid:item.id,seeds:routes.map(r=>r.actions)}),{route,...entry}=found;entry.target=item.id;
   if(route){entry.witness=`room-${room.level+1}-${encodeURIComponent(item.id)}.json`;fs.writeFileSync(path.join(out,entry.witness),JSON.stringify(found,null,2)+'\n');}
   result.searches.push(entry);fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({room:room.level+1,target:item.id,status:entry.status,states:entry.states,branchDepthFrames:entry.branchDepthFrames,witness:entry.witness}));
   if(entry.status==='incomplete')throw Error('Search interrupted; partial report retained');
  }
  console.log(JSON.stringify({room:room.level+1,parts:result.parts.length,searches:result.searches.length}));
 }
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={cases,parts,inspect};
