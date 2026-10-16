const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),file=path.join(root,'index.html'),html=fs.readFileSync(file,'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'levels.json'),'utf8'));
if(data.tileSize!==8||data.columns!==40||data.rows!==23)throw Error('Expected 8 px tiles in a 40 by 23 map');
const next=html.replace(/\/\* LEVEL_DATA \*\/[\s\S]*?\/\* END_LEVEL_DATA \*\//,()=> '/* LEVEL_DATA */'+JSON.stringify(data).replace(/</g,'\\u003c')+'/* END_LEVEL_DATA */');
if(next===html&&!html.includes('/* LEVEL_DATA */'))throw Error('Missing level data marker');
vm.runInNewContext(next.match(/<script id="engine">([\s\S]*?)<\/script>/)[1]);
if(process.argv.includes('--check')){if(next!==html)throw Error('Run node scripts/embed-levels.cjs to update index.html');}
else fs.writeFileSync(file,next);
