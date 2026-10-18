import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {npcAction,npcController} from './npc-control.js';
import {partyBodySpent,PARTY_PASSIVE_PHASES} from './party-combat-policy.js';

export function expeditionNode(){return {version:1,status:'blocked',remaining:2,bypassRemaining:3,lastTick:-1,route:null,history:[]};}
const on=s=>enabled(s,'expeditions');
function ready(s,p,c){
 const h=s.hero,claim=p?.actionControl,g=p?.personalJourney;
 return enabled(s,'companions')&&enabled(s,'people')&&p?.alive&&c.hp>0&&h.memory.people.includes(p.id)&&p.area===h.area&&Number.isFinite(p.x)&&physicalDistance(s.areas[h.area],p.x,h.x)<=24&&npcController(s,p)==='party'&&knowsPracticalMethod(s,p.id,'craft')&&p.health>=(p.maxHealth||100)*.65&&!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<65&&c.loyalty>=45&&!(g?.status==='active'&&g.due<s.tick+2)&&!partyBodySpent(s,p)&&!(p.partyNeeds?.tick===s.tick&&p.partyNeeds.activity)&&!(claim?.tick===s.tick&&claim.phases.some(k=>!PARTY_PASSIVE_PHASES.includes(k)));
}
// A forecast reads only known companions; it claims neither a turn nor consent.
export function expeditionNodePlan(s,c){
 if(!on(s)||!c.accessNode||c.accessNode.status==='open')return null;
 if(knowsPracticalMethod(s,s.hero.lineage,'craft'))return {route:'repair',actor:s.hero.lineage,x:82};
 const member=s.hero.companions.find(m=>ready(s,s.people[m.person],m)&&physicalDistance(s.areas[s.hero.area],s.people[m.person].x,82)<=12);
 return member?{route:'repair',actor:member.person,x:82}:{route:'bypass',actor:s.hero.lineage,x:64};
}
export function workExpeditionNode(s,c,ctx){
 const n=c.accessNode,h=s.hero;if(!on(s)||!n)return false;
 if(n.lastTick===s.tick)return true;
 if(n.status==='open')return false;
 if(!h.alive||h.hp<=0||h.transit||h.combat||h.area!==c.target)return true;
 const plan=expeditionNodePlan(s,c),g=h.goal;
 if(g?.nodeRoute!==plan.route||g?.specialist!==plan.actor){h.goal=null;return true;}
 if(physicalDistance(s.areas[h.area],h.x,plan.x)>9)return true;
 const helper=plan.actor!==h.lineage,p=helper?s.people[plan.actor]:null,cost=plan.route==='repair'?4:5;
 if(helper&&physicalDistance(s.areas[h.area],p.x,82)>12)return true;
 if(!helper&&h.energy<cost){h.goal=null;return true;}
 if(helper&&!npcAction(s,p,'party','expedition')){h.goal=null;return true;}
 if(helper){p.needs.energy-=cost;p.expeditionWork={version:1,tick:s.tick,story:c.id,leader:h.lineage,energy:cost};}else h.energy-=cost;
 const key=plan.route==='repair'?'remaining':'bypassRemaining';n[key]--;n.lastTick=s.tick;n.route=plan.route;
 n.history.push({tick:s.tick,actor:plan.actor,route:plan.route,energy:cost});
 if(n[key]===0)n.status='open';h.lastAction='work';h.goal=null;
 h.speech=plan.route==='repair'?(helper?p.name+' подгоняет привод.':'Подгоню привод сам.'):'Пролезу через сервисный ход.';
 ctx.log(s,n.status==='open'?(plan.route==='repair'?`${helper?p.name:'Герой'} восстанавливает привод. Прямой проход к сердцу корабля открыт.`:'Сервисный обход пройден. До сердца корабля можно добраться без починки привода.'):(plan.route==='repair'?'Подгонка привода требует ещё одного рабочего действия.':'Герой разбирается с тесным сервисным обходом; прямой проход остаётся закрыт.'),'story');
 return true;
}
