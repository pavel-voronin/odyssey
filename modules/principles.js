import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {physicalDistance} from '../geometry.js';
const on=s=>enabled(s,'principles');
export function verifyGuiltPrinciple(s){return s.hero.principles?.verifyGuilt||null;}
export function noticeMisjudgment(s,c){
 if(c.verdictKnowledge?.version===1)return false;
 const h=s.hero;if(!on(s)||!h.alive||h.transit||h.area!==c.source||c.owner!==h.lineage||c.kind!=='mystery'||c.status!=='failed'||c.ended!==s.tick||!c.verdict||c.verdict===c.culprit||!s.storyCases.includes(c))return false;
 const source={id:`${c.id}/verdict/${c.ended}`,case:c.id,tick:c.ended,area:c.source,person:c.verdict,name:s.people[c.verdict]?.name||'Обвинённый'};
 const old=verifyGuiltPrinciple(s);if(old?.lastSourceTick>=source.tick||old?.sources.some(e=>e.id===source.id))return false;
 const p=(h.principles ||= {}).verifyGuilt ||= {id:'verify-guilt',status:'pending',remaining:3,sources:[]};p.sources.push(source);if(p.sources.length>8)p.sources.shift();p.lastSourceTick=source.tick;
 if(p.status!=='adopted'){p.status='pending';p.remaining=3;}return true;
}
export function noticeKnownMisjudgment(s,source){
 const h=s.hero;if(!on(s)||!h.alive||h.transit||!['record','report'].includes(source.kind)||source.learnedAt>s.tick||source.known?.exonerates!==source.person||source.known.pointsTo===source.person)return false;
 const stored=h.verdictMemory?.cases.find(e=>e.case===source.case)?.sources.find(e=>e.id===source.id);if(stored!==source)return false;
 const old=verifyGuiltPrinciple(s);if(old?.sources.some(e=>e.id===source.id)||old?.lastSourceTick>=source.learnedAt)return false;
 const p=(h.principles ||= {}).verifyGuilt ||= {id:'verify-guilt',status:'pending',remaining:3,sources:[]};p.sources.push({...source,known:{...source.known}});if(p.sources.length>8)p.sources.shift();p.lastSourceTick=source.learnedAt;
 if(p.status!=='adopted'){p.status='pending';p.remaining=3;}return true;
}
function dangerNow(s){const h=s.hero,a=s.areas[h.area];return h.hp<h.maxHp*.3||Boolean(a?.objects.some(e=>e.kind==='enemy'&&e.alive&&physicalDistance(a,h.x,e.x)<=12&&e.attack>=h.hp*.5));}
export function principlePlan(s,ctx){
 const h=s.hero,p=verifyGuiltPrinciple(s);if(!on(s)||p?.status!=='pending'||h.goal||h.combat||h.transit||h.hp<h.maxHp*.75||h.energy<35||dangerNow(s))return false;
 if(h.personality.curiosity+h.personality.generosity<1.15){p.status='rejected';p.considered=s.tick;ctx.log(s,'Он не делает из одного разбирательства правила на всю жизнь. Прежний взгляд остаётся.','thought');return false;}
 ctx.goal(s,'principleReflect',h.area,h.x,p.sources.at(-1)?.kind==='report'?'Обдумать сведения о приговоре':'Обдумать ошибочный приговор',p.sources.at(-1)?.kind==='report'?'Ему сообщили сведения против прежнего приговора. Хочет понять, как проверять обвинения внимательнее.':'Он лично узнал, что осудил невиновного. Хочет понять, как проверять обвинения внимательнее.',{principle:p.id});return true;
}
export function reflectPrinciple(s,ctx){
 const h=s.hero,p=verifyGuiltPrinciple(s);if(!on(s)||p?.status!=='pending'||h.goal?.kind!=='principleReflect'){h.goal=null;return false;}
 if(h.hp<h.maxHp*.6||h.energy<10||dangerNow(s)){h.goal=null;return false;}
 p.remaining--;h.energy=Math.max(0,h.energy-1);h.lastAction='think';h.speech='Одного следа мало, чтобы решить чужую судьбу.';
 if(p.remaining<=0){p.status='adopted';p.adopted=s.tick;h.goal=null;ctx.log(s,(p.sources.at(-1)?.kind==='report'?'После услышанного о приговоре':'После ошибочного приговора')+' он принимает личный принцип: чужую вину нужно проверять. В следующем разбирательстве постарается найти вторую доступную улику.','thought');}return true;
}
export function principledClue(s,c,ctx){
 if(!on(s)||verifyGuiltPrinciple(s)?.status!=='adopted'||dangerNow(s)||c.owner!==s.hero.lineage||c.evidence.length<1)return null;
 return c.clues.find(clue=>{if(clue.found||c.verdictKnowledge?.version===1&&clue.unavailableAt!==undefined||!knownArea(s,clue.area))return false;const route=ctx.knownRoute||ctx.route;return route?route(s,s.hero.area,clue.area).length>0:clue.area===s.hero.area;})||null;
}
