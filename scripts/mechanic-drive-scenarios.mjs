import {createWorld,connectAreas,serialize} from '../engine.js';import {MODULES} from '../rules.js';import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {createLift,workLift} from '../modules/lifts.js';import {admitLift} from '../modules/lift-policy.js';import {tradeGoods} from '../modules/market.js';
export const driveContext={log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,intent,reason,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;}};
export function driveFixture(){
 const flags=['mechanisms','travel','people','districts','origins','birthplaces','identity','npc-control','skill-branches','equipment','item-originals','goods-cycle','local-market'];const s=createWorld(4,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,from='a1',to='a2',bypass='a3';
 for(const [a,b]of [[from,to],[from,bypass],[to,bypass]])connectAreas(s,a,b);const n=createLift(s,from,to,bypass),p=s.people[h.lineage];if(!n)throw Error('No actual lift constructor');Object.assign(h,{area:from,x:n.console.x,profession:'clockmaker',energy:100,hunger:0,hp:h.maxHp,goal:null,combat:null,transit:null,companions:[],quests:[]});h.inventory.relics=3;h.stories.active=null;h.destiny.completed=true;h.personality.curiosity=.9;setActorMoney(s,p,100);
 for(const e of s.areas[from].objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 const master=Object.values(s.people).find(q=>q.id!==p.id&&q.alive&&q.agenda?.job==='artisan');if(!master)throw Error('No actual artisan');Object.assign(master,{area:from,x:n.console.x,health:master.maxHealth||100,status:'resident'});Object.assign(master.needs,{energy:100,hunger:0,sleeping:false});Object.assign(master.agenda,{task:null,due:100000,wealth:100,sociability:.8});
 const f={s,h,p,n,master,key:[from,to].sort().join('|'),from,to,bypass};syncActiveActor(s);return f;
}
export function buyDriveMaterial(f,worker=f.master){const b=worker.id===f.h.lineage?f.h:worker,area=b.area,x=b.x;const provider=Object.values(f.s.areas).find(a=>a.civic?.tools>1);if(!provider)throw Error('No finite provider');b.area=provider.id;b.x=58;const count=worker.marketCargo?.tools||0;f.s.tick++;const q=tradeGoods(f.s,provider,worker.id,'tools','buy',1);b.area=area;b.x=x;if(q.quantity!==1||worker.marketCargo.tools!==count+1)throw Error('No finite paid drive material');return f;}
export function jamDrive(f){
 const {s,h,n}=f;s.tick++;if(!workLift(s,f.p,f.key,'fuel',driveContext))throw Error('No actual relic fuel');const people=Object.values(s.people).filter(p=>p.id!==h.lineage&&p.id!==f.master.id&&p.alive&&p.agenda&&p.role!=='ребёнок'&&!p.liftTransit);
 if(people.length<3)throw Error('Need three distinct existing passengers');for(const p of people.slice(0,3)){s.tick++;p.area=f.from;p.x=100;const ride=admitLift(s,f.from,f.to,p.id,5);if(!ride)throw Error('No actual admitted ride');p.liftTransit=ride;}
 if(n.status!=='broken'||!n.drive?.current)throw Error('No wear-owned jam');return f;
}
export function fitDrive(f,worker=f.master){for(let i=0;i<3;i++){f.s.tick++;if(!workLift(f.s,worker,f.key,'repair',driveContext))throw Error('No actual material fitting');}return f;}
export function firstDriveFit(){const f=driveFixture();f.initialRaw=driveSave(f);for(let i=0;i<3;i++){f.s.tick++;if(!workLift(f.s,f.p,f.key,'repair',driveContext))throw Error('No initial base fitting');}buyDriveMaterial(f);jamDrive(f);fitDrive(f);return f;}
export function driveSave(f){syncActiveActor(f.s);return serialize(f.s);}
export function driveFrom(s,masterId){const h=s.hero,p=s.people[h.lineage],key=Object.keys(s.edges).find(key=>s.edges[key].lift),n=s.edges[key].lift;return {s,h,p,n,key,master:s.people[masterId],from:n.from,to:n.to,bypass:n.bypass};}
