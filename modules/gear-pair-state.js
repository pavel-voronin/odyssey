import {enabled} from '../rules.js';
import {itemWorking} from './item-condition.js';
import {socketCompatible,isSocketComponent} from './socket-state.js';
// A pair is a current worn arrangement, never an unlocked collection bonus.
export function wardPair(s){
 const h=s.hero,w=h.equipment?.weapon,a=h.equipment?.armor,g=w?.socket?.component;
 if(!['gear-pairs','sockets','equipment','magic'].every(k=>enabled(s,k))||!socketCompatible(w)||!itemWorking(w)||!isSocketComponent(g)||g.socketComponent.type!=='ward'||g.physical?.holder.kind!=='socket'||g.physical.holder.id!==w.id||!itemWorking(a)||a.base!=='coat'||a.slot!=='armor'||a.stat!=='defense'||!w.id||!a.id||w.id===a.id||!h.magic?.spells.includes('ward')||h.magic.mana<1)return null;
 return {id:'ward-cloak',items:[w.id,a.id],component:g.id,energy:6,mana:1};
}
