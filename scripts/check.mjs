import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build,root} from './build.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
export function checkOptions(args){
 for(const a of args)if(a.startsWith('--')&&!['--full','--force','--tests'].includes(a))throw Error('Unknown option: '+a);
 return {full:args.includes('--full'),force:args.includes('--force'),files:args.filter(a=>!a.startsWith('--'))};
}
export async function checkSignature(files,{cwd=root,full=false,revision=''}={}){
 const seen=new Map();
 async function visit(file){
  file=path.relative(cwd,path.resolve(cwd,file)).replaceAll('\\','/');if(seen.has(file))return;
  if(file.startsWith('../')||path.isAbsolute(file))throw Error('Check input outside project');
  const text=await fs.readFile(path.join(cwd,file),'utf8');seen.set(file,text);
  for(const m of text.matchAll(/(?:^|[;\n])\s*(?:import\s+(?:[^;\n]*?\bfrom\s*)?|export\s+[^;\n]*?\bfrom\s*)['"](\.{1,2}\/[^'"]+\.(?:js|mjs))['"]/g))await visit(path.posix.join(path.posix.dirname(file),m[1]));
 }
 for(const file of files)await visit(file);
 // These inputs are also read directly by UI/build tests, outside ESM imports.
 for(const file of ['index.html','style.css','viewport.css','scripts/check.mjs'])await visit(file);
 return digest(JSON.stringify({node:process.version,full,files,revision,exhaustive:full?process.env.ODYSSEY_EXHAUSTIVE||'0':'0'})+[...seen].sort(([a],[b])=>a.localeCompare(b)).map(([p,s])=>p+'\0'+s).join('\0'));
}
export async function runChecks({files=[],full=false,force=false}={}){
 if(full&&files.length)throw Error('Choose --full or explicit test files');
 const selected=full?(await fs.readdir(path.join(root,'test'),{recursive:true})).filter(f=>f.endsWith('.test.js')).map(f=>'test/'+f.replaceAll('\\','/')):[...new Set(['test/smoke.test.js',...files])];
 for(const f of selected)if(!/^test\/(?:[\w.-]+\/)*[\w.-]+\.test\.js$/.test(f))throw Error('Expected test/*.test.js: '+f);
 const release=await build(),signature=await checkSignature(selected,{full,revision:release.revision}),dir=path.join(root,'artifacts/checks');await fs.mkdir(dir,{recursive:true});
 const resultPath=path.join(dir,'latest.json'),old=await fs.readFile(resultPath,'utf8').then(JSON.parse,()=>null);
 if(!force&&old?.signature===signature&&old.exit===0&&await fs.readFile(path.join(root,old.log)).then(b=>digest(b)===old.logHash,()=>false)){
  console.log(`${full?'FULL':'PARTIAL'} checks reused: ${selected.length} files (${signature.slice(0,12)})`);return {...old,reused:true,revision:release.revision,release};
 }
 const started=performance.now(),run=spawnSync(process.execPath,['--test',...selected],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,ODYSSEY_SOAK:full?'1':'0'}}),output=(run.stdout||'')+(run.stderr||'')+(run.error?'\n'+run.error.stack:'');
 const log='artifacts/checks/'+signature.slice(0,16)+'.log';await fs.writeFile(path.join(root,log),output);
 const result={revision:release.revision,scope:full?'full':'partial',files:selected,signature,exit:run.status??1,durationMs:Math.round(performance.now()-started),tests:Number(output.match(/(?:#|ℹ) tests (\d+)/)?.[1]||0),pass:Number(output.match(/(?:#|ℹ) pass (\d+)/)?.[1]||0),skipped:Number(output.match(/(?:#|ℹ) skipped (\d+)/)?.[1]||0),log,logHash:digest(output),reused:false};
 await fs.writeFile(resultPath,JSON.stringify(result,null,2));console.log(`${full?'FULL':'PARTIAL'} checks: exit${result.exit}, ${result.durationMs}ms, ${log}`);console.log(output.split(/\r?\n/).slice(-10).join('\n'));
 if(result.exit!==0)throw Error('Checks failed; see '+log);return {...result,release};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await runChecks(checkOptions(process.argv.slice(2)));
}
