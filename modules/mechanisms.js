import {mechanismMemory as memory} from './mechanism-memory.js';
import {newSequence,sequencesOn} from './sequence-memory.js';
import {sequenceOperation,blockedSequencePlan} from './mechanism-sequences.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcAction} from './npc-control.js';
import {partyBodySpent} from './party-combat-policy.js';
import {mechanismKey,grateAt,gateX} from './mechanism-policy.js';
const actor=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
function body(s,p){const h=actor(s,p);return h?(h.transit?null:{area:h.area,x:h.x}):localContact(s,p.id,p.area);}
export function createGrate(s,from,to,bypass,{hold=false,sequence=false}={}){
 if(!enabled(s,'mechanisms')||grateAt(s,from,to)||!s.edges?.[mechanismKey(from,to)]||!s.areas[from]?.links.includes(bypass)||!s.areas[to]?.links.includes(bypass)||grateAt(s,from,bypass)||grateAt(s,to,bypass))return null;
 const key=mechanismKey(from,to),x=gateX(from,to)===100?82:18;
 const g={version:1,id:'grate/'+key,from,to,state:'closed',created:s.tick,changed:s.tick,lever:{id:'lever/'+key,area:from,x},bypass,operations:[]};
 if(sequence&&sequencesOn(s)&&!hold)g.sequence=newSequence(s,g);
 if(hold)g.holding={version:1,person:null};
 s.edges[key].mechanism=g;s.areas[from].objects.push({id:g.lever.id,kind:'mechanismLever',name:'Рычаг решётки',x,key});s.graphRevision=(s.graphRevision||0)+1;return g;
}
export function observeGrate(s,p,from,to){
 const g=grateAt(s,from,to),b=p&&body(s,p),a=b&&s.areas[b.area];
 if(!enabled(s,'mechanisms')||!g||!p.alive||p.needs.sleeping||!b||![g.from,g.to].includes(b.area))return null;
 const other=b.area===g.from?g.to:g.from,lever=b.area===g.lever.area&&a.objects.find(o=>o.id===g.lever.id&&o.kind==='mechanismLever'&&o.key===mechanismKey(from,to));
 if(physicalDistance(a,b.x,lever?.x??gateX(b.area,other))>30)return null;
 const m=memory(p),key=mechanismKey(from,to),old=m.known.find(n=>n.key===key),n={key,state:g.state,at:s.tick,witness:p.id,leverArea:lever?b.area:old?.leverArea??null,understood:old?.understood??false,requiresHold:Boolean(g.holding)};
 if(old?.holdAfter!==undefined)n.holdAfter=old.holdAfter;
 const i=m.known.findIndex(n=>n.key===key);if(i<0)m.known.push(n);else m.known[i]=n;if(m.known.length>24)m.known.shift();return n;
}
export function operateGrate(s,p,key,action='open',ctx={}){
 const g=s.edges?.[key]?.mechanism,b=p&&body(s,p),h=p&&actor(s,p),a=b&&s.areas[b.area],lever=a?.objects.find(o=>o.id===g?.lever.id&&o.kind==='mechanismLever'&&o.key===key),energy=h?.energy??p?.needs?.energy;
 if(!enabled(s,'mechanisms')||!g||!p?.alive||p.needs.sleeping||!b||b.area!==g.lever.area||!lever||physicalDistance(a,b.x,lever.x)>9||partyBodySpent(s,p)||energy<3||!['inspect','open','close'].includes(action)||action!=='inspect'&&g.state===(action==='open'?'open':'closed'))return false;
 if(g.holding&&action!=='inspect')return false;
 if(g.sequence&&!sequencesOn(s))return false;
 if(!h&&!npcAction(s,p,'personal'))return false;
 const n=observeGrate(s,p,g.from,g.to);if(!n)return false;
 if(g.sequence&&sequencesOn(s)&&action!=='close')return sequenceOperation(s,p,g,action,ctx);
 const cost=action==='inspect'?1:2;if(h)h.energy-=cost;else p.needs.energy-=cost;
 memory(p).lastActionTick=s.tick;
 if(action==='inspect')n.understood=true;
 else {g.state=action==='open'?'open':'closed';g.changed=s.tick;g.operations.push({tick:s.tick,person:p.id,state:g.state});if(g.operations.length>8)g.operations.shift();s.graphRevision=(s.graphRevision||0)+1;n.state=g.state;n.understood=true;}
 if(h){h.lastAction='mechanism';h.goal=null;}
 ctx.log?.(s,`${p.name} ${action==='inspect'?'исследует тягу рычага: она ведёт к решётке':action==='open'?'с усилием поднимает решётку рычагом':'опускает решётку рычагом'}.`,'choice');return true;
}
// Called only on a real blocked crossing. Looking is local; using requires a later approach/action.
export function blockedGratePlan(s,to,ctx){
 const h=s.hero,p=s.people[h.lineage],g=grateAt(s,h.area,to),n=observeGrate(s,p,h.area,to);
 if(!n)return false;
 if(g.sequence&&!sequencesOn(s)){s.hero.goal=null;return true;}
 if(g.sequence&&sequencesOn(s)&&n.leverArea===h.area&&h.energy>=35)return blockedSequencePlan(s,p,g,ctx);
 if(!g.holding&&n.leverArea===h.area&&h.energy>=35&&h.personality.curiosity>=.5){
  ctx.goal(s,'mechanism',h.area,g.lever.x,n.understood?'Поднять решётку':'Исследовать рычаг','Видимый рычаг связан с этим проходом. Нужно подойти и потратить отдельное действие.',{key:mechanismKey(h.area,to),operation:n.understood?'open':'inspect'});
 }else {h.goal=null;ctx.log?.(s,'Решётка закрыта. Герой запоминает преграду и ищет известный обход.','plan');}
 return true;
}
export function mechanismAction(s,ctx){const h=s.hero,g=h.goal;if(!g||!operateGrate(s,s.people[h.lineage],g.key,g.operation,ctx))h.goal=null;}
