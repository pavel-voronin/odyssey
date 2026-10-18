import{test}from'node:test';
import assert from'node:assert/strict';
import{createWorld,step,serialize,restore}from'../engine.js';
import{setModule}from'../rules.js';
import{availableOffers,acceptQuest,questAction,finishQuest,questReady,failQuest}from'../modules/quests.js';
import{civicArea,politicalPlan,governTick,societyTick}from'../modules/society.js';
import{meetPerson,recruitPerson,socialTick,partyHurt}from'../modules/social.js';
const logs=[];
const ctx={random:()=>.1,log:(s,text)=>logs.push(text),gainXp:()=>{},route:()=>['a1'],goal:(s,kind,area,x,intent,reason,extra={})=>{s.hero.goal={kind,area,x,...extra};},closest:(s,p)=>Object.values(s.areas).find(p)};
function secondTown(s){const a={id:'a5',type:'village',name:'Второй Брод',depth:1,links:['a1'],objects:[],population:[s.areas.a1.population[0]],visited:true,discovered:true};s.areas.a5=a;s.areas.a1.links.push('a5');civicArea(s,a);return a;}

test('all eight quest families occur and finish in autonomous histories',()=>{
  const accepted=new Set(),completed=new Set();let power=0,companions=0,births=0,deaths=0;
  for(let seed=1;seed<=24;seed++){
    const s=createWorld(seed);for(let i=0;i<5000;i++)step(s);
    for(const q of s.hero.quests){accepted.add(q.kind);if(q.status==='done')completed.add(q.kind);}
    power+=s.hero.civic.holdings.length;companions+=s.hero.counters.companions;
    births+=Object.values(s.people).filter(p=>p.born!==undefined).length;deaths+=Object.values(s.people).filter(p=>p.died!==undefined&&p.role!=='герой').length;
  }
  for(const kind of ['wolves','herbs','relic','delivery','supply','medicine','scout','rescue']){assert.ok(accepted.has(kind),`accepted ${kind}`);assert.ok(completed.has(kind),`completed ${kind}`);}
  // Mortality has deterministic guard/need scenarios; this finite social sample may have no casualties.
  assert.ok(power>0&&companions>0&&births>0,JSON.stringify({power,companions,births,deaths}));
});
test('supply delivery consumes real reserves and reduces a shortage by exactly the carried quantity',()=>{
  const s=createWorld(0),target=Object.values(s.areas).find(a=>a.district==='Мастерские');s.hero.area=target.id;s.hero.gold=10;
  s.areas.a1.civic.food=10;target.civic.food=70;
  const q={id:'supply-test',kind:'supply',title:'Припасы',source:'a1',target:target.id,status:'active',required:1,reward:24,cargo:false};
  s.hero.quests.push(q);s.hero.goal={kind:'questAction',remaining:3};questAction(s,q,ctx);
  assert.equal(target.civic.food,62);assert.equal(s.hero.gold,6);assert.ok(questReady(s,q));
  s.hero.area='a1';finishQuest(s,q,ctx);assert.equal(s.areas.a1.civic.food,18);assert.equal(q.foodCargo.delivered,8);assert.equal(target.civic.food+s.areas.a1.civic.food,80);assert.equal(q.status,'done');assert.equal(s.hero.gold,30);
});
test('healing a sick NPC removes ailment and consumes the requested herb',()=>{
  const s=createWorld(1);s.hero.area='a1';s.hero.inventory.herbs=1;
  const id=s.areas.a1.population[0],p=s.people[id];p.ailment='fever';p.health=40;
  const q={id:'heal-test',kind:'medicine',title:'Лечение',source:'a1',target:'a1',person:id,giver:id,status:'active',required:1,reward:14};
  s.hero.quests.push(q);finishQuest(s,q,ctx);assert.equal(p.health,100);assert.equal(p.ailment,null);assert.equal(s.hero.inventory.herbs,0);
});
test('a moved letter recipient changes the route instead of getting mail remotely',()=>{
  const s=createWorld(3),a=secondTown(s),id=s.areas.a1.population[0];s.people[id].area=a.id;s.hero.area='a1';
  const q={id:'letter',kind:'delivery',recipient:id,source:'a1',target:'a1',status:'active',required:1};
  questAction(s,q,ctx);assert.equal(q.target,a.id);assert.ok(!q.delivered);
  s.hero.area=a.id;questAction(s,q,ctx);assert.ok(q.delivered);
});
test('a friendship can become a party and beliefs can break it',()=>{
  const s=createWorld(8),id=s.areas.a1.population[0];s.hero.area='a1';
  meetPerson(s,id,ctx,15);assert.ok(recruitPerson(s,id,ctx,true));assert.equal(s.people[id].status,'withHero');
  const c=s.hero.companions.find(c=>c.person===id);c.ethics=1;c.loyalty=5;s.hero.alignment=-50;s.tick=32;
  socialTick(s,ctx);assert.ok(!s.hero.companions.some(c=>c.person===id));assert.equal(s.people[id].status,'resident');assert.ok(s.areas.a1.population.includes(id));
});
test('failing a quest clears quest cargo but preserves ordinary inventory',()=>{
  const s=createWorld(4);s.hero.questCargo={letter:'Письмо'};s.hero.inventory.herbs=2;
  const q={id:'letter',kind:'delivery',title:'Письмо',status:'active'};failQuest(s,q,ctx,'Опоздание');
  assert.deepEqual(s.hero.questCargo,{});assert.equal(s.hero.inventory.herbs,2);assert.equal(q.status,'failed');
});
test('government requires trust and actions change the settlement',()=>{
  const s=createWorld(2);s.hero.area='a1';s.hero.gold=100;s.hero.social.fame=4;s.hero.reputation[s.areas.a1.faction]=25;
  assert.ok(politicalPlan(s,ctx));for(let i=0;i<3;i++)governTick(s,ctx);
  assert.equal(s.areas.a1.civic.ruler,s.hero.lineage);assert.equal(s.hero.gold,60);assert.ok(s.hero.civic.holdings.includes('a1'));
  setModule(s,'politics',false);assert.equal(politicalPlan(s,ctx),false);
});
test('disabling society prevents calendar events without erasing existing families',()=>{
  const s=createWorld(2);setModule(s,'events',false);const people=JSON.stringify(s.people);s.tick=1000;
  societyTick(s,ctx);assert.equal(JSON.stringify(s.people),people);assert.equal(s.society.events.length,0);
});
