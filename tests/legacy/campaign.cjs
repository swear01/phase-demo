// Historical campaign regressions use the current engine with frozen maps and inputs.
const fs=require('node:fs'),path=require('node:path'),A=require('../../scripts/audit-mechanisms.cjs'),baseline=require('./campaign.json');
const routes=baseline.routes.map(route=>({level:route.level,ticks:1,actions:A.expand(route)}));
function apply(G){
 Object.assign(G.tileMap,structuredClone(baseline.maps));
 G.levels.splice(0,G.levels.length,...G.tileMap.rooms.map(G.compileRoom));
 G.palettes.splice(0,G.palettes.length,...G.levels.map(()=>G.colors));return G;
}
function loadGame(){return apply(A.loadGame());}
function cases(level){
 const out=[{id:'reference',actions:routes.find(r=>r.level===level).actions}];
 for(const file of fs.readdirSync(path.join(__dirname,'witnesses')).filter(f=>f.endsWith('.json'))){const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'witnesses',file))),route=raw.route||raw;if(route.level===level)out.push({id:file,actions:A.expand(route)});}
 return out;
}
module.exports={maps:baseline.maps,contracts:baseline.contracts,routes,apply,loadGame,cases,idle:A.idle};
