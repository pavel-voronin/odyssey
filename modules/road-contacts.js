import {physicalDistance} from '../geometry.js';
// Sava is the existing event owner, at the same position used by scene/trade.
// A sweep/proximity contact is an action, never a redraw or encounter roll.
export function localRoadShop(s,ctx){
 const h=s.hero,m=s.merchant,g=h.goal;if(!h.alive||h.combat||h.transit||h.roadStop||h.roadContact||!g||g.area===h.area||g.urgent||['rest','provision','eat','forage'].includes(g.kind)||m.area!==h.area||m.destination||physicalDistance(s.areas[h.area],h.x,58)>8||(h.memory.shopAfter||0)>s.tick||!ctx.wantsRoadShop(s))return false;
 const token='merchant-sava/'+m.area+'/'+m.nextMove;if(h.memory.roadContacts?.some(q=>q.token===token))return false;
 h.roadContact={version:1,kind:'merchant',source:'merchant-sava',token,area:h.area,started:s.tick,goal:g,intent:h.intent,reason:h.reason,action:h.action};ctx.goal(s,'trade',h.area,h.x,'Поговорить с Савой по дороге','Торговец действительно здесь. После разговора можно продолжить прежний путь.');h.lastAction='talk';return true;
}
export function suspendRoadFight(s,enemy){const h=s.hero,g=h.goal;if(!g||g.area===h.area||h.roadStop||h.roadContact)return;h.roadContact={version:1,kind:'fight',source:enemy.id,token:'threat/'+enemy.id,area:h.area,started:s.tick,goal:g,intent:h.intent,reason:h.reason,action:h.action};}
export function resumeRoadContact(s){
 const h=s.hero,q=h.roadContact;if(!q||!h.alive||h.combat||h.goal&&q.kind!=='fight')return false;
 const enemy=q.kind==='fight'&&s.areas[q.area].objects.find(o=>o.id===q.source),fled=enemy?.alive&&!enemy.resolved;
 h.memory.roadContacts ||= [];h.memory.roadContacts.push({kind:q.kind,source:q.source,token:q.token,area:q.area,at:s.tick,outcome:fled?'fled':'done'});if(h.memory.roadContacts.length>8)h.memory.roadContacts.shift();delete h.roadContact;
 if(h.goal||h.area!==q.area||fled)return false;h.goal=q.goal;h.intent=q.intent;h.reason=q.reason;h.action=q.action;h.lastAction='idle';return true;
}
