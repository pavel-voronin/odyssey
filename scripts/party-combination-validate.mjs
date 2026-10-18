import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {restore,serialize} from '../engine.js';
const dir='artifacts/party-combinations-153',json=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const f=await json(dir+'/source-freeze.json'),a=await json(dir+'/audit.json'),n=await json(dir+'/native.json');assert.equal(a.revision,f.revision);assert.equal(n.revision,f.revision);
for(const [p,h]of Object.entries(f.files))assert.equal(hash(await fs.readFile(p)),h,p);
for(const [p,h]of Object.entries(f.publicFiles))assert.equal(hash(await fs.readFile(dir+'/runtime-'+f.revision+'/'+p)),h,p);
assert.equal(a.steps,48000);assert.equal(a.rows.length,17);assert.equal(a.distinctOutcomes,5);assert.ok(a.checks>=4000);assert.equal(a.rows.filter(r=>r.kind==='OFF-baseline').length,4);assert.equal(a.rows.filter(r=>r.kind==='natural-prefix').length,4);
assert.deepEqual(n.frames.map(v=>v.width),[320,390]);assert.deepEqual(n.console,[]);assert.ok(n.closed&&n.viewportReset);assert.equal(n.preparedCombatSteps,0);assert.equal(n.manualCombatSteps,2);assert.equal(n.manualPracticeSteps,3);
for(const key of ['leaderFirstPreparation','leaderSecondRelease','strikerFirstPreparation','strikerSecondRelease','leaderImported','leaderReloaded','strikerImported','strikerReloaded','campFirstPractice','campSecondStillLearning','campThirdLearned','autoCardUpdated'])assert.equal(n[key],true,key);
for(const v of n.frames){assert.equal(v.documentWidth,v.width);assert.equal(v.documentHeight,v.height);assert.ok((await fs.stat(dir+'/'+v.file)).size>1000);for(const c of v.cards){assert.ok(c.scrollWidth<=c.width+1);assert.ok(c.scrollHeight<=c.height+1);}}
const physical=[];
for(const name of ['leader','striker']){
 const raw=await fs.readFile(dir+'/native-'+name+'-export.json','utf8'),s=restore(raw);assert.equal(serialize(s),raw);assert.equal(s.tick,12);
 const h=Object.values(s.actorStates).find(h=>h.actorGeneration===1),r=h.pairCombat,g=s.people[r.guard],p=s.people[r.striker],e=s.areas.a2.objects.find(o=>o.id===r.enemy);
 assert.equal(r.started,11);assert.equal(r.ended,12);assert.equal(r.status,'released');assert.equal(e.battle.turns,2);assert.equal(e.hp,583);assert.equal(h.hp,28);assert.equal(g.health,80);assert.equal(p.health,100);assert.equal(g.needs.energy,90);assert.equal(p.needs.energy,94);
 assert.equal(g.partyCombat.action,'cover');assert.equal(g.partyCombat.damage,0);assert.equal(g.partyCombat.intercepted,3);assert.equal(p.partyCombat.action,'paired-attack');assert.equal(p.partyCombat.damage,6);assert.equal(p.partyCombat.energy,4);
 for(const person of [g,p]){assert.equal(person.actionControl.phases.filter(v=>v==='combat').length,1);const practice=Object.values(person.pairPractice.partners)[0];assert.equal(practice.total,3);assert.equal(practice.method,'covered-windup');assert.deepEqual(practice.operations.map(o=>o.tick),[8,9,10]);}
 if(name==='striker'){assert.equal(s.hero.actorMode,'npc');assert.equal(s.hero.lineage,p.id);assert.equal(s.hero.intent,'Завершает общий приём');}else assert.equal(s.hero.lineage,h.lineage);
 physical.push({rng:s.rng,round:h.partyCombat,pair:r,guard:g.partyCombat,striker:p.partyCombat,hp:h.hp,guardHealth:g.health,strikerHealth:p.health,enemy:e.hp});
}
assert.deepEqual(physical[0],physical[1]);
const campRaw=await fs.readFile(dir+'/native-camp-export.json','utf8'),camp=restore(campRaw);assert.equal(serialize(camp),campRaw);assert.equal(camp.tick,8);assert.equal(camp.hero.pairDrill.status,'done');assert.equal(camp.hero.pairDrill.actions,3);
for(const p of Object.values(camp.people).filter(p=>p.pairPractice)){const r=Object.values(p.pairPractice.partners)[0];assert.deepEqual(r.operations.map(o=>o.tick),[6,7,8]);assert.equal(r.method,'covered-windup');assert.equal(r.operations.reduce((n,o)=>n+o.energy,0),6);assert.ok(p.needs.energy<94);assert.equal(p.partyCombat,undefined);}
const autoRaw=await fs.readFile(dir+'/native-auto-export.json','utf8'),auto=restore(autoRaw);assert.equal(serialize(auto),autoRaw);assert.ok(auto.tick>12);assert.equal(auto.hero.actorMode,'npc');assert.equal(auto.people[auto.hero.lineage].partyCombat.action,'attack');assert.equal(auto.people[auto.hero.lineage].partyCombat.damage,2);assert.equal(auto.nextGeneration,1);
const old=await fs.readFile('artifacts/party-actions-152/native-leader-export.json','utf8');assert.equal(serialize(restore(old)),old,'published152 exact current save restore');
const preflight=process.argv.includes('--preflight');let tests=null;
if(!preflight){assert.equal((await fs.readFile(dir+'/deploy-exit.txt','utf8')).trim(),'0');const log=await fs.readFile(dir+'/deploy.log','utf8'),pass=log.match(/(?:#|ℹ) pass (\d+)/),total=log.match(/(?:#|ℹ) tests (\d+)/);assert.ok(pass&&total);assert.equal(pass[1],total[1]);tests=Number(total[1]);assert.ok(tests>=1497);assert.match(log,new RegExp('Published and verified:.*'+f.revision));}
async function publicCheck(file,check){let last;for(let attempt=1;attempt<=3;attempt++){try{const r=await fetch('https://odyssey.kolpaque.dev/'+file,{signal:AbortSignal.timeout(30000),cache:'no-store'});assert.ok(r.ok,file);await check(r);return;}catch(error){last=error;if(attempt<3)console.warn('Public verification retry '+attempt+': '+file);}}throw last;}
const published=process.argv.includes('--published');if(published){assert.ok(!preflight);for(const [p,h]of Object.entries(f.publicFiles))await publicCheck(p,async r=>assert.equal(hash(Buffer.from(await r.arrayBuffer())),h,p));await publicCheck('release.json',async r=>assert.equal((await r.json()).revision,f.revision));}
const result={revision:f.revision,preflight,published,tests,steps:a.steps,checks:a.checks,rows:a.rows.length,nativeWidths:n.frames.map(v=>v.width),sources:Object.keys(f.files).length,publicFiles:Object.keys(f.publicFiles).length};await fs.writeFile(dir+'/validation'+(published?'-published':preflight?'-preflight':'')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
