import {titleLaw} from './title-state.js';
import {makeEstateLaw} from './will-records.js';
import {authoritiesOn,authorityKey} from './authority-state.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {setActorMoney} from '../actor-projection.js';
import {physicalDistance} from '../geometry.js';
function path(s,from,to){const queue=[[from]],seen=new Set([from]);for(let i=0;i<queue.length;i++){const p=queue[i];if(p.at(-1)===to)return p;for(const next of s.areas[p.at(-1)].links){if(seen.has(next)||s.edges[authorityKey(p.at(-1),next)]?.mode!=='road')continue;seen.add(next);queue.push([...p,next]);}}return [];}
export function borderCandidate(s){const q=s.authorities,states=Object.values(q?.byId||{}),state=states[1];if(!authoritiesOn(s)||q?.border||!state||s.areas[state.treasuryArea].civic.treasury<3||path(s,states[0].capital,state.capital).length<2)return null;return Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='guard'&&p.agenda.duty>=.35&&!p.agenda.task&&p.area===state.capital&&physicalDistance(s.areas[p.area],p.x,42)<=12&&p.health>=(p.maxHealth||100)*.6&&p.needs.energy>=35&&!p.needs.sleeping&&!p.ailment&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p))||null;}
export function establishAuthority(s,area,ruler,{origin='council-action'}={}){
 if(!authoritiesOn(s))return null;const a=s.areas[s.areas[area]?.city||area],p=s.people[ruler];if(!a?.civic||!p?.alive||p.area!==a.id||a.civic.ruler&&a.civic.ruler!==p.id||a.authority||Object.keys(s.authorities?.byId||{}).length>=2)return null;
 const q=s.authorities ||= {version:1,byId:{},border:null},id='authority/'+a.id,territory=Object.values(s.areas).filter(b=>b.id===a.id||b.city===a.id).map(b=>b.id);
 const state={version:1,id,name:'Вольный совет · '+a.name,capital:a.id,territory,ruler:p.id,treasuryArea:a.id,created:s.tick,origin,law:{version:1,id:id+'/entry-law/1',since:s.tick,fee:3,workAllowed:true,workRequired:3}};
 if(s.rules['title-enforcement']!==false)state.titleLaw=titleLaw(state,p.id,s.tick);
 if(s.rules.testaments!==false)state.estateLaw=makeEstateLaw(state,p.id,s.tick,'charter');
 q.byId[id]=state;a.civic.ruler=p.id;for(const id of territory)s.areas[id].authority=state.id;return state;
}
function hire(s,b,p,{initial=false}={}){
 const state=s.authorities.byId[b.receiver],a=s.areas[state.treasuryArea];if(a.civic.treasury<3||!p?.alive||p.agenda?.job!=='guard'||p.needs.sleeping||p.ailment||p.agenda.duty<.35||p.health<(p.maxHealth||100)*.6||p.needs.energy<35)return false;
 if(!initial&&(npcController(s,p)!=='personal'||!canStartNPCActivity(s,p)||p.agenda.task||p.area!==state.capital||physicalDistance(s.areas[p.area],p.x,42)>12||!npcAction(s,p,'personal')))return false;
 const before=a.civic.treasury,wallet=p.agenda.wealth;a.civic.treasury-=3;setActorMoney(s,p,wallet+3);p.borderDuty={version:1,edge:b.edge,issuer:state.id,active:true,since:s.tick,until:s.tick+240,idleAt:-1,servicedAt:-1,payments:[{at:s.tick,before,after:before-3,walletBefore:wallet,walletAfter:wallet+3,paid:3}]};b.guard=p.id;
 p.agenda.task={kind:'borderWatch',target:b.from,x:b.x,remaining:1};p.agenda.due=s.tick;
 if(initial){const old=s.areas[p.area];if(old.population)old.population=old.population.filter(id=>id!==p.id);old.objects=old.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);p.area=b.from;p.x=b.x;p.status='resident';const a=s.areas[p.area];a.population ||= [];a.population.push(p.id);a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});}else p.status='wandering';return true;
}
export function establishBorder(s,{initial=false}={}){
 const q=s.authorities;if(!authoritiesOn(s)||!q||q.border||Object.values(q.byId).length<2)return null;
 const [a,b]=Object.values(q.byId).slice(0,2),route=path(s,a.capital,b.capital);if(route.length<2)return null;
 const from=route.at(-2),to=b.capital,edge=authorityKey(from,to);if(s.areas[from].authority&&s.areas[from].authority!==a.id)return null;
 const guard=Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='guard'&&p.agenda.duty>=.35&&(!initial?p.area===b.capital&&!p.agenda.task:!s.actorStates[p.id]));if(!guard)return null;
 const post={version:1,edge,from,to,x:Number(to.slice(1))>Number(from.slice(1))?100:0,receiver:b.id,law:b.law.id,guard:null,created:s.tick,crossings:0,maintenance:{initial:6,remaining:6,done:0,overflow:0}};
 if(!hire(s,post,guard,{initial}))return null;q.border=post;
 for(const id of route.slice(0,-1))if(!s.areas[id].authority){s.areas[id].authority=a.id;a.territory.push(id);}
 s.areas[from].objects.push({id:'border/'+edge,kind:'borderPost',name:'Пограничный пост · '+b.name,x:post.x,borderPost:{version:1,edge,receiver:b.id,law:b.law.id,created:s.tick}});return post;
}
export function initializeAuthorities(s){
 if(!authoritiesOn(s)||s.authorities||s.hero||s.observation||s.tick!==0||!s.geographyFrame)return false;
 const ids=['capital','village-west'].map(k=>s.geographyFrame.sites[k]?.area);if(ids.some(id=>!s.areas[id]?.civic))return false;
 const rulers=ids.map(id=>s.areas[id].population.map(id=>s.people[id]).find(p=>p?.alive&&p.role!=='ребёнок'&&p.area===id&&p.agenda?.job!=='guard'));
 if(rulers.some(p=>!p)||rulers[0]===rulers[1])return false;
 for(let i=0;i<2;i++)establishAuthority(s,ids[i],rulers[i].id,{origin:'world-origin'});establishBorder(s,{initial:true});return true;
}
export function borderDutyTurn(s,p){
 const d=p.borderDuty,b=s.authorities?.border;if(!authoritiesOn(s)||!d?.active||!b||d.edge!==b.edge)return false;
 if(s.tick>=d.until){const state=s.authorities.byId[d.issuer],a=s.areas[state.treasuryArea];if(a.civic.treasury<3||p.agenda.duty<.35||p.area!==b.from){d.active=false;if(p.agenda.task?.kind==='borderWatch')p.agenda.task=null;return false;}
  const before=a.civic.treasury,wallet=p.agenda.wealth;a.civic.treasury-=3;setActorMoney(s,p,wallet+3);d.payments.push({at:s.tick,before,after:before-3,walletBefore:wallet,walletAfter:wallet+3,paid:3});if(d.payments.length>8)d.payments.shift();d.until=s.tick+240;return true;
 }
 if(p.area===b.from&&physicalDistance(s.areas[b.from],p.x,b.x)<=1){d.idleAt=s.tick;p.status='resident';p.agenda.task={kind:'borderWatch',target:b.from,x:b.x,remaining:1};return true;}
 if(!p.agenda.task||p.agenda.task.kind==='borderWatch'){p.agenda.task={kind:'borderWatch',target:b.from,x:b.x,remaining:1};p.status='wandering';}return false;
}
