import {weaponDamageRange} from './combat-forecast.js';
import {guardiansOn,guardianNode} from './guardian-state.js';
import {observeGuardians,learnGuardianLink} from './guardian-knowledge.js';
import {physicalDistance} from '../geometry.js';
import {availableCombatSpells} from './magic.js';
export function guardianPlan(s,e,ctx){
 if(!guardiansOn(s)||!e?.guardianWard||!e.alive||e.resolved)return false;
 const h=s.hero;observeGuardians(s);const m=h.guardianNotes,n=m?.enemies[e.id];if(!n||n.shield!=='on'||h.hp<h.maxHp*.55||h.energy<12||weaponDamageRange(s,e).min>=e.hp)return false;
 if(availableCombatSpells(s).some(sp=>['damage','time'].includes(sp.kind))&&h.personality.curiosity<.5)return false;
 if(!n.node){const seen=Object.values(m.nodes).find(o=>o.area===h.area&&o.state==='on'&&physicalDistance(s.areas[h.area],h.x,o.x)<=30);if(!seen||h.personality.curiosity<.65)return false;
  ctx.goal(s,'guardianInspect',h.area,h.x,'Проследить защитный пульс','Камень виден, но связь ещё нужно изучить собственным действием.',{guardian:true,enemy:e.id,node:seen.id});
 }else{const node=m.nodes[n.node];if(!node||node.area!==h.area||node.state!=='on')return false;
  ctx.goal(s,'guardianDisable',h.area,node.x,'Отключить питающий камень','Связь замечена лично. Работа займёт два действия; страж продолжает отвечать.',{guardian:true,enemy:e.id,node:node.id,wardWork:{version:1,started:s.tick,worked:0,spent:0,lastTick:null}});
 }
 h.combat=null;ctx.cancelWeapon?.(s,'Он переключается с удара на питающий узел.');return true;
}
export function guardianAction(s,ctx){
 const h=s.hero,g=h.goal;if(!g?.guardian)return false;if(!guardiansOn(s)){h.lastAction='idle';return true;}
 const a=s.areas[h.area],e=a.objects.find(o=>o.id===g.enemy),node=a.objects.find(o=>o.id===g.node&&o.kind==='guardianNode');
 if(!e?.alive||e.resolved||!node||g.area!==h.area){h.goal=null;return true;}
 const other=a.objects.find(o=>o.kind==='enemy'&&o.id!==e.id&&o.alive&&!o.resolved&&physicalDistance(a,h.x,o.x)<=9);if(other){h.goal=null;h.combat=other.id;h.lastAction='look';ctx.enemyResponse(s,other);return true;}
 const reply=()=>{if(e.alive&&!e.resolved&&physicalDistance(a,h.x,e.x)<=9)ctx.enemyResponse(s,e);};
 if(g.kind==='guardianInspect'){h.energy=Math.max(0,h.energy-1);h.lastAction='look';learnGuardianLink(s,e,'inspection',ctx);h.goal=null;reply();return true;}
 if(g.kind!=='guardianDisable'||!g.wardWork)return false;
 const work=g.wardWork;if(work.lastTick===s.tick)return true;
 if(h.hp<h.maxHp*.4||h.energy<3){h.goal=null;h.lastAction='look';reply();return true;}
 if(physicalDistance(a,h.x,g.x)>1){ctx.move(s,g.x);reply();return true;}
 if(physicalDistance(a,h.x,node.x)>1){h.goal=null;return true;}
 if(node.guardianSupply.state==='off'){h.goal=null;h.lastAction='look';observeGuardians(s);reply();return true;}
 const knowledge=h.guardianNotes?.enemies[e.id];if(knowledge?.node!==node.id||guardianNode(s,e)!==node){h.goal=null;return true;}
 work.lastTick=s.tick;work.worked++;work.spent+=2;h.energy-=2;h.lastAction='work';
 if(work.worked===2){node.guardianSupply.state='off';node.guardianSupply.cut={tick:s.tick,actor:h.lineage,started:work.started,worked:2,spent:work.spent};h.goal=null;observeGuardians(s);ctx.log(s,'Камень погас. Щит того же стража исчезает, но его раны не затягиваются.','choice');}
 reply();return true;
}
