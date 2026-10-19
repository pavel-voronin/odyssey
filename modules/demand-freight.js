import {sourceHarvestShortfall} from './harvest-shortfall.js';
import {enabled} from '../rules.js';
import {goodsEnabled,requestHarvest} from './goods.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
export const demandFreightEnabled=s=>goodsEnabled(s)&&enabled(s,'demand-freight')&&enabled(s,'npc-logistics');
export function localDemand(s,a){
 const people=(a.population||[]).map(id=>s.people[id]).filter(p=>p?.alive&&p.area===a.id&&p.status==='resident'),workers=people.filter(p=>p.agenda&&p.role!=='ребёнок');
 return {version:1,food:Math.min(64,16+people.length*2),tools:Math.min(12,Math.max(2,workers.filter(p=>!p.agenda.tools).length+1)),medicine:12,families:people.length};
}
export function demandOffer(s,p,source,to=null){
 if(!demandFreightEnabled(s))return null;const own=localDemand(s,source),offers=[];
 for(const raw of p.navigation?.markets||[]){if(!raw.demand)continue;const m={...raw,seen:raw.demand.seen,food:raw.demand.foodStock,tools:raw.demand.toolStock,medicine:raw.demand.medicineStock,treasury:raw.demand.treasury};if(m.area===source.id||to&&m.area!==to||s.tick-m.seen>1920||m.seen>s.tick||m.era!==source.era||m.realm!==source.realm||!s.areas[m.area]?.civic)continue;
  const path=npcKnownRoute(p,source.id,m.area,knownNPCHazards(s,p));if(path.length<2||path.length>7||m.treasury<3&&p.agenda.duty<=.65)continue;
  for(const kind of ['food','tools','medicine']){
   if(kind==='medicine'&&!Number.isFinite(m.medicine))continue;
   const reserve=kind==='medicine'?30:own[kind]+(kind==='food'?4:1),surplus=Math.floor((source.civic[kind]||0)-reserve);
   // The source knows its own dispatched loads, not unseen competing caravans.
   const promised=s.logistics.convoys.filter(c=>c.source===source.id&&c.to===m.area&&!c.returning).reduce((n,c)=>n+(c[kind]||0),0),deficit=m.demand[kind]-(m[kind]||0)-promised,shortfall=kind==='food'?sourceHarvestShortfall(s,source):null,minimum=kind==='food'?8:2;
   if(surplus<(shortfall?2:minimum)||deficit<minimum)continue;const quantity=Math.min(surplus,deficit,kind==='food'?12:kind==='medicine'?4:3);
   offers.push({market:m,path,kind,quantity,reserve,deficit,...(shortfall&&quantity<Math.min(deficit,12)?{shortfall:{version:1,cause:shortfall.cause,harvest:shortfall.receipt,at:s.tick,requested:Math.min(deficit,12),loaded:quantity,missing:Math.min(deficit,12)-quantity}}:{}),score:deficit/(kind==='food'?4:1)/(path.length-1)});
  }
 }
 return offers.sort((a,b)=>b.score-a.score||a.market.area.localeCompare(b.market.area)||a.kind.localeCompare(b.kind))[0]||null;
}
export function demandDeparture(s,source,c,offer){
 c.demand={version:1,kind:offer.kind,quantity:offer.quantity,reserve:offer.reserve,stockBefore:source.civic[offer.kind]+offer.quantity,target:offer.market.demand[offer.kind],knownStock:offer.market[offer.kind]||0,seen:offer.market.seen,source:s.tick};
 if(offer.shortfall)c.demand.shortfall=structuredClone(offer.shortfall);
 if(offer.kind==='food'){requestHarvest(s,source,'Пополнить конечный запас после поставки по известной нужде.');source.goods.harvestRequest.target=Math.min(100,offer.reserve+12);}
}
