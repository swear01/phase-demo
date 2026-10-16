// Historical full-map ablations and repaired/accepted bypass regressions.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),A=require('../scripts/audit-mechanisms.cjs'),R=require('../scripts/audit-rooms.cjs'),baseline=require('./legacy/campaign.cjs'),{contracts}=baseline;
const G=baseline.loadGame(),plain={};vm.createContext(plain);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1]+'\nglobalThis.Game=Game;',plain);baseline.apply(plain.Game);
for(const room of contracts.rooms){
 const original=G.levels[room.level],legacyCases=baseline.cases(room.level),report=R.inspect(G,room.level,room.mechanisms,legacyCases);
 assert.strictEqual(G.levels[room.level],original,'ablation restores the exact room');assert.equal(report.parts.length,original.blocks.length+original.spikes.length,'inventory includes every terrain block and spike group');
 assert(report.routes[0].won&&!report.routes[0].deaths,'baseline reference still clears');
 assert(report.parts.some(p=>p.referenceWithout.status==='not run: removal invalidates spawn support'),'removing the spawn floor cannot yield a fake grounded-start ablation');
 const a=G.create(room.level),b=plain.Game.create(room.level);let held=A.idle;
 for(const raw of legacyCases[0].actions){const input=A.input(raw,held);held=input;G.step(a,input);plain.Game.step(b,input);assert.equal(JSON.stringify(a.player),JSON.stringify(b.player),'observation does not alter movement');for(const key of ['phase','jumps','dashes','deaths','won','freeze','respawn'])assert.equal(a[key],b[key]);assert.equal(JSON.stringify([...a.blocked]),JSON.stringify([...b.blocked]));if(a.won||a.deaths)break;}
 if(room.level===7)assert(report.parts.find(p=>p.id==='spikes-1').unlocks.some(r=>r.route==='room-8-over-wall.json'),'removing the ceiling actually reopens the saved bypass');
}
const s=G.create(1);Object.assign(s,{phase:1});Object.assign(s.player,{x:116,y:50,grounded:false,coyote:0,dashTime:.1,dashAttack:.2,dx:0,dy:-1,dash:0});
const before={...s,player:{...s.player}};G.step(s,{...A.idle,jump:true,jumpHeld:true});assert.equal(s.jumps,1);assert.equal(s.auditJump.reach,5);assert.equal(s.phase,2);
const wall={kind:'wall',rect:[16,0,1,23],phaseMask:2,side:-1};assert(A.hit(wall,before,s),'the blue launch is counted even after becoming green');assert(!A.hit({...wall,side:1},before,s),'opposite face is not borrowed');assert(!A.hit({...wall,rect:[21,0,1,20]},before,s),'nearby unrelated wall is not counted');
console.log('PASS historical campaign: all terrain and spike groups inventoried; ablations restore rooms and expose a known bypass; audit launch observation matches unmodified movement and counts 5 px wall bounces.');
function beforeRepair(level){
 const room=structuredClone(baseline.maps.rooms[level]),edit=(row,col,c)=>{room.terrain[row]=room.terrain[row].slice(0,col)+c+room.terrain[row].slice(col+1);};
 if(level===2)for(let y=0;y<3;y++)edit(y,22,'.');
 if(level===3){for(let x=0;x<5;x++){edit(3,x,'.');edit(5,x,'B');}room.goal=[2,5];}
 if(level===5)room.spikes=[];
 if(level===7)for(let x=8;x<=9;x++)edit(20,x,'R');
 return G.compileRoom(room);
}
for(const [level,file,skipped] of [[2,'room-3-green-platform-skip','green-relay'],[3,'room-4-direct-exit','red-return-wall'],[5,'room-6-near-gate','far-blue-wall'],[5,'room-6-gate-back','far-blue-wall'],[7,'room-8-super-skip','yellow-green-support']]){
 const current=G.levels[level],route=A.expand(require('./legacy/witnesses/'+file+'.json')),items=contracts.rooms[level].mechanisms;
 try{G.levels[level]=beforeRepair(level);const old=A.replay(G,level,items,route);assert(old.s.won&&!old.s.deaths&&old.missing.includes(skipped),'recorded full-puzzle skip really clears before repair: '+file);}
 finally{G.levels[level]=current;}
 assert(!A.replay(G,level,items,route).s.won,'same full-puzzle skip is stopped after repair: '+file);
}
for(const [level,file,optional,borrow] of [[2,'room-3-green-side','green-refill',{rect:[13,15,6,1],phaseMask:4}],[6,'room-7-middle-side','red-middle-rest',{rect:[20,9,1,11],phaseMask:1}],[6,'room-7-green-side','green-right-rest',{rect:[35,6,5,1],phaseMask:4}],[7,'room-8-yellow-green-side','yellow-green-support',{rect:[15,12,8,1],phaseMask:4}],[7,'room-8-yellow-red-side','yellow-red-support',{rect:[15,12,8,1],phaseMask:1}]]){
 const route=A.expand(require('./legacy/witnesses/'+file+'.json')),r=A.replay(G,level,contracts.rooms[level].mechanisms,route);
 assert(r.s.won&&!r.s.deaths&&r.missing.includes(optional),'valid alternative may omit the exact landing: '+file);
 assert.equal(A.replay(G,level,[{id:'actual-borrow',kind:'contact',...borrow}],route).missing.length,0,'the same puzzle element is still actually borrowed: '+file);
}
// Enumerate real-spawn departure timing; no teleporting into the wall or refilling a dash.
function blueOverlapStarts(){let overlap=0;const block=G.levels[7].blocks.find(b=>b.tile==='B'&&b.x===96&&b.y===40);
 for(let walk=0;walk<=50;walk++)for(let dash=0;dash<=30;dash++){
  const s=G.create(7);let held=A.idle;const tick=raw=>{const input=A.input(raw,held);G.step(s,input);held=input;};
  for(let i=0;i<walk;i++)tick({...A.idle,x:1});
  for(let i=0;i<dash;i++)tick({...A.idle,x:1,dash:i===0,dashHeld:true});
  tick({...A.idle,x:1,jump:true,jumpHeld:true});
  if(s.auditJump&&s.auditJump.phase===0&&G.overlap(s.auditJump,block))overlap++;
 }return overlap;
}
const eighth=G.levels[7];G.levels[7]=beforeRepair(7);assert(blueOverlapStarts()>0,'old start permits a coyote jump inside the blue column');G.levels[7]=eighth;assert.equal(blueOverlapStarts(),0,'shorter red ledge prevents column-overlap activation in all 1,581 departure timings');
for(const [file,optional] of [['room-5-left-side','blue-left-rest'],['room-5-right-materialization','blue-right-rest']]){
 const route=A.expand(require('./legacy/witnesses/'+file+'.json')),r=A.replay(G,4,contracts.rooms[4].mechanisms,route);
 assert(r.s.won&&!r.s.deaths&&r.missing.includes(optional),'alternative preserves the puzzle while omitting the preferred landing: '+file);
 for(const borrow of [{rect:[28,0,1,23],phaseMask:4},{rect:[23,3,1,8],phaseMask:1}])assert.equal(A.replay(G,4,[{id:'actual-borrow',kind:'contact',...borrow}],route).missing.length,0,'green wall and red pillar remain involved');
}
const upper=A.replay(G,7,contracts.rooms[7].mechanisms,A.expand(require('./legacy/witnesses/room-8-upper-return.json')));
assert(upper.s.won&&!upper.s.deaths&&upper.missing.includes('blue-right-face')&&!upper.missing.includes('blue-return-borrow'),'returning via the connected blue cap counts as the same right-side wall, while the lower-column omission stays visible');
console.log('PASS historical campaign: five complete core skips clear their old maps and fail the repairs; eight same-element alternatives remain; all 1,581 tested dash/coyote departure timings avoid blue-column materialization.');
