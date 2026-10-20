import {demandFreightEnabled,localDemand,demandOffer} from './demand-freight.js';
import {enabled} from '../rules.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
import {isTown} from './common.js';
import {heroPresent,areaObservation} from './background-towns.js';
import {initializeNPCKnowledge,observeNPCPlace,npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {localContact,observeNPCContacts} from './npc-contacts.js';
import {canStartNPCActivity} from './npc-control.js';
export const MARKET_LIMIT=24,MARKET_AGE=1920;
export function observeFreightActor(s,p,area=p?.area,sharedObservation=false){
  if(!enabled(s,'npc-logistics')||!p?.alive||!s.areas[area]||!localContact(s,p.id,area))return;
  initializeNPCKnowledge(s,p);
  const body=p.area===area?p:{...p,area};if(!sharedObservation){observeNPCPlace(s,body);if(!selfDrivenActor(s,p.id)||s.tick%8===0)observeNPCContacts(s,body);}
  const a=s.areas[area];if(!a.civic)return;
  p.navigation.markets ??=[];let record=p.navigation.markets.find(e=>e.area===area);
  if(!record){record={area};p.navigation.markets.push(record);}
  Object.assign(record,{name:a.name,food:a.civic.food,medicine:a.civic.medicine,treasury:a.civic.treasury||0,era:a.era,realm:a.realm,seen:s.tick});
  if(demandFreightEnabled(s))Object.assign(record,{tools:a.civic.tools||0,demand:{...localDemand(s,a),seen:s.tick,foodStock:a.civic.food,toolStock:a.civic.tools||0,medicineStock:a.civic.medicine,treasury:a.civic.treasury||0}});
  if(p.navigation.markets.length>MARKET_LIMIT)p.navigation.markets.sort((a,b)=>a.seen-b.seen).splice(0,p.navigation.markets.length-MARKET_LIMIT);
}
export function availableFreightDriver(s,p,source,{inTurn=false}={}){
  const rested=!enabled(s,'npc-needs')||!p?.needs?.sleeping&&(p?.needs?.energy??100)>=35&&(p?.needs?.hunger??0)<60;
  return Boolean(p?.alive&&canStartNPCActivity(s,p,{inTurn})&&p.area===source.id&&p.status==='resident'&&p.role!=='ребёнок'&&p.agenda&&!p.agenda.task&&p.health>=(p.maxHealth||100)*.4&&
    (p.agenda.job==='merchant'||p.agenda.duty>=.6)&&rested&&p.personalJourney?.status!=='active'&&
    !(p.migration&&s.migrations?.[p.migration]?.status==='active')&&!s.hero?.companions.some(c=>c.person===p.id)&&
    !s.society.orders.some(o=>o.person===p.id)&&!s.society.journeys.some(j=>j.person===p.id)&&!s.logistics.convoys.some(c=>c.person===p.id)&&
    !(enabled(s,'property')&&enabled(s,'property-damage')&&source.objects.some(o=>o.kind==='workshop'&&o.owner===p.id&&o.state==='burned')));
}
export function rememberedMarket(s,p,source,to=null,threshold=35){
  for(const m of p?.navigation?.markets||[]){
    if(m.area===source.id||to&&m.area!==to||m.seen<s.tick-MARKET_AGE||m.era!==source.era||m.realm!==source.realm||!(m.food<threshold||m.medicine<12))continue;
    const path=npcKnownRoute(p,source.id,m.area,knownNPCHazards(s,p));
    if(path.length>=2&&path.length<=7&&s.areas[m.area])return {market:m,path};
  }
  return null;
}
export function freightDispatch(s){
  if(demandFreightEnabled(s)){for(const source of Object.values(s.areas))if(isTown(source)&&source.civic){for(const id of source.population||[]){const p=s.people[id];if(availableFreightDriver(s,p,source)){const offer=demandOffer(s,p,source);if(offer)return {source,target:s.areas[offer.market.area],driver:p.id};}}}return null;}
  for(const source of Object.values(s.areas))if(isTown(source)&&source.civic?.food>60){
    for(const id of source.population||[]){const driver=s.people[id];if(!availableFreightDriver(s,driver,source))continue;
      const memory=rememberedMarket(s,driver,source);if(memory&&(memory.market.treasury>=3||driver.agenda.duty>.65))return {source,target:s.areas[memory.market.area],driver:driver.id};
    }
  }
  return null;
}
export function freightRequest(s,source,destination,driverId=null,{inTurn=false}={}){
  if(!enabled(s,'npc-logistics')||!source?.civic||!destination||source.id===destination.id||!demandFreightEnabled(s)&&source.civic.food<12)return null;
  const drivers=(source.population||[]).map(id=>s.people[id]).filter(p=>availableFreightDriver(s,p,source,{inTurn})&&(!driverId||p.id===driverId));
  if(demandFreightEnabled(s)){for(const p of drivers){const offer=demandOffer(s,p,source,destination.id);if(offer)return {driver:p,author:p.id,...offer};}return null;}
  if(driverId){const p=drivers[0],memory=p&&rememberedMarket(s,p,source,destination.id);return memory&&(memory.market.treasury>=3||p.agenda.duty>.65)?{driver:p,author:p.id,...memory}:null;}
  const authors=detailedActors(s).filter(h=>selfDrivenActor(s,h)&&!h.transit&&h.area===source.id);
  for(const author of authors){const person=s.people[author.lineage],memory=person?.alive&&rememberedMarket(s,person,source,destination.id,40);if(memory){const driver=drivers.find(p=>memory.market.treasury>=3||p.agenda.duty>.65);if(driver)return {driver,author:person.id,...memory};}}
  for(const p of drivers){const memory=rememberedMarket(s,p,source,destination.id);if(memory&&(memory.market.treasury>=3||p.agenda.duty>.65))return {driver:p,author:p.id,...memory};}
  return null;
}
export function observeConvoy(s,c){
  const p=s.people[c.person];if(!p)return;
  const a=s.areas[p.area];if(a)for(const h of detailedActors(s))if(localContact(s,h.lineage,a.id)){delete c.sightings[h.lineage];c.sightings[h.lineage]={area:a.id,tick:s.tick,food:c.food,medicine:c.medicine,...(c.tools?{tools:c.tools}:{})};}
  while(Object.keys(c.sightings).length>6)delete c.sightings[Object.keys(c.sightings)[0]];
}
export function freightEvent(s,c,a,text,ctx){
  const proof={tick:s.tick,area:a.id,text,kind:'supply',...areaObservation(s,a,'freight')};
  if(c)c.lastEvent=proof.id;
  if(c?.person&&s.people[c.person]?.alive&&!proof.witnesses.includes(c.person))proof.witnesses.push(c.person);
  s.logistics.events ??=[];s.logistics.events.unshift(proof);if(s.logistics.events.length>80)s.logistics.events.length=80;
  s.changes.push({tick:s.tick,text,id:proof.id,area:a.id,knownBy:[...proof.knownBy]});
  if(c){observeConvoy(s,c);const p=s.people[c.person];if(p?.agenda){p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();}}
  if(heroPresent(s,a))ctx.log(s,text,'supply');return proof;
}
export function convoyView(s,c){
  const p=s.people[c.person],a=p&&s.areas[p.area];
  if(c.movement==='timed'&&!enabled(s,'npc-logistics'))return {area:p?.area,tick:s.tick,food:c.food,medicine:c.medicine,...(c.tools?{tools:c.tools}:{}),timed:true};
  if(a&&heroPresent(s,a))return {area:a.id,tick:s.tick,food:c.food,medicine:c.medicine,...(c.tools?{tools:c.tools}:{}),here:true};
  return c.sightings?.[s.hero.lineage]||null;
}
