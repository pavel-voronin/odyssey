import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
const r=await build(),files={};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function collect(dir,recursive){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir==='.'?e.name:dir+'/'+e.name;if(e.isDirectory()){if(recursive)await collect(p,true);}else if(!e.name.startsWith('.')&&/\.(?:m?js|json|css|html)$/.test(e.name))files[p]=hash(await fs.readFile(p));}}
await collect('.',false);for(const dir of ['modules','scripts','test'])await collect(dir,true);
await fs.writeFile('artifacts/schema-144/source-freeze.json',JSON.stringify({revision:r.revision,files,publicFiles:r.manifest.files},null,2));
console.log(JSON.stringify({revision:r.revision,sourceFiles:Object.keys(files).length,publicFiles:Object.keys(r.manifest.files).length}));
