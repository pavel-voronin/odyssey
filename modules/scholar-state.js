import {artifactTaleRevision} from './artifact-memory.js';
import {materialResearchRevision} from './material-research.js';
import {textsOn} from './text-state.js';
export const scholarOn=s=>textsOn(s);
export const scholarMemory=p=>p.scholarStudy ||= {version:1,comparisons:[],inspections:[],lesson:null,lastActionTick:-1};
export function textWitnesses(s,p){
 const notes=new Map();
 const add=(id,at,mode,known=null)=>{const w=s.literature?.works[id],n=w?.content;if(n?.kind!=='employment-note'||known&&typeof known.available!=='boolean')return;notes.set(id,{id,author:w.author,area:n.area,available:known?known.available:n.available,observed:n.observed,received:at,language:w.language,mode});};
 for(const r of p.textCraft?.readings||[])add(r.content,r.at,'read');
 for(const r of p.literacy?.reports||[])if(!r.partial&&!notes.has(r.content))add(r.content,r.at,'heard',r.known);
 return [...notes.values()];
}
export function witnessVerdict(a,b){return !a||!b||a.area!==b.area||a.id===b.id||a.author===b.author?'insufficient':a.available===b.available?'confirmed':'contradiction';}
export function latestOwnNotice(s,p,area){return Object.values(s.literature?.works||{}).filter(w=>w.author===p.id&&w.content.kind==='employment-note'&&w.content.area===area).sort((a,b)=>b.written-a.written||b.revision-a.revision)[0]||null;}
export const comparisonKey=(a,b)=>[a,b].sort().join('|');
export function scholarRevision(s,g){if(!g.kind.startsWith('scholar'))return null;if(g.kind==='scholarArtifactHear')return artifactTaleRevision(s,g);const p=s.people[s.hero.lineage];return [g.kind==='scholarArtifactHear'?[s.rules['item-originals'],s.rules['witness-news']]:null,p.artifactMemory,g.kind.startsWith('scholarObject')?materialResearchRevision(s,p):null,s.rules.texts,s.rules['skill-branches'],p.scholarStudy,p.skillPractice?.scholar,s.hero.energy>=30,textWitnesses(s,p).map(w=>[w.id,w.received])];}
