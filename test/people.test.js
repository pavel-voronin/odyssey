import {quoteMarket} from '../modules/market.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,route,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {peopleTick,peopleArea} from '../modules/people.js';
import {createPerson} from '../modules/lineage.js';
import {finishQuest,questTick} from '../modules/quests.js';
const ctx={route,log:()=>{},gainXp:()=>{},goal:(s,kind,area,x,_,__,extra)=>s.hero.goal={kind,area,x,...extra}};
function village(){const s=createWorld(1);s.areas.a1.discovered=true;const p=s.people[s.areas.a1.population[0]];for(const other of Object.values(s.people))if(other.id!==p.id&&other.agenda)other.agenda.due=100000;p.agenda.due=0;p.x=42;return{s,p};}
const advance=s=>{s.tick+=8;peopleTick(s,ctx);};
test('a resident works independently and draws actual pay from the local treasury',()=>{
  const{s,p}=village();p.agenda.job='farmer';for(let i=0;i<3;i++)advance(s);
  assert.equal(p.agenda.work,1);assert.equal(p.agenda.wealth,3);assert.equal(s.areas.a1.civic.treasury,57);assert.equal(s.hero.gold,4);
  assert.ok(s.areas.a1.goods.ledger.food.produced>0);
});
test('a sick person walks to a doctor and spends medicine for their own health',()=>{
  const{s,p}=village();p.health=50;p.ailment='fever';s.areas.a1.civic.medicine=2;while(p.health===50&&s.tick<200)advance(s);
  assert.equal(p.x,68);assert.equal(p.health,75);assert.equal(s.areas.a1.civic.medicine,0);
});
test('earned money buys a finite tool and the tool improves later production',()=>{
  const{s,p}=village();p.agenda.job='farmer';p.agenda.wealth=50;const price=quoteMarket(s,s.areas.a1,'tools','buy',1).total;
  while(!p.agenda.tools&&s.tick<200)advance(s);assert.equal(p.agenda.tools,1);assert.equal(p.agenda.wealth,50-price);assert.equal(s.areas.a1.civic.tools,2);assert.equal(s.areas.a1.civic.treasury,60+price);
  s.areas.a1.civic.food=50;p.agenda.due=s.tick;p.x=42;const work=p.agenda.work;while(p.agenda.work===work&&s.tick<400)advance(s);assert.equal(s.areas.a1.civic.food,58);
});
test('the legacy planner can relocate an unpaid worker to a discovered funded employer',()=>{
  const{s,p}=village();setModule(s,'npc-knowledge',false);p.agenda.job='artisan';s.areas.a1.civic.treasury=0;const a=s.areas.a4;a.type='village';a.discovered=true;a.civic={food:65,medicine:55,treasury:60};peopleArea(s,a);for(const e of s.areas.a2.objects)if(e.kind==='enemy')e.alive=false;s.areas.a2.discovered=true;
  while(p.agenda.home!=='a4'&&s.tick<1200)advance(s);assert.equal(p.area,'a4');assert.equal(p.agenda.home,'a4');assert.equal(p.status,'resident');assert.ok(p.agenda.knowledge.some(n=>n.text.includes('оплачиваемая работа')));
});
test('legacy food gathering follows a real route and moves finite plants into the home store',()=>{
  const{s,p}=village();setModule(s,'local-food',false);p.agenda.duty=1;s.areas.a1.civic.food=20;s.areas.a2.discovered=true;for(const e of s.areas.a2.objects)if(e.kind==='enemy')e.alive=false;
  let travelled=false;while(s.areas.a1.civic.food===20&&s.tick<800){advance(s);if(p.area==='a2')travelled=true;}
  assert.equal(travelled,true);assert.equal(s.areas.a1.civic.food,32);assert.equal(s.areas.a2.forage.stock,9);assert.equal(p.area,'a1');assert.equal(p.status,'resident');assert.equal(p.agenda.cargo,0);
  assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('the legacy family policy can visit a distant child, strengthen both bonds and return',()=>{
  const{s,p}=village();setModule(s,'npc-contacts',false);s.areas.a2.discovered=true;for(const e of s.areas.a2.objects)if(e.kind==='enemy')e.alive=false;const a=s.areas.a4;a.type='village';a.discovered=true;a.civic={food:65,medicine:55};peopleArea(s,a);
  const id=createPerson(s,{name:'Родственник в другом доме',parents:[p.id],race:p.race,alive:true,area:a.id,role:'житель'});a.population=[id];s.people[id].agenda.due=100000;p.agenda.sociability=1;s.tick=800;
  while(p.agenda.visits===0&&s.tick<2500)advance(s);assert.equal(p.agenda.visits,1);assert.equal(p.area,'a4');assert.equal(p.agenda.bonds[id],5);assert.equal(s.people[id].agenda.bonds[p.id],5);
  while(p.status==='wandering'&&s.tick<4000)advance(s);assert.equal(p.area,'a1');assert.equal(p.status,'resident');
});
test('turning off personal plans pauses movement and recruitment suspends an old task',()=>{
  const{s,p}=village();p.agenda.task={kind:'work',target:'a1',x:42,remaining:3};setModule(s,'people',false);const save=serialize(s);peopleTick(s,ctx);assert.equal(serialize(s),save);
  setModule(s,'people',true);p.status='withHero';advance(s);assert.equal(p.agenda.task,null);assert.equal(p.agenda.work,0);
});
test('medicine follows a relocated patient and cannot heal them from another place',()=>{
  const{s,p}=village();s.hero.area='a1';s.hero.inventory.herbs=1;p.area='a4';p.health=40;p.ailment='fever';
  const q={id:'medicine-test',kind:'medicine',status:'active',source:'a1',target:'a1',person:p.id,giver:p.id,required:1,reward:14};s.hero.quests=[q];finishQuest(s,q,ctx);
  assert.equal(p.health,40);assert.equal(s.hero.inventory.herbs,1);assert.equal(s.hero.goal.area,'a4');assert.equal(q.status,'active');s.hero.area='a4';finishQuest(s,q,ctx);assert.equal(p.health,100);assert.equal(s.hero.inventory.herbs,0);assert.equal(q.status,'done');
});
test('self-recovery makes an obsolete medical promise end without awarding hero credit',()=>{
  const{s,p}=village(),gold=s.hero.gold;const q={id:'obsolete',kind:'medicine',status:'active',source:'a1',person:p.id,giver:p.id,required:1,reward:14};s.hero.quests=[q];p.health=100;p.ailment=null;questTick(s,ctx);
  assert.equal(q.status,'failed');assert.ok(q.failure.includes('выздоровел'));assert.equal(s.hero.gold,gold);
});
