import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,route} from '../engine.js';
import {setModule} from '../rules.js';
import {civicArea} from '../modules/society.js';import {createPerson} from '../modules/lineage.js';
import {initializeGoodsArea,completeGoodsWork,productionSources,goodsBalance,takeGoods} from '../modules/goods.js';
import {observeFreightActor,freightDispatch} from '../modules/freight-memory.js';
import {createFreight,advanceFreight} from '../modules/freight.js';
import {demandOffer,localDemand} from '../modules/demand-freight.js';
import {peopleTick} from '../modules/people.js';import {recoverCargo} from '../modules/supply.js';
const ctx={route,log(){},gainXp(){}};
function fixture(){const s=createWorld(1);for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['goods-cycle','demand-freight','npc-logistics','npc-control','npc-knowledge','supply'])setModule(s,id,true);
 const towns=['a1','a2','a3'].map(id=>s.areas[id]);for(const a of towns){a.type='village';civicArea(s,a);a.realm='surface';a.era=0;a.population=[];a.objects=[];a.links=towns.filter(b=>b!==a).map(b=>b.id);a.civic.food=30;a.civic.tools=0;a.civic.medicine=40;a.civic.treasury=100;delete a.goods;initializeGoodsArea(s,a);}
 for(const a of towns)for(const b of towns)if(a!==b)s.edges[[a.id,b.id].sort().join('|')]={mode:'road'};
 const actors=towns.map((a,i)=>{const id=createPerson(s,{name:'Carrier '+i,area:a.id,x:42,role:'житель',status:'resident',alive:true,health:100,maxHealth:100});const p=s.people[id];p.agenda.job='merchant';p.agenda.duty=.8;p.agenda.task=null;p.agenda.due=10000;p.agenda.tools=false;p.needs={hunger:0,energy:100,loneliness:0,meals:0,sleeps:0,conversations:0,sleeping:false};a.population.push(id);a.objects.push({id:'body-'+id,kind:'resident',person:id,x:42,name:p.name});return p;});
 for(const a of towns){delete a.goods;initializeGoodsArea(s,a);}s.logistics.convoys=[];s.hero.area='a0';s.hero.companions=[];
 return {s,a:towns[0],b:towns[1],c:towns[2],p:actors[0],q:actors[1],r:actors[2]};}
function stock(f,a,kind,n){const l=a.goods.ledger[kind];l.initial+=n-a.civic[kind];a.civic[kind]=n;}
function visit(s,p,a){const from=p.area;p.area=a.id;observeFreightActor(s,p);p.area=from;observeFreightActor(s,p);}
function finish(s,c){let ticks=0;while(s.logistics.convoys.includes(c)&&ticks++<80){s.tick++;advanceFreight(s,c,ctx);}assert.ok(ticks<=80);assert.equal(s.logistics.convoys.includes(c),false);}
function balance(a){for(const k of ['food','tools'])assert.equal(goodsBalance(a,k).difference,0);}
test('three settlements: real workshop output changes an offered food trip into a tool shipment, source reserve retained',()=>{
 const f=fixture(),{s,a,b,c,p,r}=f;stock(f,a,'food',70);stock(f,b,'food',8);visit(s,p,b);assert.equal(freightDispatch(s).target.id,b.id);assert.equal(demandOffer(s,p,a).kind,'food');const foodTrip=createFreight(s,a,b,ctx,p.id);finish(s,foodTrip);
 // The third settlement cannot ship tools before its actual craftsman has a workshop and performs finite work.
 stock(f,c,'food',80);r.agenda.job='artisan';visit(s,r,b);assert.equal(demandOffer(s,r,c),null);const receipt=i=>({id:'craft-'+i,actor:r.id,spent:3,required:3});assert.equal(completeGoodsWork(s,c,receipt('absent'),{kind:'tools',units:6}).quantity,0);
 c.objects.push({id:'real-bench',kind:'workshop',owner:r.id,state:'intact',x:42});const raw=productionSources(s,c).materials.stock,result=completeGoodsWork(s,c,receipt('done'),{kind:'tools',units:6});assert.ok(result.quantity>=5);assert.equal(c.goods.sources.materials.stock,raw-result.quantity*2);
 const offer=demandOffer(s,r,c);assert.equal(offer.kind,'tools');assert.equal(offer.market.area,b.id);const before=c.civic.tools,personCount=s.nextPerson,trip=createFreight(s,c,b,ctx,r.id);assert.ok(trip);assert.equal(trip.tools,2);assert.equal(trip.food,0);assert.equal(c.civic.tools,before-2);assert.ok(c.civic.tools>=trip.demand.reserve);finish(s,trip);assert.equal(b.civic.tools,2);assert.equal(s.nextPerson,personCount);assert.equal(s.people[r.id].area,b.id);balance(c);balance(b);
});
test('source shortage and small need cancel departure, local population changes only a witnessed snapshot',()=>{
 const f=fixture(),{s,a,b,p}=f;stock(f,a,'food',70);stock(f,b,'food',8);visit(s,p,b);const initial=demandOffer(s,p,a);assert.ok(initial);
 stock(f,a,'food',initial.reserve+7);const raw=serialize(s);assert.equal(createFreight(s,a,b,ctx,p.id),null);assert.equal(serialize(s),raw);
 stock(f,a,'food',70);stock(f,b,'food',localDemand(s,b).food-7);visit(s,p,b);assert.equal(demandOffer(s,p,a),null);
 const id=createPerson(s,{name:'New family member',area:b.id,x:42,role:'житель',status:'resident',alive:true});b.population.push(id);assert.equal(demandOffer(s,p,a),null);visit(s,p,b);assert.ok(demandOffer(s,p,a));
});
test('one food load reserves once, recruits no second body and creates real finite replacement work',()=>{
 const f=fixture(),{s,a,b,p}=f;stock(f,a,'food',38);stock(f,b,'food',0);visit(s,p,b);const trip=createFreight(s,a,b,ctx,p.id);assert.ok(trip);assert.equal(trip.food,12);assert.equal(a.civic.food,26);assert.equal(a.goods.harvestRequest.target,34);assert.equal(createFreight(s,a,b,ctx,p.id),null);
 const worker=createPerson(s,{name:'Local master',area:a.id,x:42,role:'житель',status:'resident',alive:true,health:100,maxHealth:100}),w=s.people[worker];w.agenda.job='artisan';w.agenda.duty=.8;w.agenda.tools=true;w.agenda.due=0;w.agenda.task=null;a.population.push(worker);w.needs.energy=100;w.needs.hunger=0;setModule(s,'people',true);for(const other of Object.values(s.people))if(other!==w&&other.agenda){other.agenda.due=10000;other.agenda.task=null;}const field=productionSources(s,a).field.stock,wealth=w.agenda.wealth,treasury=a.civic.treasury;
 for(let i=1;i<=3;i++){s.tick=i*8;peopleTick(s,ctx);}assert.equal(w.goodsWork.kind,'food');assert.ok(a.civic.food>26);assert.ok(a.goods.sources.field.stock<field);assert.ok(w.needs.energy<100);assert.ok(w.agenda.wealth>wealth);assert.ok(a.civic.treasury<treasury);balance(a);
});
test('demand and tools survive OFF and exact replay; capture keeps one recoverable cargo',()=>{
 const f=fixture(),{s,a,b,p}=f;stock(f,a,'food',30);stock(f,a,'tools',8);stock(f,b,'food',30);visit(s,p,b);const c=createFreight(s,a,b,ctx,p.id);assert.equal(c.tools,2);setModule(s,'demand-freight',false);const raw=serialize(s),copy=restore(raw);assert.equal(serialize(copy),raw);
 for(let i=0;i<3;i++){s.tick++;copy.tick++;advanceFreight(s,c,ctx);advanceFreight(copy,copy.logistics.convoys[0],ctx);}assert.equal(serialize(s),serialize(copy));
 a.objects.push({id:'ambusher',kind:'enemy',x:s.people[p.id].x+1,alive:true,resolved:false,hp:20,maxHp:20,attack:3});s.tick++;advanceFreight(s,c,ctx);assert.equal(p.status,'captive');const cache=a.objects.find(o=>o.id===c.id+'-cargo');assert.equal(cache.tools,2);assert.equal(c.tools,0);s.hero.area=a.id;s.hero.x=cache.x;recoverCargo(s,cache,ctx);assert.equal(s.people[s.hero.lineage].marketCargo.tools,2);const saved=serialize(s);recoverCargo(s,cache,ctx);assert.equal(serialize(s),saved);
});


test('own pending loads avoid overpromising; a broken known exit returns tools once without wages',()=>{
 const f=fixture(),{s,a,b,p}=f;stock(f,a,'tools',8);visit(s,p,b);const c=createFreight(s,a,b,ctx,p.id);assert.equal(c.tools,2);
 const observer=s.people[createPerson(s,{name:'Other carrier',area:a.id,x:42,role:'житель',status:'resident',alive:true})];observer.agenda.duty=.8;observer.agenda.job='merchant';observer.agenda.task=null;a.population.push(observer.id);visit(s,observer,b);assert.equal(demandOffer(s,observer,a),null);
 a.links=a.links.filter(id=>id!==b.id);finish(s,c);assert.equal(a.civic.tools,8);assert.equal(b.civic.tools,0);assert.equal(s.logistics.history.at(-1).outcome,'returned');assert.equal(s.logistics.history.at(-1).wage,0);assert.equal(s.people[p.id].area,a.id);balance(a);balance(b);
});
test('OFF observation cannot refresh an old demand; no restore enrichment and corrupt paid reserve is rejected',()=>{
 const f=fixture(),{s,a,b,p}=f;stock(f,a,'food',70);stock(f,b,'food',0);visit(s,p,b);const old=p.navigation.markets.find(m=>m.area===b.id).demand.seen;
 setModule(s,'demand-freight',false);s.tick=2000;visit(s,p,b);setModule(s,'demand-freight',true);assert.equal(p.navigation.markets.find(m=>m.area===b.id).demand.seen,old);assert.equal(demandOffer(s,p,a),null);visit(s,p,b);const c=createFreight(s,a,b,ctx,p.id);assert.ok(c);
 const raw=serialize(s),bad=JSON.parse(raw);bad.logistics.convoys[0].demand.reserve=1000;assert.throws(()=>restore(JSON.stringify(bad)),/convoy.demand/);assert.equal(serialize(restore(raw)),raw);
});

test('an arrived hungry resident consumes exactly one local portion before ordinary work',()=>{
 const f=fixture(),{s,b,q}=f;setModule(s,'people',true);setModule(s,'npc-needs',true);for(const p of Object.values(s.people))if(p.agenda){p.agenda.due=10000;p.agenda.task=null;}q.needs.hunger=70;q.needs.energy=100;q.x=42;q.roadSupplies={food:0,medicine:0};const stock=b.civic.food,meals=q.needs.meals;s.tick=8;peopleTick(s,ctx);assert.equal(b.civic.food,stock-1);assert.equal(q.needs.meals,meals+1);assert.equal(q.agenda.task,null);balance(b);
});

test('existing medicine-only relief keeps its real source reserve and same carrier',()=>{
 const f=fixture(),{s,a,b,p}=f;stock(f,a,'food',30);a.civic.medicine=50;b.civic.medicine=0;visit(s,p,b);const before=a.civic.medicine,c=createFreight(s,a,b,ctx,p.id);assert.ok(c);assert.equal(c.demand.kind,'medicine');assert.equal(c.medicine,4);assert.equal(c.food,0);assert.equal(a.civic.medicine,before-4);assert.equal(serialize(restore(serialize(s))),serialize(s));finish(s,c);assert.equal(b.civic.medicine,4);
});
