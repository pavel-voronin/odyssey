import {enabled} from '../rules.js';
import {presentParts} from './anatomy-state.js';
export const returnsOn=s=>enabled(s,'return-ritual')&&enabled(s,'remains')&&enabled(s,'remains-cycle');
export const returnedBody=(s,b)=>s.people[b?.id||b?.lineage]?.returnEpisode||null;
// An actual new healer can know the rite. No old resident acquires it on load.
export function birthReturnKnowledge(s,p){
 if(!returnsOn(s)||!p.alive||p.role==='ребёнок'||p.agenda?.job!=='healer')return;
 let n=s.seed>>>0;for(const c of 'return:'+p.id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 if(n%23===0)p.returnRite={version:1,learned:s.tick,source:'initial-healer',relic:null,task:null,used:null,lastAction:-1,refusal:null};
}
export function returnReason(s,p,b){const dead=s.people[b?.source.id];return dead&&(p.parents.includes(dead.id)||dead.parents.includes(p.id)||(p.agenda.bonds[dead.id]||0)>=12)?'Вернуть лично близкого человека':null;}
export function returnForm(s,b){const p=s.people[b?.source.id],q=b?.substance;if(!(b?.source.kind==='person'&&p&&!p.enemyBody&&!p.alive&&!p.returnEpisode&&b.death.race==='human'&&!b.carrier&&!b.burialWork&&b.position.kind==='area'&&q?.kind==='organic'&&q.structure.initial>0&&q.structure.remaining>=q.structure.initial*.75))return null;
 if(b.stage==='fresh'&&q.flesh.initial>0&&q.flesh.remaining>=q.flesh.initial*.75)return 'revenant';
 const parts=presentParts(p).map(([id])=>id);return b.stage==='bones'&&q.flesh.remaining===0&&parts.includes('head')&&parts.includes('torso')?'skeleton':null;
}
export const returnSource=(s,b)=>Boolean(returnForm(s,b));
