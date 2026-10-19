import {enabled} from '../rules.js';
import {itemWorking} from './item-condition.js';
export const SOCKET_COMPONENTS=Object.freeze({ward:Object.freeze({name:'Осколок щита',mana:1,reduction:1})});
export const socketsOn=s=>['sockets','equipment','forging','property','goods-cycle'].every(k=>enabled(s,k));
export const socketCompatible=item=>item?.kind!=='socketComponent'&&item?.slot==='weapon'&&item.stat==='magic';
export const isSocketComponent=item=>item?.kind==='socketComponent'&&item.socketComponent?.version===1&&Boolean(SOCKET_COMPONENTS[item.socketComponent.type]);
export function socketDefense(s,damage,ctx={}){
 const h=s.hero,base=h.equipment?.weapon,gem=base?.socket?.component,kind=gem?.socketComponent,definition=kind&&SOCKET_COMPONENTS[kind.type];
 if(!enabled(s,'sockets')||!enabled(s,'equipment')||!enabled(s,'magic')||!socketCompatible(base)||!itemWorking(base)||!isSocketComponent(gem)||damage<=1||!h.magic?.spells.includes('ward')||h.magic.mana<definition.mana||kind.lastUse?.at>=s.tick||!s.areas[h.area]?.objects.some(e=>e.id===h.combat&&e.kind==='enemy'&&e.alive&&!e.resolved))return damage;
 const result=Math.max(1,damage-definition.reduction);if(result===damage)return damage;h.magic.mana-=definition.mana;kind.uses++;kind.lastUse={at:s.tick,actor:h.lineage,mana:definition.mana,reduced:damage-result,source:h.combat};
 if(kind.uses===1){gem.history ||= [];gem.history.push({tick:s.tick,text:'Осколок впервые защищает '+h.name+' ценой собственной маны владельца.'});ctx.log?.(s,gem.name+': щит принимает часть удара, расходуя 1 ману.','artifact');}return result;
}
