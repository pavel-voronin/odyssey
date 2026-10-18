import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,createNextStory,observeDetailedActor,route} from '../engine.js';
import {setModule} from '../rules.js';
import {campPassage,physicalDistance,routeDistance} from '../geometry.js';
import {reconcileCampSite,placeCampSite,observeCampSites} from '../modules/camp-sites.js';
import {planFieldCamp,leaveCamp} from '../modules/fieldcamp.js';
import {spatialAddress,spatialPassage} from '../modules/spatial.js';
import {syncActiveActor} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {peopleTick} from '../modules/people.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {invalidateNPCControl} from '../modules/npc-control.js';
import {advanceFreight} from '../modules/freight.js';
import {advancePublicJourney} from '../modules/public-journeys.js';
import {ordersTick} from '../modules/orders.js';
import {worldSignKind} from '../world-signs.js';
import {createClock,catchUp} from '../clock.js';

const ctx={goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,...extra};s.hero.intent=intent;s.hero.reason=reason;},log(){},route};
export function campFixture({sites=true}={}){
 const s=createWorld(1),h=s.hero,a=s.areas.a0;setModule(s,'camp-sites',sites);
 for(const id of ['body','stories','caravans','faction-paths','events','people','weather','preparation','intention-balance','intentions','personal-aid','hearth-food'])setModule(s,id,false);
 a.length=260;a.objects=a.objects.filter(o=>o.kind!=='enemy');h.area=a.id;h.x=20;h.goal=null;h.energy=12;h.hp=h.maxHp;h.hunger=0;h.companions=[];syncActiveActor(s);
 for(let i=0;i<3;i++)step(s);const camp=s.areas[a.fieldCamp];assert.ok(sites?camp?.temporaryCamp.site:camp?.temporaryCamp.mode==='personal');
 for(let i=0;i<10&&physicalDistance(camp,h.x,68)>1;i++)step(s);
 assert.equal(h.area,camp.id);assert.ok(physicalDistance(camp,h.x,68)<=1);h.energy=100;h.goal={kind:'routeWait',area:camp.id,x:h.x,until:10000};syncActiveActor(s);
 return {s,h,a,camp};
}
function nextBody(f,x){assert.equal(createNextStory(f.s,{allowLiving:true}),true);const h=f.s.hero;h.area=f.a.id;h.x=x;h.energy=100;h.hp=h.maxHp;h.hunger=0;h.goal=null;h.companions=[];h.quests=[];syncActiveActor(f.s);return h;}
function walkUntil(s,predicate,limit=200){let n=0;while(!predicate()&&n++<limit)step(s);assert.ok(predicate(),`not reached after ${n} ticks: ${s.hero.area}/${s.hero.x}/${s.hero.goal?.kind}`);return n;}

test('first real pitching fixes one exact side passage without productive pockets or address-read mutation',()=>{
 const {s,h,a,camp}=campFixture();assert.equal(camp.temporaryCamp.site.parentX,20);assert.equal(camp.temporaryCamp.site.localEntry,52);assert.equal(camp.temporaryCamp.site.source,'actual-pitch');assert.equal(camp.objects.length,1);assert.equal(camp.forage.max,0);assert.equal(camp.civic,undefined);assert.equal(camp.population,undefined);
 const before=serialize(s);for(let i=0;i<20;i++){assert.equal(campPassage(s,a.id,camp.id,h.lineage).x,20);assert.equal(campPassage(s,camp.id,a.id,h.lineage).arrival,20);assert.equal(spatialAddress(s,camp.id,68).precision,'entrance');assert.equal(spatialPassage(s,[a.id,camp.id].sort().join('|')).status,'known');}assert.equal(serialize(s),before);
});
test('two independent lives actually approach one fire on a long road and walk back after the common exit',()=>{
 const f=campFixture(),{s,a,camp,h:first}=f,h=nextBody(f,20),originalSite=JSON.stringify(camp.temporaryCamp.site),areas=s.nextArea;
 observeCampSites(s);assert.equal(h.campSites[camp.id].x,20);h.goal={kind:'rest',area:a.id,x:80};const distance=h.distance,energy=h.energy;
 walkUntil(s,()=>physicalDistance(a,h.x,80)<=1);assert.ok(h.distance-distance>=155);assert.ok(h.energy<energy);h.hp=Math.ceil(h.maxHp*.2);h.energy=40;h.goal=null;
 const began=s.tick,walked=h.distance;walkUntil(s,()=>h.area===camp.id);
 assert.ok(s.tick-began>=28);assert.ok(h.distance-walked>=155);assert.equal(h.x,52);assert.ok(physicalDistance(a,h.campReturn.x,80)<=1);assert.equal(first.area,camp.id);assert.equal(first.x,68);assert.equal(h.companions.length,0);assert.equal(first.companions.length,0);assert.equal(s.nextArea,areas);assert.equal(JSON.stringify(camp.temporaryCamp.site),originalSite);
 walkUntil(s,()=>h.area===a.id);assert.equal(h.x,20);assert.equal(h.goal.kind,'campContinue');assert.ok(physicalDistance(a,h.goal.x,80)<=1);const afterExit=h.distance;
 walkUntil(s,()=>physicalDistance(a,h.x,80)<=1);assert.ok(h.distance-afterExit>=155);assert.equal(JSON.stringify(camp.temporaryCamp.site),originalSite);assert.equal(camp.objects.length,1);
});
test('unknown, unaffordable and threatened approaches do not move a fire or teleport a new visitor',()=>{
 for(const mode of ['unknown','exhausted','threat']){const f=campFixture(),{s,a,camp}=f,h=nextBody(f,80),site=JSON.stringify(camp.temporaryCamp.site);
  if(mode!=='unknown'){h.x=20;observeCampSites(s);h.x=80;}if(mode==='exhausted')h.energy=3;
  if(mode==='threat')a.objects.push({id:'blocking-wolf',kind:'enemy',x:50,alive:true,hp:50,attack:10});
  assert.equal(planFieldCamp(s,ctx),false);assert.equal(h.area,a.id);assert.equal(h.x,80);assert.equal(JSON.stringify(camp.temporaryCamp.site),site);
 }
});
test('saved fixed geometry survives both switches OFF, actual observer changes, reload and exact offline steps',()=>{
 const f=campFixture(),{s,h,camp,a}=f;setModule(s,'fieldcamp',false);setModule(s,'camp-sites',false);h.goal=null;
 const b=restore(serialize(s));assert.equal(serialize(b),serialize(s));const clock=createClock(0);catchUp(clock,120000,()=>step(b),120);for(let i=0;i<120;i++)step(s);assert.equal(serialize(b),serialize(s));assert.equal(camp.temporaryCamp.site.parentX,20);
 assert.equal(h.area===camp.id,false);assert.equal(campPassage(s,a.id,camp.id,h.lineage).x,20);
});
test('a current personal-mode camp cannot admit another body and an empty new visit records its actual entry',()=>{
 const f=campFixture({sites:false}),{s,h:first,camp,a}=f;assert.equal(camp.temporaryCamp.returns[first.lineage].parentX,20);const second=nextBody(f,80);assert.equal(planFieldCamp(s,ctx),false);assert.equal(campPassage(s,a.id,camp.id,second.lineage).allowed,false);
 second.goal={kind:'routeWait',area:a.id,x:80,until:10000};first.goal={kind:'rest',area:camp.id,x:68};walkUntil(s,()=>first.area===a.id);assert.equal(first.x,20);first.goal={kind:'routeWait',area:a.id,x:20,until:10000};second.energy=12;second.goal=null;walkUntil(s,()=>second.area===camp.id);assert.equal(camp.temporaryCamp.returns[second.lineage].parentX,80);assert.equal(camp.temporaryCamp.site,undefined);
});

test('a real OFF-created visit can anchor on enable without moving a body or changing RNG, while a missing current entry is corruption',()=>{
 const f=campFixture({sites:false}),{s,h,camp,a}=f,save=serialize(s),loaded=restore(save);assert.equal(serialize(loaded),save);setModule(s,'camp-sites',true);const x=h.x,rng=s.rng;reconcileCampSite(s,camp);assert.equal(h.x,x);assert.equal(s.rng,rng);assert.equal(camp.temporaryCamp.mode,'anchored');assert.equal(camp.temporaryCamp.site.parentX,20);assert.equal(camp.temporaryCamp.site.localEntry,68);assert.equal(camp.temporaryCamp.site.source,'current-personal-visit');leaveCamp(s,ctx);walkUntil(s,()=>h.area===a.id);assert.equal(h.x,20);
 delete loaded.areas[camp.id].temporaryCamp.returns[loaded.hero.lineage];assert.throws(()=>restore(serialize(loaded)),/temporaryCamp/);
});

test('old remains and left items are not reassigned a newly invented parent address',()=>{
 const {s,h,camp,a}=campFixture();delete camp.temporaryCamp.site;h.area=a.id;h.x=80;syncActiveActor(s);camp.objects.push({id:'old-cache',kind:'heirloom',x:40,items:[{id:'only-original'}],gold:0,taken:false});const items=JSON.stringify(camp.objects);
 assert.equal(placeCampSite(s,camp,80),null);assert.equal(camp.temporaryCamp.site,undefined);assert.equal(JSON.stringify(camp.objects),items);assert.equal(campPassage(s,a.id,camp.id).allowed,false);
});
test('ordinary NPCs from both sides use the same passage, keep real needs and do not gain goods or companions',()=>{
 for(const start of [5,80]){const f=campFixture(),{s,a,camp}=f,p=Object.values(s.people).find(p=>p.alive&&p.id!==s.hero.lineage&&p.agenda&&p.role!=='ребёнок');
  setModule(s,'people',true);p.area=a.id;p.x=20;observeNPCPlace(s,p);p.x=start;p.status='wandering';p.needs.energy=100;p.needs.hunger=0;p.needs.loneliness=0;p.agenda.task={kind:'visit',target:camp.id,x:68,remaining:1,person:s.hero.lineage,home:a.id};p.agenda.due=s.tick;
  const energy=p.needs.energy,stock=JSON.stringify(p.roadSupplies||null);invalidateNPCControl(s);let entered=false,last=p.x;
  for(let i=0;i<60&&p.area!==camp.id;i++){s.tick=Math.ceil((s.tick+1)/8)*8;peopleTick(s,ctx);if(p.area===a.id){assert.ok(physicalDistance(a,last,p.x)<=6.001);last=p.x;}else{entered=true;assert.ok(physicalDistance(a,last,20)<=1);assert.equal(p.x,52);}}
  assert.equal(entered,true);assert.ok(p.needs.energy<energy);assert.equal(JSON.stringify(p.roadSupplies||null),stock);assert.equal(s.hero.companions.length,0);
 }
});
test('a freight controller cannot carry its one cargo into an incompatible footpath or teleport through another edge',()=>{
 const {s,a,camp}=campFixture(),p=Object.values(s.people).find(p=>p.alive&&p.id!==s.hero.lineage&&p.agenda);p.area=a.id;p.x=80;p.status='caravan';p.needs.energy=100;p.needs.hunger=0;
 const c={id:'actual-cargo',person:p.id,source:a.id,to:camp.id,path:[a.id,camp.id],index:0,version:1,movement:'physical',sourceName:a.name,targetName:camp.name,sightings:{},manifest:{food:12,medicine:3},elapsed:0,lastTick:-1,food:12,medicine:3,remaining:1,segmentTicks:1,startX:80,endX:20};s.logistics.convoys.push(c);invalidateNPCControl(s);const own=JSON.stringify([c.food,c.medicine]);s.tick++;advanceFreight(s,c,ctx);
 assert.equal(p.area,a.id);assert.equal(p.x,80);assert.equal(c.returning,true);assert.equal(JSON.stringify([c.food,c.medicine]),own);assert.equal(s.logistics.convoys.filter(x=>x.id===c.id).length,1);const before=JSON.stringify(c);advanceFreight(s,c,ctx);assert.equal(JSON.stringify(c),before);assert.equal(campPassage(s,a.id,camp.id,p.id,{carrier:true}).allowed,false);
});
test('the saved passage stays fixed when future pitching is OFF and cannot be used as a road shortcut',()=>{
 const f=campFixture(),{s,a,camp}=f,h=nextBody(f,80);h.x=20;observeCampSites(s);h.x=80;h.energy=40;setModule(s,'camp-sites',false);
 assert.equal(planFieldCamp(s,ctx),true);assert.equal(h.goal.x,20);assert.equal(h.x,80);assert.equal(campPassage(s,a.id,camp.id).x,20);
 assert.equal(routeDistance(s,[a.id,camp.id,a.id]),Infinity);camp.links.push('a1');s.areas.a1.links.push(camp.id);s.graphRevision++;
 assert.deepEqual(route(s,a.id,'a1'),[a.id,'a1']);assert.deepEqual(route(s,camp.id,'a1'),[camp.id,a.id,'a1']);assert.equal(campPassage(s,camp.id,'a1').allowed,false);
});
test('a pending public traveller uses the common arrival and only one journey action per tick',()=>{
 const {s,a,camp}=campFixture(),p=Object.values(s.people).find(p=>p.alive&&p.id!==s.hero.lineage&&p.agenda);p.area=a.id;p.x=20;observeNPCPlace(s,p);p.x=80;p.status='travelling';p.needs.energy=100;p.needs.hunger=0;
 const j={person:p.id,from:a.id,to:camp.id,path:[a.id,camp.id],index:0,version:1,movement:'physical',started:s.tick,lastTick:s.tick,elapsed:0,reason:'Прежний сохранённый переход',remaining:26,segmentTicks:26,startX:80,endX:100};s.society.journeys.push(j);invalidateNPCControl(s);
 let moved=0;while(p.area===a.id&&moved++<40){s.tick++;advancePublicJourney(s,j,ctx);const before=JSON.stringify([p.x,p.area,j,p.needs]);advancePublicJourney(s,j,ctx);assert.equal(JSON.stringify([p.x,p.area,j,p.needs]),before);}
 assert.equal(p.area,camp.id);assert.equal(p.x,52);assert.ok(moved>=26);assert.equal(camp.temporaryCamp.site.parentX,20);
});
test('future site versions and dead old bodies are preserved rather than assigned a convenient new position',()=>{
 for(const mode of ['future','dead']){const {s,h,camp,a}=campFixture();if(mode==='future')camp.temporaryCamp.site={version:99,private:'future'};else{delete camp.temporaryCamp.site;h.alive=false;h.hp=0;syncActiveActor(s,true);}
  const before=JSON.stringify({x:h.x,area:h.area,objects:camp.objects,site:camp.temporaryCamp.site,rng:s.rng});assert.equal(placeCampSite(s,camp,80),null);assert.equal(JSON.stringify({x:h.x,area:h.area,objects:camp.objects,site:camp.temporaryCamp.site,rng:s.rng}),before);assert.equal(campPassage(s,a.id,camp.id).allowed,false);
 }
});
test('a guard order touching the camp uses the same physical approach rather than its old timed arrival',()=>{
 const {s,a,camp}=campFixture(),p=Object.values(s.people).find(p=>p.alive&&p.id!==s.hero.lineage&&p.agenda);p.area=a.id;p.x=20;observeNPCPlace(s,p);p.x=80;p.status='marching';p.needs.energy=100;p.needs.hunger=0;
 const order={person:p.id,from:a.id,to:camp.id,enemy:'waiting-threat',stage:'marching',remaining:1};s.society.orders.push(order);invalidateNPCControl(s);
 let n=0;while(p.area===a.id&&n++<40){s.tick++;ordersTick(s,ctx);const before=JSON.stringify([p.x,p.area,order,p.needs]);ordersTick(s,ctx);assert.equal(JSON.stringify([p.x,p.area,order,p.needs]),before);}
 assert.ok(n>=27);assert.equal(p.area,camp.id);assert.equal(p.x,52);assert.equal(order.stage,'marching');assert.ok(p.needs.energy<100);assert.equal(camp.temporaryCamp.site.parentX,20);
});
test('a current personal camp cannot invent a missing NPC entrance or historical road exit',()=>{
 const {s,h,a,camp}=campFixture({sites:false}),p=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.agenda);p.area=camp.id;p.x=68;const before=JSON.stringify({x:p.x,area:p.area,rng:s.rng});assert.equal(campPassage(s,camp.id,a.id,p.id).allowed,false);assert.equal(JSON.stringify({x:p.x,area:p.area,rng:s.rng}),before);assert.throws(()=>restore(serialize(s)),/temporaryCamp/);
});

test('an actual interrupted task resumes at the common exit instead of an endless return and preparation loop',()=>{
 for(const oldWithoutView of [false,true]){
  const f=campFixture(),{s,a,camp}=f,h=nextBody(f,20);observeCampSites(s);h.goal={kind:'rest',area:a.id,x:80};walkUntil(s,()=>physicalDistance(a,h.x,80)<=1);
  h.hp=Math.ceil(h.maxHp*.2);h.energy=40;const work={kind:'work',area:'a1',x:42,job:'medicine',remaining:4};h.goal=work;h.intent='Помочь лекарю';h.reason='Он обещал закончить перевязки.';h.action='WORK';assert.equal(planFieldCamp(s,ctx),true);
  walkUntil(s,()=>h.area===camp.id);assert.equal(h.campReturn.taskView.intent,'Помочь лекарю');assert.deepEqual(restore(serialize(s)).hero.campReturn.taskView,h.campReturn.taskView);if(oldWithoutView)delete h.campReturn.taskView;
  walkUntil(s,()=>h.area===a.id);assert.equal(h.x,20);assert.deepEqual(h.goal,work);assert.equal(h.intent,oldWithoutView?'Продолжить прежнее дело':'Помочь лекарю');assert.equal(h.action,'WORK');if(!oldWithoutView)assert.equal(h.reason,'Он обещал закончить перевязки.');const x=h.x;step(s);assert.ok(h.x>x);assert.equal(h.goal.kind,'work');assert.doesNotMatch(h.intent,/Выйти из походного лагеря/);
 }
});
test('camp route forecasting includes the local walk and refuses a medical trip that loses to poison',()=>{
 const f=campFixture(),{s,a,camp}=f,h=nextBody(f,20);observeCampSites(s);h.x=80;h.energy=40;h.hp=1;h.hunger=0;h.conditions=[{id:'poison',since:s.tick,until:s.tick+129}];h.inventory.potions=1;h.inventory.herbs=0;h.inventory.rations=3;h.goal=null;setModule(s,'body',true);setModule(s,'poison-care',true);setModule(s,'supply',true);syncActiveActor(s);
 step(s);assert.equal(h.area,a.id);assert.equal(h.x,80);assert.equal(h.lastAction,'heal');assert.equal(h.inventory.potions,0);assert.ok(h.hp>1);assert.equal(camp.temporaryCamp.site.parentX,20);
});
test('camp and return signs have meaningful vector symbols instead of the generic unknown diamond',()=>{assert.equal(worldSignKind('♨'),'camp');assert.equal(worldSignKind('↩'),'exit');});
