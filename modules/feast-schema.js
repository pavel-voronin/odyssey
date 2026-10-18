import {FEAST,feastDate} from './feast-state.js';
export function validateFeasts(s,fail){
 const c=s.localFeast;if(c===undefined)return;const key='localFeast',integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min,tick=n=>integer(n)&&n<=s.tick,object=o=>o&&typeof o==='object'&&!Array.isArray(o);
 if(c?.version!==1||!s.areas[c.area]||!tick(c.adopted)||!integer(c.nextYear)||!Object.hasOwn(c,'edition'))fail(key);
 const e=c.edition;if(e===null)return;
 if(e?.version!==1||e.area!==c.area||!integer(e.year)||c.nextYear!==e.year+1||e.id!==`feast/${e.area}/${e.year}`||!s.people[e.organizer]||!tick(e.created)||e.created<c.adopted||e.created<feastDate(e.year)-FEAST.prepare||e.created>feastDate(e.year)||typeof e.postponed!=='boolean'||e.starts!==feastDate(e.year)+(e.postponed?FEAST.delay:0)||e.ends!==e.starts+FEAST.duration||!['preparing','postponed','active','finished','cancelled'].includes(e.status)||![null,'small','feast'].includes(e.size)||!object(e.invited)||Object.keys(e.invited).length>12||!object(e.lastAction))fail(key+'.edition');
 for(const k of ['food','contributed','eaten','returned','work','spent'])if(!integer(e[k]))fail(key+'.'+k);
 if(e.work>3||e.spent>FEAST.budget||e.food+e.eaten+e.returned!==e.contributed||e.food>FEAST.food)fail(key+'.balance');
 if(['finished','cancelled'].includes(e.status)&&(!tick(e.ended)||typeof e.reason!=='string'||e.food!==0))fail(key+'.ended');
 if(e.opened!==undefined&&(!tick(e.opened)||e.opened<e.starts||e.opened>=e.ends))fail(key+'.opened');
 for(const [id,t]of Object.entries(e.invited)){
  if(!s.people[id]||id===e.organizer||t?.by!==e.organizer||!tick(t.invited)||t.invited<e.created||![null,'declined','help','perform','trade'].includes(t.choice)||!(t.reason===null||typeof t.reason==='string')||!(t.decided===null||tick(t.decided)&&t.decided>=t.invited)||!(t.joined===null||tick(t.joined)&&t.joined>=t.invited)||![0,2].includes(t.paid)||typeof t.gift!=='boolean'||typeof t.speech!=='boolean'||t.paid>0&&t.joined===null||(t.gift||t.speech)&&t.joined===null||t.speech&&t.choice!=='perform')fail(key+'.invitation');
 }
 for(const [id,t]of Object.entries(e.lastAction))if(!s.people[id]||!tick(t)||t<e.created)fail(key+'.lastAction');
}
