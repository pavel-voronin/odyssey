import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {npcController,canStartNPCActivity,npcAction} from './npc-control.js';
import {watchNote,watchNeedsActive} from './watch-needs.js';

export function beginWatchDuty(s,p,order){
 if(!watchNeedsActive(s))return;
 p.watchDuty={version:1,tick:s.tick,enemy:order.enemy,kind:'waiting',energy:0};
}
export function spendWatchDuty(s,p,kind,energy){
 if(!watchNeedsActive(s)||p.watchDuty?.tick!==s.tick)return;
 p.watchDuty.kind=kind;p.watchDuty.energy=energy;
 if(p.needs)p.needs.energy=Math.max(0,p.needs.energy-energy);
}
export function canHoldWatch(s,p,enemy){
 return watchNeedsActive(s)&&!p.needs?.sleeping&&p.needs.energy>=15&&p.health>=(p.maxHealth||100)*.65&&(p.agenda?.duty??0)>=.85&&physicalDistance(s.areas[p.area],p.x,enemy.x)<=30&&(enemy.attack+2)<p.health*.2;
}
export function relieveWatch(s,p,order,enemy,ctx){
 if(!watchNeedsActive(s)||!enabled(s,'people')||physicalDistance(s.areas[p.area],p.x,enemy.x)>30)return false;
 const known=new Set([...Object.keys(p.agenda?.bonds||{}),...(p.navigation?.contacts||[]).filter(c=>c.missingAt==null&&c.area===p.area).map(c=>c.person)]);
 const q=[...known].map(id=>s.people[id]).find(q=>q?.alive&&q.area===p.area&&q.status==='resident'&&(q.role==='страж'||q.agenda?.job==='guard')&&!q.agenda?.task&&!q.needs?.sleeping&&(q.needs?.energy??100)>=45&&(q.needs?.hunger??0)<65&&q.health>=(q.maxHealth||100)*.8&&(q.agenda?.duty??0)>=.5&&Number.isFinite(q.x)&&physicalDistance(s.areas[q.area],q.x,p.x)<=9&&npcController(s,q)==='personal'&&canStartNPCActivity(s,q)&&(!Number.isFinite(q.attack)||q.attack>0));
 if(!q||(enemy.attack+2)>=q.health*(.2+q.agenda.duty*.2)||!npcAction(s,q,'personal','watch-relief'))return false;
 q.attack ??=3+Math.min(4,Math.floor((q.agenda.work||0)/8));
 beginWatchDuty(s,q,order);spendWatchDuty(s,q,'relief',1);q.watchDuty.partner=p.id;
 p.watchDuty.kind='relieved';p.watchDuty.partner=q.id;
 p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+8;
 q.status='guarding';order.person=q.id;
 watchNote(s,p,`${q.name} принимает пост у ${p.name}. Уставший страж уходит отдыхать; сменщик начнёт бой своим следующим действием.`,ctx,'orders');return true;
}
