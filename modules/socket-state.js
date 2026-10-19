import {enabled} from '../rules.js';
import {itemWorking} from './item-condition.js';
export const SOCKET_COMPONENTS=Object.freeze({ward:Object.freeze({name:'Осколок щита',mana:1,reduction:1})});
export const socketsOn=s=>['sockets','equipment','forging','property','goods-cycle'].every(k=>enabled(s,k));
export const socketCompatible=item=>item?.kind!=='socketComponent'&&item?.slot==='weapon'&&item.stat==='magic';
export const isSocketComponent=item=>item?.kind==='socketComponent'&&item.socketComponent?.version===1&&Boolean(SOCKET_COMPONENTS[item.socketComponent.type]);
export function socketReduction(s,damage,{mana=s.hero.magic?.mana??0}={}){
 const h=s.hero,base=h.equipment?.weapon,gem=base?.socket?.component,kind=gem?.socketComponent,definition=kind&&SOCKET_COMPONENTS[kind.type];
 if(!enabled(s,'sockets')||!enabled(s,'equipment')||!enabled(s,'magic')||!socketCompatible(base)||!itemWorking(base)||!isSocketComponent(gem)||damage<=1||!h.magic?.spells.includes('ward')||mana<definition.mana||kind.lastUse?.at>=s.tick||!s.areas[h.area]?.objects.some(e=>e.id===h.combat&&e.kind==='enemy'&&e.alive&&!e.resolved))return 0;
 return damage-Math.max(1,damage-definition.reduction);
}
export function socketDefense(s,damage,ctx={}){
 const reduced=socketReduction(s,damage);if(!reduced)return damage;const h=s.hero,gem=h.equipment.weapon.socket.component,kind=gem.socketComponent,definition=SOCKET_COMPONENTS[kind.type];h.magic.mana-=definition.mana;kind.uses++;kind.lastUse={at:s.tick,actor:h.lineage,mana:definition.mana,reduced,source:h.combat};
 if(kind.uses===1){gem.history ||= [];gem.history.push({tick:s.tick,text:'Осколок впервые защищает '+h.name+' ценой собственной маны владельца.'});ctx.log?.(s,gem.name+': щит принимает часть удара, расходуя 1 ману.','artifact');}return damage-reduced;
}
