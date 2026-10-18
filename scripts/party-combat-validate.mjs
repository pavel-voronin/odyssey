import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {restore,serialize} from '../engine.js';
const dir='artifacts/party-actions-152',json=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const f=await json(dir+'/source-freeze.json'),a=await json(dir+'/audit.json'),n=await json(dir+'/native.json');assert.equal(a.revision,f.revision);assert.equal(n.revision,f.revision);
for(const [p,h]of Object.entries(f.files))assert.equal(hash(await fs.readFile(p)),h,p);
for(const [p,h]of Object.entries(f.publicFiles))assert.equal(hash(await fs.readFile(dir+'/runtime-'+f.revision+'/'+p)),h,p);
assert.equal(a.steps,44160);assert.equal(a.checks,2885);assert.equal(a.rows.length,42);assert.equal(a.compositionCases,10);assert.equal(a.distinctFirstOutcomes,7);assert.equal(a.rows.filter(r=>r.kind==='OFF-baseline').length,4);assert.equal(a.rows.filter(r=>r.kind==='natural-prefix').length,4);
assert.deepEqual(n.frames.map(v=>v.width),[320,390]);assert.deepEqual(n.console,[]);assert.ok(n.closed&&n.viewportReset&&n.imported&&n.reloaded&&n.leaderImported&&n.guardImported&&n.actualCaption&&n.autoCardUpdated&&n.guardContinuesAfterLeaderDeath);assert.equal(n.preparedActualCombatSteps,0);assert.equal(n.manualCombatSteps,1);
for(const v of n.frames){assert.equal(v.documentWidth,v.width);assert.equal(v.documentHeight,v.height);assert.ok((await fs.stat(dir+'/'+v.file)).size>1000);for(const c of v.cards){assert.ok(c.scrollWidth<=c.width+1);assert.ok(c.scrollHeight<=c.height+1);}}
for(const v of n.reason){assert.ok(v.scrollHeight<=v.height+1);assert.ok(v.parentScrollHeight<=v.parentHeight+1);}assert.ok(n.reason.some(v=>v.text==='Прикрывает союзника'));
const outcomes=[];
for(const name of ['leader','guard']){
 const raw=await fs.readFile(dir+'/native-'+name+'-export.json','utf8'),s=restore(raw);assert.equal(serialize(s),raw);assert.equal(s.tick,1);
 const h=Object.values(s.actorStates).find(h=>h.actorGeneration===1),r=h.partyCombat,g=s.people[r.guard],p=s.people[r.people.find(id=>id!==g.id)],e=s.areas.a2.objects.find(e=>e.id===r.enemy);
 assert.equal(r.people.length,2);assert.equal(r.replied,true);assert.equal(r.absorbed,3);assert.equal(g.partyCombat.action,'cover');assert.equal(g.partyCombat.energy,5);assert.equal(g.partyCombat.intercepted,3);assert.equal(g.partyCombat.damage,0);assert.equal(g.health,90);assert.equal(g.needs.energy,95);
 assert.equal(p.partyCombat.action,'heal');assert.equal(p.partyCombat.target,h.lineage);assert.equal(p.partyCombat.medicine,2);assert.equal(p.partyCombat.healed,15);assert.equal(p.roadSupplies.medicine,2);assert.equal(p.needs.energy,97);assert.equal(h.hp,25);assert.equal(h.maxHp,38);assert.equal(e.battle.turns,1);assert.equal(e.hp,595);
 for(const person of [g,p])assert.equal(person.actionControl.phases.filter(v=>v==='combat').length,1);
 assert.equal(s.actorFacts.events.filter(v=>v.kind==='attack'&&v.actor===e.id).length,1);assert.equal(s.actorFacts.events.filter(v=>v.kind==='attack'&&v.actor==='party:'+g.id).length,0);
 if(name==='leader')assert.notEqual(s.hero.actorMode,'npc');else {assert.equal(s.hero.actorMode,'npc');assert.equal(s.hero.lineage,g.id);assert.equal(s.hero.intent,'Прикрывает союзника');}
 outcomes.push({rng:s.rng,round:r,guard:g.partyCombat,healer:p.partyCombat,health:g.health,medicine:p.roadSupplies.medicine,enemy:e.hp});
}
assert.deepEqual(outcomes[0],outcomes[1]);
const autoRaw=await fs.readFile(dir+'/native-guard-after-auto-export.json','utf8'),auto=restore(autoRaw),former=Object.values(auto.actorStates).find(h=>h.actorGeneration===1);assert.equal(serialize(auto),autoRaw);assert.equal(auto.tick,n.autoExportTick);assert.ok(auto.tick>7);assert.equal(auto.hero.actorMode,'npc');assert.equal(auto.hero.alive,true);assert.equal(former.alive,false);assert.equal(auto.lives.length,1);assert.equal(auto.nextGeneration,1);const guard=auto.people[auto.hero.lineage];assert.equal(guard.partyCombat.action,'attack');assert.equal(guard.partyCombat.damage,3);assert.ok(guard.partyCombat.tick<auto.tick);
const old=await fs.readFile('artifacts/material-delegation-151/native-owner-export.json','utf8');assert.equal(serialize(restore(old)),old,'actual published151 save exact restore');
const preflight=process.argv.includes('--preflight');let tests=null;
if(!preflight){assert.equal((await fs.readFile(dir+'/deploy-exit.txt','utf8')).trim(),'0');const log=await fs.readFile(dir+'/deploy.log','utf8'),pass=log.match(/(?:#|ℹ) pass (\d+)/),total=log.match(/(?:#|ℹ) tests (\d+)/);assert.ok(pass&&total);assert.equal(pass[1],total[1]);tests=Number(total[1]);assert.ok(tests>=1483);assert.match(log,new RegExp('Published and verified:.*'+f.revision));}
async function publicCheck(file,check){let last;for(let attempt=1;attempt<=3;attempt++){try{const r=await fetch('https://odyssey.kolpaque.dev/'+file,{signal:AbortSignal.timeout(30000),cache:'no-store'});assert.ok(r.ok,file);await check(r);return;}catch(error){last=error;if(attempt<3)console.warn('Public verification retry '+attempt+': '+file);}}throw last;}
const published=process.argv.includes('--published');if(published){assert.ok(!preflight);for(const [p,h]of Object.entries(f.publicFiles))await publicCheck(p,async r=>assert.equal(hash(Buffer.from(await r.arrayBuffer())),h,p));await publicCheck('release.json',async r=>assert.equal((await r.json()).revision,f.revision));}
const result={revision:f.revision,preflight,published,tests,steps:a.steps,checks:a.checks,rows:a.rows.length,nativeWidths:n.frames.map(v=>v.width),sources:Object.keys(f.files).length,publicFiles:Object.keys(f.publicFiles).length};await fs.writeFile(dir+'/validation'+(published?'-published':preflight?'-preflight':'')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
