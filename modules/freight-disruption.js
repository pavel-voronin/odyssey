import {enabled} from '../rules.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {localContact} from './npc-contacts.js';
import {npcController} from './npc-control.js';
import {marketWallet} from './market.js';
import {physicalDistance} from '../geometry.js';
export const disruptionEnabled=s=>enabled(s,'freight-disruptions')&&enabled(s,'npc-logistics');
export function disruptionChoice(s,c,cause){
 if(!disruptionEnabled(s))return null;const p=s.people[c.person],a=s.areas[p.area],old=c.disruption;
 const receipt={tick:s.tick,area:p.area,cause,originalTo:old?.originalTo||c.to,person:p.id};
 if((old?.events.length||0)>=3)return {...receipt,choice:'stranded',reason:'Доступные попытки исчерпаны.'};
 if(c.trade&&p.agenda.duty<.65&&(p.needs?.energy??100)>=35&&p.health>=(p.maxHealth||100)*.6&&marketWallet(s,p.id)>=3){
  const buyers=(p.marketKnowledge?.entries||[]).filter(e=>e.kind==='tools'&&!e.closed&&e.market!==c.to&&e.market!==c.source&&e.wanted>0&&e.bid>0&&s.tick-e.at<=1920&&e.at<=s.tick&&!old?.events.some(v=>v.to===e.market)).sort((a,b)=>b.at-a.at).slice(0,4);
  for(const e of buyers){const path=npcKnownRoute(p,p.area,e.market,knownNPCHazards(s,p));if(path.length&&path.length<=4)return {...receipt,choice:'buyer',to:e.market,name:e.name,path,seen:e.at,reason:'Собственная партия и известный другой покупатель позволяют попробовать короткий путь.'};}
 }
 const exhausted=(p.needs?.energy??100)<40||p.health<(p.maxHealth||100)*.6||cause==='return-blocked';
 if(exhausted){const keepers=Object.values(s.people).filter(k=>k.id!==p.id&&k.alive&&k.agenda&&localContact(s,k.id,p.area)&&k.status==='resident'&&npcController(s,k)==='personal'&&!k.agenda.task&&!k.needs?.sleeping&&(k.needs?.hunger??0)<65&&(k.needs?.energy??100)>=40&&(k.freightCustody?.loads.length||0)<2&&k.freightOffer?.status!=='pending'&&physicalDistance(a,p.x,k.x)<=30&&!old?.events.some(v=>v.keeper===k.id)&&(k.agenda.duty>=.65||(k.agenda.bonds[p.id]||0)>0));
  const keeper=keepers.sort((x,y)=>physicalDistance(a,p.x,x.x)-physicalDistance(a,p.x,y.x)||x.id.localeCompare(y.id))[0];if(keeper)return {...receipt,choice:'custody',keeper:keeper.id,reason:'Сил на новый путь мало; рядом есть настоящий свободный хранитель. Ему ещё предстоит ответить.'};}
 return {...receipt,choice:c.returning?'stranded':'return',reason:c.returning?'Дальше пройти нельзя, хранителя не видно.':'Принятый адрес и оставшийся запас важнее неизвестной сделки: возвращает груз.'};
}
export function rememberDisruption(s,c,d){
 c.disruption ||= {version:1,originalTo:d.originalTo,events:[]};if(c.disruption.events.length<4)c.disruption.events.push(d);
}

export function shedFreightCargo(s,c,enemy){
 if(!disruptionEnabled(s)||!c.trade||c.returning||s.people[c.person].agenda.duty>=.45||(c.tools||0)<2||c.escaped)return false;
 const p=s.people[c.person],a=s.areas[p.area],previous=c.path[c.index-1],homeX=previous?(Number(previous.slice(1))>Number(p.area.slice(1))?100:0):55;
 if(p.health<=20||(p.needs?.energy??100)<20||physicalDistance(a,homeX,enemy.x)<=physicalDistance(a,p.x,enemy.x))return false;
 const lost=Math.ceil(c.tools/2),id=c.id+'-shed';if(a.objects.some(o=>o.id===id))return false;
 a.objects.push({id,kind:'supplyCache',name:'Брошенная при отступлении часть груза',x:p.x,food:0,medicine:0,tools:lost,owner:p.id,taken:false});c.tools-=lost;p.health-=20;p.needs.energy=Math.max(0,p.needs.energy-3);c.escaped={enemy:enemy.id,area:p.area,at:s.tick};
 rememberDisruption(s,c,{tick:s.tick,area:p.area,person:p.id,originalTo:c.disruption?.originalTo||c.to,cause:'ambush',choice:'shed-return',enemy:enemy.id,kind:'tools',quantity:lost,reason:'Оставляет часть собственной партии и отступает, сохранив жизнь и оставшийся груз.'});return true;
}
