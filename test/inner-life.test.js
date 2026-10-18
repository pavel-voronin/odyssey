import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {innerPerspective} from '../modules/inner-life.js';
import {rememberRetreat,rememberPromise,commitmentPlan} from '../modules/commitments.js';
function conflict(){const s=createWorld(2),h=s.hero;h.personality.courage=.6;h.personality.generosity=.45;h.mind.stress=0;h.gold=100;h.weapon=0;h.memory.merchant='a1';h.innerLife={facets:[{id:'caution',name:'Осторожность',weight:8},{id:'loyalty',name:'Верность слову',weight:2}],spokeAt:-240,history:[],lastAssessment:null};
 const q={id:'word',kind:'delivery',title:'Весть домой',status:'active',giver:Object.keys(s.people)[0],cause:'Семья ждёт ответа.',source:'a1',target:'a1',reward:15,required:1,accepted:0,cargo:true,delivered:false};h.quests.push(q);rememberPromise(s,q);rememberRetreat(s,s.areas.a2.objects.find(o=>o.kind==='enemy'));return{s,h,q};}
const ctx={route:()=>['a0','a1'],goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,...extra},work:()=>false,log:(s,text)=>s.hero.speech=text};
test('sides can change an actual close priority, while disabling them retains the same memories and funds',()=>{
 const {s,h,q}=conflict(),b=restore(serialize(s));setModule(b,'inner-life',false);
 assert.equal(commitmentPlan(s,q,false,ctx),true);assert.equal(h.goal.kind,'trade');assert.equal(commitmentPlan(b,b.hero.quests[0],false,ctx),false);
 assert.equal(h.gold,b.hero.gold);assert.equal(h.innerLife.history.length,1);assert.ok(h.speech.includes('Осторожность'));assert.ok(h.speech.includes(q.title));
 const data=JSON.stringify(b.hero.innerLife);innerPerspective(b,b.hero.quests[0],20,20);assert.equal(JSON.stringify(b.hero.innerLife),data);
});
test('sides are silent without remembered cause, accepted promise, or a real competition and do not reveal hidden movement',()=>{
 const {s,h,q}=conflict();h.commitments.memories=[];assert.equal(innerPerspective(s,q,20,20).dialogue,'');assert.equal(h.innerLife.history.length,0);
 const other=conflict();other.h.quests=[];assert.equal(innerPerspective(other.s,other.q,20,20).dialogue,'');
 const a=conflict();assert.equal(innerPerspective(a.s,a.q,100,10).dialogue,'');a.s.people[a.q.giver].area='a4';const result=innerPerspective(a.s,a.q,20,20);assert.ok(!result.dialogue.includes(a.s.areas.a4.name));
});
test('one conflict is not repeated on every tick and profiles and subsequent lives remain reproducible through saving',()=>{
 const {s,h,q}=conflict();innerPerspective(s,q,20,20);s.tick=300;assert.equal(innerPerspective(s,q,20,20).dialogue,'');assert.equal(h.innerLife.history.length,1);
 let b=restore(serialize(s));for(let i=0;i<250;i++){step(s);step(b);}assert.equal(serialize(s),serialize(b));
 let awake=0;for(let seed=0;seed<1000;seed++)if(createWorld(seed).hero.innerLife.facets.length)awake++;assert.ok(awake>70&&awake<180);
});
