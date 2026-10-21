import {publishMasteryNews} from './progression-news.js';
import {profession} from '../content.js';
import {enabled} from '../rules.js';

export const LEVEL_CAP=12;
// Provisional budgets, not measured lifetime medians. One career unit is one
// executed work phase. Existing saves have no compatible weighted effort data.
export const DEVELOPMENT_REFERENCE={general:1600,career:4800};
export const effectiveLevel=value=>Math.max(1,Math.min(LEVEL_CAP,Math.floor(Number.isFinite(value)?value:1)));
export const heroLevel=h=>effectiveLevel(h.level);
export const careerRank=h=>effectiveLevel(h.career?.rank);
export const developmentThreshold=(level,kind='general')=>DEVELOPMENT_REFERENCE[kind]*(1.8**(effectiveLevel(level)-1)-1)/(1.8**7-1);
export function effortRank(effort,kind='general'){let rank=1;while(rank<LEVEL_CAP&&effort>=developmentThreshold(rank+1,kind))rank++;return rank;}
export const CAREER_FAMILIES={harvest:1,song:1,repair:1,medicine:1,records:1,market:1,dock:1,patrol:1,rawGather:1,'combat-melee':2,'combat-magic':2,'repair-building':2};
const actor=(s,id)=>s.hero?.lineage===id?s.hero:s.actorStates?.[id];
const role=(s,p)=>actor(s,p.id)?.profession||'npc-'+(p.agenda?.job||'farmer');
function ledger(s,p){return p.professionalDevelopment ||= {version:1,started:s.tick,general:null,careers:{},budget:{at:-1,used:0},receipts:[],achievements:[]};}
function scale(rawRank,rawXp,kind,at){const rank=effectiveLevel(rawRank),floor=developmentThreshold(rank,kind),next=developmentThreshold(Math.min(LEVEL_CAP,rank+1),kind),oldThreshold=rank*(kind==='career'?18:24);return {anchor:{rank:rawRank??1,xp:rawXp||0,at},base:floor+(next-floor)*Math.min(.999,Math.max(0,(rawXp||0)/oldThreshold)),earned:0,rank,families:{},causes:{}};}
export const careerFamilyCapacity=family=>DEVELOPMENT_REFERENCE.career*(1.4+.2*(CAREER_FAMILIES[family]-1));
export function validateProgression(s,fail){
 const finite=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER,time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 for(const p of Object.values(s.people)){
  const r=p.professionalDevelopment;if(!r)continue;
  if(r.version!==1||!time(r.started)||!r.careers||!r.budget||!Number.isInteger(r.budget.at)||r.budget.at< -1||r.budget.at>s.tick||!finite(r.budget.used)||r.budget.used>1||!Array.isArray(r.receipts)||r.receipts.length>32||!Array.isArray(r.achievements))fail(p.id+'.professionalDevelopment');
  for(const [kind,q]of [['general',r.general],...Object.values(r.careers).map(q=>['career',q])]){
   if(!q)continue;
   if(!q.anchor||!time(q.anchor.at)||!finite(q.anchor.rank)||!finite(q.anchor.xp)||!finite(q.base)||!finite(q.earned)||!Number.isInteger(q.rank)||q.rank<1||q.rank>12||!q.families||!q.causes||Object.values(q.causes).some(at=>!time(at)))fail(p.id+'.progressionScale');
   if(kind==='career'&&(Object.entries(q.families).some(([id,value])=>!CAREER_FAMILIES[id]||!finite(value)||value>careerFamilyCapacity(id)+1e-6)||Math.abs(Object.values(q.families).reduce((a,b)=>a+b,0)-q.earned)>1e-6))fail(p.id+'.careerEffort');
  }
  for(const v of r.receipts)if(!time(v.at)||typeof v.profession!=='string'||!CAREER_FAMILIES[v.family]||typeof v.cause!=='string'||!finite(v.work)||v.work<=0||v.work>1||!finite(v.gain)||v.gain>v.work)fail(p.id+'.careerReceipt');
  const keys=new Set();for(const v of r.achievements){const key=v.kind+'/'+v.profession;if(!['general','career'].includes(v.kind)||v.rank!==12||!time(v.at)||v.person!==p.id||!s.areas[v.area]||v.scope!=='personal-record'||keys.has(key))fail(p.id+'.developmentAchievement');keys.add(key);}
 }
}
export function progressionScale(s,id,kind='general',profession=null){const p=s.people[id],h=actor(s,id),r=p?.professionalDevelopment,key=profession||p&&role(s,p);return kind==='career'?r?.careers[key]||null:r?.general||null;}
export function progressionMeasure(s,id,kind='general',profession=null){const p=s.people[id],h=actor(s,id),q=progressionScale(s,id,kind,profession),stored=kind==='career'?(profession&&profession!==h?.profession?h?.career?.records?.[profession]?.rank:h?.career?.rank):h?.level,rank=effectiveLevel(Math.max(stored||1,q?.rank||1)),base=developmentThreshold(rank,kind),next=developmentThreshold(Math.min(LEVEL_CAP,rank+1),kind),effort=q?Math.max(base,q.base+q.earned):scale(stored||1,kind==='career'?h?.career?.xp:h?.xp,kind,s.tick).base;return {rank,cap:LEVEL_CAP,effort,earned:q?.earned||0,current:Math.max(0,effort-base),threshold:Math.max(0,next-base),capped:rank===LEVEL_CAP,provisional:true};}
function achievement(s,p,r,kind,key,rank){if(rank!==LEVEL_CAP||r.achievements.some(a=>a.kind===kind&&a.profession===key))return;const event={kind,profession:key,rank,at:s.tick,person:p.id,area:actor(s,p.id)?.area||p.area,scope:'personal-record'};r.achievements.push(event);publishMasteryNews(s,p,event);}
// General development has its own real result identity. It never calls career
// awards, and a career award never calls this function.
export function creditGeneral(s,amount,cause){const h=s.hero,p=s.people[h.lineage];if(!p?.alive||!Number.isFinite(amount)||amount<=0||typeof cause!=='string'||!cause)return null;const r=ledger(s,p),q=r.general ||= scale(h.level,h.xp,'general',s.tick);if(Object.hasOwn(q.causes,cause))return null;q.causes[cause]=s.tick;q.earned=Math.min(Number.MAX_SAFE_INTEGER,q.earned+amount);const before=Math.max(heroLevel(h),q.rank),rank=Math.max(before,effortRank(q.base+q.earned));q.rank=rank;if(before<12)achievement(s,p,r,'general',null,rank);return {before,rank,gained:rank-before,cause};}
export function creditCareer(s,id,family,{cause,budget=1}={}){const p=s.people[id],difficulty=CAREER_FAMILIES[family];if(!enabled(s,'identity')||!p?.alive||!difficulty||typeof cause!=='string'||!cause||!Number.isFinite(budget)||budget<=0)return null;const h=actor(s,id),key=role(s,p),r=ledger(s,p),q=r.careers[key] ||= scale(h?.career?.rank,h?.career?.xp,'career',s.tick);if(r.budget.at>s.tick||Object.hasOwn(q.causes,cause))return null;if(r.budget.at!==s.tick)r.budget={at:s.tick,used:0};const work=Math.min(1-r.budget.used,budget);if(work<=0)return null;r.budget.used+=work;q.causes[cause]=s.tick;const prior=q.families[family]||0,capacity=careerFamilyCapacity(family),gain=Math.max(0,Math.min(capacity-prior,work*Math.max(0,1-prior/capacity)));q.families[family]=prior+gain;q.earned=Math.min(Number.MAX_SAFE_INTEGER,q.earned+gain);const before=Math.max(effectiveLevel(h?.career?.rank),q.rank),rank=Math.max(before,effortRank(q.base+q.earned,'career'));q.rank=rank;if(h?.career){if(h.career.rank<rank)h.career.rank=rank;h.career.records ||= {};h.career.records[key]={xp:h.career.xp,rank:h.career.rank};}const stats=h?.stats||p.stats,profile=profession(key);if(stats&&profile)for(let n=before;n<rank;n++){const stat=['might','wit','guile','luck','spirit'][profile.stats.indexOf(Math.max(...profile.stats))];stats[stat]++;}r.receipts.push({at:s.tick,profession:key,family,cause,work,gain});if(r.receipts.length>32)r.receipts.shift();if(before<12)achievement(s,p,r,'career',key,rank);return {before,rank,gained:rank-before,work,gain,profession:key};}
