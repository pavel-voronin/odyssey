import {stealthOn,stealthBody,stealthMemory,guardReady,activeGuard,guardAway,guardSense,seesGuard,walkNoise} from './stealth-state.js';
import {physicalDistance,areaStep,areaScale} from '../geometry.js';
import {recordPracticalStealth} from './skill-branches.js';
const history=(q,s,kind,extra={})=>{q.history.push({at:s.tick,kind,...extra});if(q.history.length>12)q.history.shift();};
export function scanGuardPost(s,p){
 if(s.tick%8||!stealthOn(s)||p.agenda.job!=='guard'||!guardReady(s,p)||p.agenda.task?.kind!=='patrol'||p.agenda.task.target!==p.area||physicalDistance(s.areas[p.area],p.x,p.agenda.task.x)>1)return false;
 if(s.rules['npc-control']!==false&&(p.actionControl?.tick!==s.tick||p.actionControl.owner!=='personal'||!p.actionControl.phases.includes('act')))return false;
 const other=activeGuard(s,p.area);if(other&&other.id!==p.id)return false;
 const q=p.guardWatch ||= {version:1,serial:0,post:null,phaseNo:0,phase:'left',facing:-1,until:0,lastScan:-1,call:null,notices:[],search:null,history:[]};if(q.lastScan===s.tick)return false;
 if(!q.post||q.post.area!==p.area||q.post.x!==p.x){q.post={id:p.id+'/watch-post/'+(++q.serial),guard:p.id,role:'guard',area:p.area,x:p.x,at:s.tick,serial:q.serial};q.phaseNo=0;q.search=null;q.call=null;history(q,s,'posted');}
 q.lastScan=s.tick;q.phase=['left','right','away'][q.phaseNo++%3];if(q.phase!=='away')p.facing=q.facing=q.phase==='left'?-1:1;q.until=s.tick+(q.phase==='away'?16:8);history(q,s,'look',{phase:q.phase,facing:p.facing||q.facing});return true;
}
function rememberGuard(s,p,guard){if(!seesGuard(s,p.id,guard))return;const m=stealthMemory(p),q=guard.guardWatch;let k=m.known.find(k=>k.guard===guard.id);if(!k){k={guard:guard.id,name:guard.name,area:guard.area,x:guard.x,seen:s.tick,sawAway:false,awaySeen:null,post:q.post.id,postSerial:q.post.serial,phase:q.phase};m.known.push(k);if(m.known.length>16)m.known.shift();}if(k.post!==q.post.id)Object.assign(k,{sawAway:false,awaySeen:null,post:q.post.id,postSerial:q.post.serial});Object.assign(k,{area:guard.area,x:guard.x,seen:s.tick,phase:q.phase});if(guardAway(s,q)){k.sawAway=true;k.awaySeen=s.tick;}}
export function noticeGuard(s,guard,id,sense,mode,x){
 const q=guard.guardWatch;if(sense.seen){let n=q.notices.find(n=>n.actor===id);if(!n){n={actor:id,area:guard.area,x,at:s.tick,kind:'seen',answered:null};q.notices.push(n);if(q.notices.length>16)q.notices.shift();}Object.assign(n,{area:guard.area,x,at:s.tick,kind:'seen'});}
 if(['quiet','wait'].includes(mode)&&(sense.seen||sense.heard)){q.call={at:s.tick,area:guard.area,x:guard.x,text:'Кто там?'};q.search={actor:sense.seen?id:null,area:guard.area,x,at:s.tick,until:s.tick+24,steps:0,kind:sense.seen?'seen':'heard'};history(q,s,'suspicion',{actor:sense.seen?id:null,x});}
}
function closePass(s,p,status){const m=p.stealth,a=m?.active;if(!a)return null;const r={...a,status,tick:s.tick,area:a.area,actor:p.id};delete r.knownCaught;m.active=null;m.lastAt=s.tick;m.passes.push(r);if(status==='safe'&&r.risk&&r.quietSteps>=3)recordPracticalStealth(s,p,r);if(m.passes.length>24){const i=m.passes.findIndex(r=>!r.skillCredits?.some(c=>c.branch==='stealth'));m.passes.splice(i<0?2:i,1);}return r;}
export function leaveStealthArea(s,id){if(!stealthOn(s))return;const p=s.people[id];if(p?.stealth?.active)closePass(s,p,'left-area');}
export function commitStealthStep(s,id,from,to,target,quote){
 if(!stealthOn(s))return;const p=s.people[id];if(!p?.alive)return;if(p.stealth?.lastAt===s.tick)return;const b=stealthBody(s,id),area=s.areas[b.area],guard=quote.guard?s.people[quote.guard]:activeGuard(s,b.area),mode=quote.mode||'normal';
 if(p.stealth?.active&&(p.stealth.active.area!==b.area||p.stealth.active.lastX!==from||p.stealth.active.scale!==areaScale(area)))closePass(s,p,'interrupted');
 if(guard?.id===id)return;
 if(!guard?.guardWatch||!guardReady(s,guard)||guard.area!==b.area){if(p.stealth?.active)closePass(s,p,'observer-left');return;}
 const q=guard.guardWatch,post=q.post;if(p.stealth?.active&&p.stealth.active.post!==post.id)closePass(s,p,'post-changed');
 const distance=physicalDistance(area,from,post.x),side=Math.sign(from-post.x),crosses=side&&Math.sign(target-post.x)===-side&&physicalDistance(area,target,post.x)>=8;
 if(!p.stealth?.active&&distance>=8&&distance<=20&&crosses&&(quote.guard||seesGuard(s,id,guard))){const m=stealthMemory(p);m.active={id:p.id+'/quiet-pass/'+(++m.serial),guard:guard.id,post:post.id,postSerial:post.serial,postX:post.x,scale:areaScale(area),area:b.area,started:s.tick,from,side,lastX:from,waits:0,quietSteps:0,risk:false,detected:false,knownCaught:false,trace:[]};}
 if(!p.stealth?.active&&!seesGuard(s,id,guard))return;
 const m=stealthMemory(p);rememberGuard(s,p,guard);m.lastAt=s.tick;m.lastMode=mode;
 if(mode==='greet'){const greeting=guardSense(s,guard,id,to,{noise:4});noticeGuard(s,guard,id,greeting,mode,to);const n=q.notices.find(n=>n.actor===id);if(n)n.answered=s.tick;if(q.search?.actor===id)q.search=null;history(q,s,'answer',{actor:id});if(m.active){if(m.active.trace.length>=16){closePass(s,p,'bounded-end');return;}m.active.knownCaught=false;m.active.detected=true;m.active.risk ||= greeting.seen||greeting.heard;m.active.trace.push({at:s.tick,from,to,mode,risk:greeting.seen||greeting.heard,noise:4,seen:greeting.seen,heard:greeting.heard,light:greeting.light,blocked:greeting.blocked,phase:q.phase,facing:guard.facing||q.facing});}return;}
 const moved=physicalDistance(area,from,to),noise=moved?walkNoise(s,id,moved,mode==='quiet'):0,sense=guardSense(s,guard,id,to,{quiet:mode==='quiet'||mode==='wait',noise}),ordinary=guardSense(s,guard,id,to,{noise:moved?walkNoise(s,id,Math.max(moved,6)):0});noticeGuard(s,guard,id,sense,mode,to);
 const a=m.active;if(!a)return;if(a.trace.length>=16){closePass(s,p,'bounded-end');return;}if(mode==='wait')a.waits++;if(mode==='quiet'&&moved>0)a.quietSteps++;
 a.risk ||= ordinary.seen||ordinary.heard;a.detected ||= sense.seen||sense.heard;if((sense.seen||sense.heard)&&physicalDistance(area,to,guard.x)<=12)a.knownCaught=true;a.lastX=to;
 a.trace.push({at:s.tick,from,to,mode,risk:ordinary.seen||ordinary.heard,noise,seen:sense.seen,heard:sense.heard,light:sense.light,blocked:sense.blocked,phase:q.phase,facing:guard.facing||q.facing});
 if(Math.sign(to-post.x)===-a.side&&physicalDistance(area,to,post.x)>=8)closePass(s,p,a.detected?'noticed':a.quietSteps>=3&&a.risk?'safe':'open');
 else if(physicalDistance(area,to,post.x)>24)closePass(s,p,'withdrew');
}
export function guardSearchTurn(s,p){
 const q=p.guardWatch,n=q?.search;if(s.tick%8||!stealthOn(s)||!n||!guardReady(s,p))return false;
 if(p.area!==n.area||s.tick>=n.until||n.steps>=3){q.search=null;history(q,s,'lost');return false;}
 const a=s.areas[p.area];p.facing=q.facing=Math.sign(n.x-p.x)||p.facing||1;if(physicalDistance(a,p.x,n.x)>1){p.x+=areaStep(a,p.x,n.x,6);const resident=a.objects.find(o=>o.kind==='resident'&&o.person===p.id);if(resident)resident.x=p.x;}
 p.needs.energy=Math.max(0,p.needs.energy-1);n.steps++;history(q,s,'search',{x:n.x,actor:n.actor});return true;
}
