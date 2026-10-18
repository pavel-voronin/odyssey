import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {serialize} from '../engine.js';
import {yearFixture} from './year-scenarios.mjs';
const root=path.resolve('.'),temp=path.join(root,'tmp');await mkdir(temp,{recursive:true});
const data=[yearFixture(),yearFixture({periodic:true}),yearFixture({death:true})].map(f=>serialize(f.s));
const server=createServer(async(req,res)=>{try{if(req.url==='/__time'){res.end(String(performance.now()));return;}const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep))throw Error('Outside');res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(await readFile(p));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const controls=process.argv.includes('--controls');
const script=controls?`<script type="module">
try{
 const {restore,serialize}=await import('/engine.js'),{SAVE_KEY,clockRecord}=await import('/save-schema.js'),{createClock}=await import('/clock.js');const data=${JSON.stringify(data)};
 const realNow=()=>{const r=new XMLHttpRequest();r.open('GET','/__time',false);r.send();return Number(r.responseText);};
 const reloaded=sessionStorage.getItem('year-controls-phase')==='reload';let wall=reloaded?114000:100000;Date.now=()=>wall;
 const scheduled=[],pumps=[],nativeTimer=window.setTimeout;window.setTimeout=(fn)=>{if(String(fn).includes('fastLifeFrame'))scheduled.push(fn);else if(fn.name==='pumpTime')pumps.push(fn);return 1;};
 if(!reloaded){localStorage.setItem(SAVE_KEY,data[2]);localStorage.setItem(SAVE_KEY+'-clock',JSON.stringify(clockRecord(restore(data[2]),createClock(wall))));localStorage.setItem(SAVE_KEY+'-onboarding',JSON.stringify({done:true}));}
 const baseline=localStorage.getItem(SAVE_KEY);await import('/app.js');
 const budgetOn=()=>{const native=performance.now.bind(performance);let budget=0;performance.now=()=>native()+(budget+=21);return ()=>performance.now=native;};
 if(!reloaded){
  document.getElementById('menu').click();if(restore(localStorage.getItem(SAVE_KEY)).tick!==0)throw Error('Menu tick');wall=104000;
  const budgetOff=budgetOn();document.getElementById('run-life').click();for(let i=1;i<8;i++){const fn=scheduled.shift();if(!fn)throw Error('Lost frame');fn();}wall=114000;
  document.activeElement.blur();let accepted=0;document.addEventListener('keydown',()=>accepted=realNow(),{capture:true,once:true});const sent=realNow();document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));const confirmed=realNow();budgetOff();
  const raw=localStorage.getItem(SAVE_KEY),after=restore(raw),clock=JSON.parse(localStorage.getItem(SAVE_KEY+'-clock'));if(after.tick!==8||after.hero.alive||clock.anchor!==110000||clock.yearRun.remaining!==19192||clock.yearRun.status!=='cancelled')throw Error('Cancel/old debt lost '+JSON.stringify({tick:after.tick,clock}));
  for(const fn of scheduled.splice(0))fn();if(localStorage.getItem(SAVE_KEY)!==raw)throw Error('Stale callback saved a new state');
  const t=realNow();serialize(after);const serializeUpperMs=realNow()-t;
  const pump=pumps.shift();if(!pump)throw Error('No ordinary pump');pump();const paid=restore(localStorage.getItem(SAVE_KEY));if(paid.tick!==12||paid.lives.length!==1)throw Error('Offline debt not resumed exactly');
  document.getElementById('close-life-summary').click();sessionStorage.setItem('year-controls-metrics',JSON.stringify({acceptUpperMs:accepted-sent,confirmedUpperMs:confirmed-accepted,serializeUpperMs,saveBytes:raw.length}));sessionStorage.setItem('year-controls-prefix',localStorage.getItem(SAVE_KEY));sessionStorage.setItem('year-controls-phase','reload');location.reload();
 }else{
  if(baseline!==sessionStorage.getItem('year-controls-prefix')||localStorage.getItem(SAVE_KEY)!==baseline||restore(baseline).tick!==12||scheduled.length)throw Error('Reload changed/resumed the prefix');
  if(!document.querySelector('.tap-hint').textContent.includes('19 192'))throw Error('Remaining not restored');
  document.getElementById('menu').click();const budgetOff=budgetOn();document.getElementById('run-life').click();document.getElementById('run-life').click();budgetOff();
  const stopped=restore(localStorage.getItem(SAVE_KEY)),progress=JSON.parse(localStorage.getItem(SAVE_KEY+'-clock')).yearRun;if(stopped.tick!==13||progress.startTick!==12||progress.remaining!==19199)throw Error('Double click did not stop a fresh full year');for(const fn of scheduled.splice(0))fn();
  document.getElementById('menu').click();const input=document.getElementById('load-file'),transfer=new DataTransfer();transfer.items.add(new File([data[2]],'prefix.json',{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>nativeTimer(r,100));
  if(restore(localStorage.getItem(SAVE_KEY)).tick!==0)throw Error('Import not applied');document.getElementById('undo-import').click();if(restore(localStorage.getItem(SAVE_KEY)).tick!==13)throw Error('Undo import changed prefix');
  if(JSON.parse(localStorage.getItem(SAVE_KEY+'-clock')).yearRun)throw Error('Imported world retained an executable/old progress');document.getElementById('menu').click();
  const result={...JSON.parse(sessionStorage.getItem('year-controls-metrics')),scope:'PARTIAL desktop Edge; 13 real ticks, cancel/4 old seconds/reload/double click/import/undo; measured intervals include local HTTP',ticks:13,remaining:19199,reloaded:true,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
  const p=document.createElement('pre');p.id='result';p.hidden=true;p.textContent=JSON.stringify(result);document.body.append(p);sessionStorage.removeItem('year-controls-phase');
 }
}catch(e){const p=document.createElement('pre');p.id='result';p.textContent=JSON.stringify({error:e.stack});document.body.append(p);}
</script>`:`<script type="module">
try{
 const {restore,serialize,step}=await import('/engine.js'),{SAVE_KEY}=await import('/save-schema.js');const data=${JSON.stringify(data)},profile=[];const realNow=()=>{const r=new XMLHttpRequest();r.open('GET','/__time',false);r.send();return Number(r.responseText);};
 for(let i=0;i<2;i++){const s=restore(data[i]),t=realNow();step(s);profile.push({tick:s.tick,msUpperBoundIncludingLocalHTTP:realNow()-t});}
 localStorage.setItem(SAVE_KEY,data[2]);localStorage.removeItem(SAVE_KEY+'-clock');localStorage.setItem(SAVE_KEY+'-onboarding',JSON.stringify({done:true}));
 const scheduled=[],setTimer=window.setTimeout;window.setTimeout=(fn)=>{if(String(fn).includes('fastLifeFrame'))scheduled.push(fn);return 1;};
 await import('/app.js');document.getElementById('menu').click();const before=JSON.parse(localStorage.getItem(SAVE_KEY));if(before.tick!==0)throw Error('Menu added a tick');
 const nativeNow=performance.now.bind(performance);let budget=0;performance.now=()=>nativeNow()+(budget+=21);
 document.getElementById('run-life').click();for(let i=1;i<8;i++){const fn=scheduled.shift();if(!fn)throw Error('Death stopped the interval');fn();}
 document.getElementById('run-life').click();performance.now=nativeNow;
 const after=restore(localStorage.getItem(SAVE_KEY));if(after.tick!==8||after.hero.alive||after.lives.length!==1||after.lives[0].ended!==2||after.observation.person!==before.observation.person)throw Error('Invalid interval/death');
 document.getElementById('menu').click();if(document.getElementById('run-life').textContent!=='Прожить год')throw Error('Wrong button');
 const output=document.createElement('pre');output.id='result';output.hidden=true;output.textContent=JSON.stringify({profile,scope:'PARTIAL desktop Edge, selected NPC/needs/supply/towns; 2 measured steps, 8 real UI steps',ticks:after.tick,death:after.lives[0].ended,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)});document.body.append(output);
}catch(e){const p=document.createElement('pre');p.id='result';p.textContent=JSON.stringify({error:e.stack});document.body.append(p);}
</script>`;
let html=await readFile('index.html','utf8');html=html.replace('<head>','<head><base href="/">').replace('<script type="module" src="app.js"></script>',script);await writeFile(path.join(temp,'year-playback.html'),html);
const png=path.join(temp,'year-playback.png'),args=['--headless=new','--disable-gpu','--no-first-run','--force-device-scale-factor=1','--user-data-dir='+path.join(temp,'year-playback-browser'),'--window-size=500,900','--virtual-time-budget=2000','--screenshot='+png,'--dump-dom',origin+'/tmp/year-playback.html'];
const r=await new Promise(resolve=>{const child=spawn(process.env.ODYSSEY_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args,{windowsHide:true});let stdout='',stderr='';const timer=setTimeout(()=>child.kill(),20000);child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('close',status=>{clearTimeout(timer);resolve({stdout,stderr,status});});});await new Promise(r=>server.close(r));
await writeFile(path.join(temp,'year-playback-dom.html'),r.stdout);const m=r.stdout.match(/<pre id="result"[^>]*>([^<]+)<\/pre>/);if(r.status!==0||!m)throw Error('Browser failure '+r.stderr.slice(-200));const result=JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));if(result.error||result.ticks!==(controls?13:8)||result.overflow)throw Error(JSON.stringify(result));console.log(JSON.stringify({...result,image:png}));
