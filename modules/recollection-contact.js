import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
export function remindPromises(s,id,ctx){
 const h=s.hero,p=s.people[id],contact=localContact(s,id,h.area);if(!enabled(s,'recollection')||!h.alive||h.transit||h.combat||!p?.alive||p.needs.sleeping||!contact||physicalDistance(s.areas[h.area],h.x,contact.x)>12)return false;
 let changed=false;for(const gap of h.recollection?.losses||[]){if(gap.domain!=='promise'||gap.restored!==null)continue;const q=h.quests.find(q=>q.id===gap.id);if(!q||q.giver!==id&&!q.promiseWitnesses?.includes(id))continue;gap.restored=s.tick;gap.via=id;q.recalledAt=s.tick;if(h.intentions?.balance){h.intentions.balance.checked=null;if(h.intentions.balance.blocked)delete h.intentions.balance.blocked[q.id];}
  if(q.status==='failed'&&enabled(s,'relationships')){const relation=h.relations[id];if(relation)relation.trust=Math.max(-100,relation.trust-2);}
  ctx?.log?.(s,p.name+' напоминает о данном обещании. '+(q.status==='active'?'Герой снова знает, кому и что обещал.':'Мир уже изменился: '+(q.failure||'прежнее дело завершилось')+'. Напоминание не возвращает награду и не создаёт нового дела.'),'memory');changed=true;
 }return changed;
}
