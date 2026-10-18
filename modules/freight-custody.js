import {physicalDistance,areaOffset} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {enabled} from '../rules.js';
export function approachFreightKeeper(s,c){
 const p=s.people[c.person],h=c.handoff;if(h.status==='accepted')return 'accepted';const k=s.people[h.keeper],body=localContact(s,h.keeper,p.area);if(!body||s.tick>h.until)return 'failed';if(h.status==='declined')return 'failed';
 if(h.status==='pending')return 'waiting';const a=s.areas[p.area],gap=physicalDistance(a,p.x,body.x);
 if(gap>1){p.x+=Math.sign(body.x-p.x)*areaOffset(a,Math.min(6,gap));return 'walking';}
 if(k.freightOffer?.status==='pending'&&k.freightOffer.id!==c.id)return 'failed';p.needs.energy=Math.max(0,p.needs.energy-1);h.status='pending';h.asked=s.tick;k.freightOffer={version:1,id:c.id,carrier:p.id,area:p.area,asked:s.tick,until:h.until,status:'pending'};return 'asked';
}
export function freightKeeperTurn(s,k){
 const offer=k.freightOffer;if(!offer||offer.status!=='pending')return false;
 if(enabled(s,'npc-control')&&(k.actionControl?.tick!==s.tick||k.actionControl.owner!=='personal'))return false;
 const c=s.logistics.convoys.find(c=>c.id===offer.id&&c.person===offer.carrier),p=c&&s.people[c.person],a=s.areas[k.area],bond=k.agenda.bonds[offer.carrier]||0,fee=bond>0?0:2;
 const accepts=c&&c.handoff?.keeper===k.id&&c.handoff.status==='pending'&&s.tick<=offer.until&&p.alive&&p.area===k.area&&physicalDistance(a,p.x,k.x)<=1&&!k.agenda.task&&!k.needs.sleeping&&k.needs.energy>=40&&k.needs.hunger<65&&(k.agenda.duty>=.65||bond>0)&&(k.freightCustody?.loads.length||0)<2&&marketWallet(s,p.id)>=fee&&!a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(a,o.x,k.x)<=18);
 offer.status=accepts?'accepted':'declined';offer.answered=s.tick;if(!c)return true;c.handoff.status=offer.status;c.handoff.answered=s.tick;
 if(!accepts)return true;
 const load={id:c.id,carrier:p.id,owner:c.trade?p.id:'civic/'+c.source,source:c.source,to:c.disruption.originalTo,area:k.area,at:s.tick,food:c.food,medicine:c.medicine,tools:c.tools||0,fee};
 k.freightCustody ||= {version:1,loads:[]};k.freightCustody.loads.push(load);c.handoff.transfer={keeper:k.id,at:s.tick,load:c.id,food:load.food,medicine:load.medicine,tools:load.tools,fee};c.food=0;c.medicine=0;if(c.tools)c.tools=0;c.custodyFee=fee;c.handoff.load=c.id;k.needs.energy=Math.max(0,k.needs.energy-1);
 if(fee){setActorMoney(s,p,marketWallet(s,p.id)-fee);setActorMoney(s,k,marketWallet(s,k.id)+fee);}return true;
}
export function releaseDeadFreightCustody(s,p){
 if(p.alive||!p.freightCustody?.loads.length||!s.areas[p.area])return;
 const a=s.areas[p.area];for(const load of p.freightCustody.loads){const id=load.id+'-keeper-cache';if(!a.objects.some(o=>o.id===id))a.objects.push({id,kind:'supplyCache',name:'Груз умершего хранителя',x:p.x||42,food:load.food,medicine:load.medicine,tools:load.tools,owner:load.owner,taken:false});}p.freightCustody.loads=[];
}
