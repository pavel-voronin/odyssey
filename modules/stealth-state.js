import {acceptedServiceRole} from './service-mask-state.js';
import {enabled} from '../rules.js';
import {calendar} from '../calendar.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {npcController} from './npc-control.js';
import {rayHeight} from './position-state.js';
import {packView} from './container-state.js';
import {stat} from './common.js';
import {knowsPracticalMethod} from './skill-branches.js';
export const stealthOn=s=>enabled(s,'stealth')&&enabled(s,'people');
export function stealthBody(s,id){const h=s.hero.lineage===id?s.hero:s.actorStates?.[id];return selfDrivenActor(s,h)?h:s.people[id];}
export const stealthMemory=p=>p.stealth ||= {version:1,serial:0,known:[],active:null,passes:[],lesson:null,lastAt:-1,lastMode:'normal'};
export function guardReady(s,p){return Boolean(p?.alive&&p.agenda?.job==='guard'&&['resident','wandering'].includes(p.status)&&p.area&&s.areas[p.area]&&!p.needs.sleeping&&!p.ailment&&p.needs.energy>=20&&p.health>=(p.maxHealth||100)*.6&&npcController(s,p)==='personal'&&!p.roadTransit&&!p.liftTransit&&!p.fordCrossing);}
export function activeGuard(s,area){return Object.values(s.people).filter(p=>p.guardWatch?.post?.area===area&&p.area===area&&guardReady(s,p)&&physicalDistance(s.areas[area],p.x,p.guardWatch.post.x)<=24).sort((a,b)=>a.guardWatch.post.at-b.guardWatch.post.at||a.id.localeCompare(b.id))[0]||null;}
export const guardAway=(s,q)=>q.phase==='away'&&s.tick<q.until&&!q.search;
export function logicalLight(s,a,x,h=null){
 if(h?.conditions?.some(c=>c.id==='blessing'&&c.until>s.tick))return 'lit';
 if(a.type==='camp'&&a.objects.some(o=>o.kind==='rest'&&physicalDistance(a,x,o.x)<=8))return 'lit';
 if(a.objects.some(o=>o.kind==='gate'&&['portal','time'].includes(o.mode)&&physicalDistance(a,x,o.x)<=8))return 'lit';
 return a.realm==='underground'||['cave','dungeon'].includes(a.type)||calendar(s.tick).night?'dark':'day';
}
export function sightBarrier(a,from,to,{quiet=false}={}){return a.objects.find(o=>o.kind==='stoneCover'&&o.stoneCover?.version===1&&rayHeight(from,to,32,quiet?18:32,o.x)<=o.stoneCover.height)||null;}
export function guardSense(s,p,id,x,{quiet=false,noise=0}={}){
 const b=stealthBody(s,id),a=s.areas[p.area],q=p.guardWatch;if(!stealthOn(s)||!q||p.id===id||!guardReady(s,p)||b?.area!==p.area)return {seen:false,heard:false,blocked:null,light:'dark',noise,distance:null};
 const distance=physicalDistance(a,p.x,x),light=logicalLight(s,a,x,b),blocked=sightBarrier(a,p.x,x,{quiet}),front=(x-p.x)*(p.facing||q.facing||1)>=0,guile=b.lineage?stat(b,'guile'):2,range=(light==='dark'?9:24)*(quiet?Math.max(.4,.65-Math.min(5,guile)*.04):1);
 return {seen:!(s.rules['noise-decoys']!==false&&q.search?.source&&s.tick<q.search.focusUntil&&physicalDistance(a,x,q.search.x)>2)&&!guardAway(s,q)&&front&&!blocked&&distance<=range,heard:noise>=1.2+distance*.3,blocked:blocked?.id??null,light,noise,distance};
}
export function seesGuard(s,id,p){const b=stealthBody(s,id),a=b&&s.areas[b.area];return Boolean(b?.area===p?.area&&guardReady(s,p)&&physicalDistance(a,b.x,p.x)<=(logicalLight(s,a,p.x)==='dark'?12:24)&&!sightBarrier(a,b.x,p.x));}
export function walkNoise(s,id,distance,quiet=false){const b=stealthBody(s,id),guile=b.lineage?stat(b,'guile'):2;return Math.max(.1,distance*(quiet?.25:.9)+packView(s,id).used/16-(quiet?Math.min(1,guile*.15):0));}
export function stealthWalkQuote(s,id,target,{mounted=false}={}){
 const p=s.people[id],b=stealthBody(s,id);if(!stealthOn(s)||!p?.alive||!b||mounted)return {mode:'normal',factor:1,guard:null};const guard=activeGuard(s,b.area),known=guard&&p.stealth?.known.find(k=>k.guard===guard.id&&k.area===b.area&&k.post===guard.guardWatch.post.id),visible=guard&&seesGuard(s,id,guard);if(!guard||guard.id===id||!visible&&!known)return {mode:'normal',factor:1,guard:null};
 const post=guard.guardWatch.post,distance=physicalDistance(s.areas[b.area],b.x,post.x),crosses=(target-post.x)*(b.x-post.x)<0&&physicalDistance(s.areas[b.area],target,post.x)>=8;if(distance>20||!crosses&&!p.stealth?.active)return {mode:'normal',factor:1,guard:guard.id};
 const notice=guard.guardWatch.notices.find(n=>n.actor===id),courage=b.lineage?b.personality.courage:1-(p.agenda.duty||0),cautious=courage<.5,active=p.stealth?.active;
 if(acceptedServiceRole(s,guard,id))return {mode:'normal',factor:1,guard:guard.id};
 if(visible&&notice&&!notice.answered&&physicalDistance(s.areas[b.area],b.x,guard.x)<=6)return {mode:'greet',factor:0,guard:guard.id};
 if(!cautious||active?.knownCaught)return {mode:'normal',factor:1,guard:guard.id};
 const away=visible&&guardAway(s,guard.guardWatch),quietSafe=!guardSense(s,guard,id,b.x,{quiet:true}).seen;
 if(visible&&!away&&known?.sawAway&&knowsPracticalMethod(s,id,'stealth')&&quietSafe&&distance>=8&&(active?.waits||0)<8)return {mode:'wait',factor:0,guard:guard.id};
 return away||!visible||quietSafe||logicalLight(s,s.areas[b.area],b.x,b)==='dark'?{mode:'quiet',factor:.5,guard:guard.id}:{mode:'normal',factor:1,guard:guard.id};
}
export function stealthRevision(s,g){if(g.kind!=='stealthLesson')return null;return [s.rules.stealth,s.rules['skill-branches'],s.people[s.hero.lineage].stealth,s.people[s.hero.lineage].skillPractice?.stealth];}
