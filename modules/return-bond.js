import {activeReturnBond,returnSeal} from './return-bond-state.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {authorityBody} from './authority-state.js';
import {areaOffset,physicalDistance} from '../geometry.js';
import {npcController,canStartNPCActivity} from './npc-control.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {walkCampOrder} from './camp-route.js';
import {woundStride} from './wound-state.js';
import {presentParts} from './anatomy-state.js';
import {actorView} from '../actor-view.js';
export function initializeReturnBond(s,p,caster){const q=p.returnEpisode,h=s.actorStates[p.id],a=s.areas[p.area],before=marketWallet(s,caster.id),pace=woundStride(s,p),own=h&&npcController(s,p)===(h.actorMode==='npc'?'personal':'actor'),bound=Boolean(own&&pace>0&&presentParts(p).some(([, ,role])=>['arm','leg','head'].includes(role))&&caster.agenda.duty>=.8&&caster.agenda.curiosity<.25&&caster.agenda.sociability<.35&&before>=1);
 q.bond={version:1,state:bound?'bound':'free',created:s.tick,caster:caster.id,motive:bound?'Удержать помощь ограниченным поручением':'Вернуть близкому самостоятельность',knownCaster:{area:caster.area,x:caster.x,seen:s.tick},seal:null,cargo:null,lastAction:-1,release:null};
 if(!bound)return;const b=q.bond,id=q.body+'/seal',distance=Math.min(12,8*pace),x=p.x+areaOffset(a,p.x>50?-distance:distance);setActorMoney(s,caster,before-1);
 b.until=s.tick+96;b.seal={area:a.id,object:id,x};b.cargo={issuer:caster.id,holder:p.id,issued:1,remaining:1,delivered:0,walletBefore:before,walletAfter:before-1};
 a.objects.push({id,kind:'returnSeal',name:'Печать ограниченного обещания',x,owner:caster.id,person:p.id,created:s.tick,source:q.body,relic:{...q.price},hp:2,coins:0,state:'charged',hits:[]});
}
function release(s,p,reason,ctx={}){const b=p.returnEpisode.bond;if(!activeReturnBond(p))return;b.state='released';b.release={at:s.tick,reason};const o=returnSeal(s,b);if(o&&o.state==='charged')o.state='dormant';const h=s.actorStates[p.id];if(p.alive&&h)ctx.log?.(actorView(s,h),reason==='fulfilled'?'Монета доставлена к печати. Ограниченное условие выполнено; прежние дела снова свободны.':reason==='seal-broken'?'Настоящая печать разбита. Связь прекратилась; чужая монета не стала наградой.':'Печать утратила поддержку. Связь прекратилась, но прежние вещи не вернулись.','choice');}
export function settleReturnBonds(s,ctx={}){for(const p of Object.values(s.people)){const b=p.returnEpisode?.bond;if(!activeReturnBond(p))continue;const seal=returnSeal(s,b);if(!p.alive){release(s,p,'body-ended',ctx);continue;}if(s.people[b.caster]?.alive===false){release(s,p,'caster-dead',ctx);continue;}if(seal?.hp===0||seal?.state==='broken'){release(s,p,'seal-broken',ctx);continue;}if(b.state==='bound'&&s.tick>=b.until){b.state='expired';b.expired=s.tick;}}}
export function returnBondChoice(s,p){if(!p?.alive||!activeReturnBond(p))return null;const b=p.returnEpisode.bond,h=s.actorStates[p.id],independent=h?h.personality.courage>.8&&h.personality.generosity<.25:p.agenda.duty<.35,breakSeal=b.state==='expired'||s.tick>=b.until||independent;
 return {kind:breakSeal?'returnBondBreak':'returnBondPay',area:b.seal.area,x:b.seal.x,object:b.seal.object,remaining:1};
}
export function returnBondAction(s,p,g,{inTurn=false,ctx={}}={}){const b=p?.returnEpisode?.bond,body=p&&authorityBody(s,p.id),o=b&&returnSeal(s,b);if(!p?.alive||!activeReturnBond(p)||!o||body.transit||body.combat||p.roadTransit||body.area!==b.seal.area||physicalDistance(s.areas[body.area],body.x,o.x)>2||b.lastAction===s.tick||(!body.lineage&&(!inTurn||!canStartNPCActivity(s,p,{inTurn:true})))||(body.lineage?body.energy:p.needs.energy)<2)return false;
 if(g.kind==='returnBondPay'){if(s.tick>=b.until||b.cargo.remaining!==1||o.state!=='charged')return false;b.cargo.remaining=0;b.cargo.delivered=1;o.coins++;b.delivered={at:s.tick,person:p.id,area:body.area,object:o.id,amount:1};release(s,p,'fulfilled',ctx);}
 else if(g.kind==='returnBondBreak'){if(o.hp<=0||!presentParts(p).some(([, ,role])=>['arm','leg','head'].includes(role)))return false;const before=o.hp;o.hp--;o.hits.push({at:s.tick,by:p.id,before,after:o.hp});if(!o.hp){o.state='broken';release(s,p,'seal-broken',ctx);}}
 else return false;b.lastAction=s.tick;if(body.lineage){body.energy-=2;body.lastAction=g.kind==='returnBondPay'?'work':'attack';}else p.needs.energy-=2;g.remaining=0;return true;
}
export function returnBondHeroAttention(s,ctx){const p=s.people[s.hero.lineage],g=returnBondChoice(s,p),h=s.hero;if(!g){if(h.goal?.kind.startsWith('returnBond'))h.goal=null;return false;}if(h.actorMode==='npc'||h.transit||h.combat)return false;if(h.goal?.kind===g.kind&&h.goal.object===g.object)return true;ctx.goal(s,g.kind,g.area,g.x,g.kind==='returnBondPay'?'Исполнить ограниченное условие':'Освободиться от печати',g.kind==='returnBondPay'?'Одна чужая монета зарезервирована для этой печати; другого приза не будет.':'Печать — настоящее уязвимое основание связи.',g);return true;}
export function returnBondHeroAction(s,g,ctx){const ok=returnBondAction(s,s.people[s.hero.lineage],g,{ctx});s.hero.goal=null;return ok;}
export function returnBondNPCTurn(s,p,ctx){const g=returnBondChoice(s,p);if(!g)return false;const b=p.returnEpisode.bond;if(b.lastAction===s.tick)return true;if(p.needs.energy<25)return false;
 if(p.roadTransit||p.fordCrossing||p.liftTransit||p.area!==g.area||physicalDistance(s.areas[p.area],p.x,g.x)>2){const r=walkCampOrder(s,p,g.area,g.x,{...ctx,route:()=>npcKnownRoute(p,p.area,g.area,knownNPCHazards(s,p)),speed:()=>6*woundStride(s,p)},b);if(r==='blocked')return false;p.needs.energy--;b.lastAction=s.tick;return true;}
 return returnBondAction(s,p,g,{inTurn:true,ctx});
}
