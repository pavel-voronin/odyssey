import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore,observeExistingPerson,observeDetailedActor} from '../engine.js';import {setModule} from '../rules.js';import {repertoireChoices} from '../modules/repertoire.js';
import {repertoireFixture,repertoireContext as ctx} from '../scripts/repertoire-scenarios.mjs';import {observeProperty} from '../modules/property.js';
import {abandonQuest} from '../modules/quests.js';
test('three dispositions see the same three real opportunities and select craft, kin or exploration without changing profession',()=>{
 for(const kind of['craft','family','explore']){const{s,h,q}=repertoireFixture(kind),skills=structuredClone(h.career.records),quests=h.quests.length;const choices=repertoireChoices(s,ctx,q);assert.deepEqual(choices.map(c=>c.line).sort(),['craft','explore','family']);assert.equal(choices[0].line,kind);step(s);assert.equal(h.repertoire.choices[0].line,kind);assert.equal(h.repertoire.choices[0].id,kind==='craft'?h.goal.job:kind==='family'?q.id:h.goal.area);assert.equal(h.profession,'clockmaker');assert.equal(h.quests.length,quests);assert.ok(h.career.records.clockmaker);if(kind!=='craft')assert.deepEqual(h.career.records,skills);}
});
test('repeated alternative queries do not change money, inventory, world randomness, skills or existing obligations',()=>{
 const{s,h,q}=repertoireFixture(),before=serialize(s);for(let i=0;i<100;i++)assert.equal(repertoireChoices(s,ctx,q).length,3);assert.equal(serialize(s),before);assert.equal(h.repertoire,undefined);
});
test('an observed lost workplace closes that method while another known workshop, old skill and family promise remain',()=>{
 const{s,h,q,a,o,b}=repertoireFixture();o.state='burned';assert.equal(repertoireChoices(s,ctx,q).find(c=>c.line==='craft').area,a.id,'an unobserved change is not knowledge');observeProperty(s,a);const skills=structuredClone(h.career.records);assert.equal(repertoireChoices(s,ctx,q).find(c=>c.line==='craft').area,b.id);assert.deepEqual(h.career.records,skills);assert.equal(q.status,'active');
 o.state='intact';observeProperty(s,a);assert.equal(repertoireChoices(s,ctx,q).find(c=>c.line==='craft').area,a.id);
});
test('a peaceful homebody can keep a real craft life without an obligatory exploration choice',()=>{
 const{s,h}=repertoireFixture('peaceful');assert.ok(!repertoireChoices(s,ctx).some(c=>c.line==='explore'));for(let i=0;i<60;i++)step(s);assert.equal(h.profession,'clockmaker');assert.ok(h.counters.peacefulWork>0);assert.ok((h.repertoire?.choices||[]).every(c=>c.line!=='explore'));assert.equal(h.alive,true);
});
test('disabling selection and loading an older life cannot invent a past repertoire or erase actual skills',()=>{
 const{s,h,q}=repertoireFixture();setModule(s,'repertoire',false);const before=serialize(s);assert.deepEqual(repertoireChoices(s,ctx,q),[]);assert.equal(serialize(s),before);const copy=restore(before);assert.equal(copy.hero.repertoire,undefined);assert.deepEqual(copy.hero.career.records,h.career.records);
});
test('a genuinely new worker without a previous-work cooldown is eligible; a saved future cooldown still applies',()=>{
 const{s,h,q}=repertoireFixture();delete h.workAfter;assert.ok(repertoireChoices(s,ctx,q).some(c=>c.line==='craft'));h.workAfter=s.tick+30;assert.ok(!repertoireChoices(s,ctx,q).some(c=>c.line==='craft'));s.tick+=30;assert.ok(repertoireChoices(s,ctx,q).some(c=>c.line==='craft'));
});
test('a critical real deadline pauses the same paid job; after actual refusal it resumes remaining work and pays once',()=>{
 for(const off of[false,true])for(const funded of[false,true]){const{s,h,q,a}=repertoireFixture();if(funded){h.gold-=10;a.civic.treasury+=10;}step(s);assert.equal(h.goal.kind,'work');step(s);assert.equal(h.goal.remaining,4);const remaining=h.goal.remaining,wallet=h.gold,treasury=a.civic.treasury,pay=Math.min(10,treasury);q.deadline=s.tick+20;step(s);assert.equal(h.repertoire.paused.goal.remaining,remaining);assert.equal(h.goal.quest,q.id);assert.equal(h.lastAction,'idle');assert.equal(h.gold,wallet);
  const saved=serialize(s),copy=restore(saved);assert.equal(serialize(copy),saved);abandonQuest(s,q,ctx,'Он пересмотрел обещание.');abandonQuest(copy,copy.hero.quests.find(p=>p.id===q.id),ctx,'Он пересмотрел обещание.');if(off){setModule(s,'repertoire',false);setModule(copy,'repertoire',false);}step(s);step(copy);assert.equal(serialize(s),serialize(copy));assert.equal(h.goal.kind,'work');assert.equal(h.goal.remaining,remaining-1);assert.equal(h.repertoire.paused,null);
  for(let n=0;n<8&&h.counters.peacefulWork<1;n++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));}assert.equal(h.counters.peacefulWork,1);assert.equal(h.gold,wallet+pay);assert.equal(a.civic.treasury,treasury-pay);assert.equal(q.status,'abandoned');
 }
});
test('observing an existing ordinary resident issues no tick and does not change the original body repertoire or real work',()=>{
 const f=repertoireFixture(),id=f.h.lineage,tick=f.s.tick;assert.equal(observeExistingPerson(f.s,f.owner.id),true);assert.equal(f.s.tick,tick);assert.equal(observeDetailedActor(f.s,id),true);const raw=serialize(f.s),a=restore(raw),b=restore(raw);assert.equal(observeExistingPerson(b,f.owner.id),true);assert.equal(b.tick,a.tick);
 for(let n=0;n<20;n++){step(a);step(b);assert.deepEqual(a.actorStates[id],b.actorStates[id]);assert.equal(a.rng,b.rng);assert.equal(a.areas[f.a.id].civic.treasury,b.areas[f.a.id].civic.treasury);}
});
test('fatigue, wounds, hunger, urgent promises and future state versions do not become a new optional selection',()=>{
 for(const mode of['fatigue','wound','hunger','urgent','future']){const{s,h,q}=repertoireFixture();if(mode==='fatigue')h.energy=15;if(mode==='wound')h.hp=1;if(mode==='hunger')h.hunger=90;if(mode==='urgent')q.deadline=s.tick+5;if(mode==='future')h.repertoire={version:99,unknown:['retain']};const before=serialize(s);assert.deepEqual(repertoireChoices(s,ctx,q),[]);assert.equal(serialize(s),before);}
});
test('matched actual lives develop three different action orders rather than only different names or claimed intentions',()=>{
 const sequences=[];
 for(const kind of['craft','family','explore']){const{s,h,q}=repertoireFixture(kind),choices=[];let last=-1;for(let n=0;n<800;n++){step(s);const c=h.repertoire?.choices.at(-1);if(c&&c.tick!==last){last=c.tick;choices.push(c.line);}}
  sequences.push(choices.slice(0,3).join('/'));assert.ok(h.career.records.clockmaker);if(kind==='explore'){assert.equal(q.status,'active');assert.equal(h.counters.peacefulWork,0);}else{assert.equal(q.status,'done');assert.ok(h.counters.peacefulWork>0);assert.equal(h.timeline.filter(e=>e.type==='reward'&&e.text.includes(q.title)).length,1);}
 }
 assert.equal(new Set(sequences).size,3);assert.deepEqual(sequences,['craft/family/explore','family/craft/explore','explore/explore/explore']);
});
