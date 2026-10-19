import {stateKey} from './action-selection.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {canStartNPCActivity,npcAction,npcController} from './npc-control.js';
import {partyBodySpent} from './party-combat-policy.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
const memory=h=>h.actionSelection ||= {version:1,deferred:[],attempts:[],last:null};
function topic(s){const h=s.hero;return h.quests.find(q=>q.status==='active')?.target||h.actionSelection?.deferred.at(-1)?.area||h.area;}
const source=p=>stateKey([p.navigation?.roads.map(r=>r.key),p.navigation?.places.map(v=>[v.area,v.hazardUntil||0]),p.agenda?.sociability,p.agenda?.bonds]);
function inspectionBasis(s){const h=s.hero,a=s.areas[h.area];return stateKey([a.links,h.atlas.roads.filter(k=>k.split('|').includes(h.area)),h.navigationMemory?.blockers.filter(r=>r.area===h.area).map(r=>[r.id,r.knownAnchor,r.knownBypass])]);}
function contacts(s){const h=s.hero,a=s.areas[h.area],ids=[...new Set([...(a.population||[]),...a.objects.map(o=>o.person).filter(Boolean),...h.companions.map(c=>c.person)])];return ids.slice(0,32).map(id=>localContact(s,id,h.area)).filter(b=>b&&b.person.id!==h.lineage&&b.person.role!=='ребёнок'&&b.person.agenda?.job!=='student'&&b.person.alive&&!b.person.needs?.sleeping&&!b.person.agenda?.task&&physicalDistance(a,h.x,b.x)<=24&&!partyBodySpent(s,b.person)&&canStartNPCActivity(s,b.person)&&['personal','party'].includes(npcController(s,b.person)));}
export function routeOpportunityPlan(s,ctx){
 const h=s.hero;if(!h.actionSelection?.deferred.length)return false;const m=memory(h),t=topic(s);
 if(enabled(s,'npc-knowledge')&&enabled(s,'npc-contacts'))for(const b of contacts(s)){const p=b.person,sig=source(p);if(m.questions?.some(e=>e.person===p.id&&e.topic===t&&e.signature===sig))continue;ctx.goal(s,'directionAsk',h.area,b.x,'Спросить о доступном направлении','Можно добровольно спросить присутствующего человека; ответ ограничен его личным знанием.',{person:p.id,topic:t});return true;}
 const basis=inspectionBasis(s);
 if(!m.inspections?.some(e=>e.area===h.area&&e.signature===basis)){ctx.goal(s,'directionInspect',h.area,h.x<50?5:95,'Осмотреть знакомый выход','Один местный осмотр может уточнить соседство; дальняя карта от него не открывается.',{basis});return true;}
 return false;
}
export function routeOpportunityAction(s,g,ctx){
 const h=s.hero,m=memory(h);if(g.kind==='directionInspect'){
  ctx.observeLocalRoutes(s);m.inspections ||= [];m.inspections.push({area:h.area,signature:inspectionBasis(s),at:s.tick});if(m.inspections.length>8)m.inspections.shift();h.energy=Math.max(0,h.energy-1);h.lastAction='look';h.goal=null;ctx.log(s,'Герой осматривает настоящий выход. Запоминает только видимое соседство; дальнего пути это ещё не обещает.','knowledge');return true;
 }
 const b=localContact(s,g.person,h.area),p=b?.person;if(!b||!contacts(s).some(v=>v.person.id===p.id)||physicalDistance(s.areas[h.area],h.x,b.x)>3)return false;
 const signature=source(p);if(m.questions?.some(e=>e.person===p.id&&e.topic===g.topic&&e.signature===signature))return false;
 if(!npcAction(s,p,npcController(s,p),'direction-talk'))return false;
 p.directionTalkTick=s.tick;p.needs.energy=Math.max(0,p.needs.energy-1);h.energy=Math.max(0,h.energy-1);h.lastAction='talk';
 const willing=(p.agenda?.sociability??.5)>=.25&&(p.agenda?.bonds?.[h.lineage]||0)>-20;
 // At most two connected personally known roads, preferring the asked place.
 const nav=p.navigation,front=new Set([h.area]),roads=[],places=[];
 const path=willing&&nav?npcKnownRoute(p,h.area,g.topic,knownNPCHazards(s,p)):[];
 if(willing)for(let i=0;i<2;i++){const choices=(nav?.roads||[]).filter(r=>front.has(r.from)!==front.has(r.to)&&!roads.some(v=>v.key===r.key)).sort((a,b)=>a.key.localeCompare(b.key));const key=path[i+1]&&[path[i],path[i+1]].sort().join('|'),r=choices.find(r=>r.key===key)||choices[0];if(!r)break;const other=front.has(r.from)?r.to:r.from,v=nav.places.find(v=>v.area===other);if(!v||!s.areas[other])break;roads.push({...r});places.push({...v});front.add(other);}
 for(const v of places){if(!h.atlas.known.includes(v.area))h.atlas.known.push(v.area);if(v.hazardUntil>s.tick)h.memory.avoided[v.area]=Math.max(h.memory.avoided[v.area]||0,v.hazardUntil);}
 for(const r of roads)if(!h.atlas.roads.includes(r.key))h.atlas.roads.push(r.key);
 m.questions ||= [];const outcome=!willing?'refused':roads.length?'directions':'unknown';m.questions.push({person:p.id,topic:g.topic,signature,at:s.tick,outcome,roads:roads.map(r=>({key:r.key,from:r.from,to:r.to,seen:r.seen})),places:places.map(v=>({area:v.area,name:v.name,seen:v.seen,...(v.hazardUntil?{hazardUntil:v.hazardUntil}:{})}))});if(m.questions.length>8)m.questions.shift();h.goal=null;
 ctx.log(s,p.name+(outcome==='refused'?' не хочет обсуждать дорогу.':outcome==='unknown'?' не знает подходящего направления.':' делится не более чем двумя известными ему участками дороги. Это сведения с его прежней встречи, а не обещание свободного прохода.'),'knowledge');return true;
}
