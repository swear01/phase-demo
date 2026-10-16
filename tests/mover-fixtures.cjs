// The campaign has no moving platforms; mover physics checks use the two former mover rooms
// (four-stop loop and fast-out/slow-return) as fixed fixtures appended after the real rooms.
const fixtures=require('./mover-fixtures.json');
module.exports=G=>{
 const base=G.levels.length;
 for(const room of fixtures){G.levels.push(G.compileRoom(room));G.palettes.push(G.colors);}
 return {loop:base,ret:base+1,rooms:fixtures};
};
