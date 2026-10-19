import {estateClaimsOn,estateBody,estateReady,estateById} from './estate-claim-state.js';
import {physicalDistance} from '../geometry.js';
export function estateReceipt(e,r){e.receipts ||= [];e.receipts.push(r);if(e.receipts.length>16)e.receipts.shift();}
function near(s,p,at,range=2){const b=estateBody(s,p);return at&&!at.transit&&b.area===at.area&&!b.transit&&!p.roadTransit&&physicalDistance(s.areas[b.area],b.x,at.x)<=range;}
export function recordEstatePickup(s,p,cache,items){
 if(!estateClaimsOn(s)||!items.length)return;const b=estateBody(s,p),a=s.areas[b.area];if(!a?.objects.includes(cache)||!near(s,p,{area:a.id,x:cache.x,transit:null},2))return;
 const observers=Object.values(s.people).filter(q=>estateReady(s,q)&&near(s,q,{area:a.id,x:b.x,transit:null},12));
 for(const item of items){const id=item.inheritance?.estate,dead=id&&estateById(s,id),e=dead?.estate;if(!e)continue;
  item.inheritance.picked={at:s.tick,person:p.id,area:a.id};if(e.heir===p.id||e.heir===null){item.inheritance.received={at:s.tick,person:p.id};if(e.heir===null)item.inheritance.owner=p.id;}
  for(const q of observers){const note=q.estateNotes?.[id];if(!note)continue;if(!note.items.includes(item.id)&&note.items.length<12)note.items.push(item.id);if(!note.items.includes(item.id))continue;note.holders[item.id]={person:p.id,area:a.id,x:b.x,seen:s.tick,witness:q.id};}
  estateReceipt(e,{kind:'item-found',at:s.tick,person:p.id,item:item.id,area:a.id});
 }
}
