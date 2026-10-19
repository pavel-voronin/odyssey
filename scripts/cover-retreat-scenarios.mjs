import {wagonFixture,wagonContext} from './wagon-scenarios.mjs';import {createFreight} from '../modules/freight.js';import {setModule} from '../rules.js';
import {createWorld,createEnemy,step,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {recruitPerson,hurtCompanion} from '../modules/social.js';
import {retreatDrill} from '../modules/cover-retreat.js';
export const coverContext={log(){},random:()=>.99,hurtCompanion};
export function coverFixture({transport=false}={}){
 const base=transport?wagonFixture():null;if(base)setModule(base.s,'wagons',false);const convoy=base?createFreight(base.s,base.from,base.to,wagonContext,base.p.id):null;if(base&&!convoy)throw Error('No actual foot freight');if(base)setModule(base.s,'wagons',true);
 const flags=['identity','skill-branches','party-combat','companions','relationships','people','npc-control','body','origins','birthplaces','districts'],s=base?.s||createWorld(0,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,town=s.areas.a1,p=Object.values(s.people).find(p=>p.alive&&(base||p.area===town.id)&&p.agenda?.job==='guard'&&p.role!=='ребёнок'&&p.id!==h.lineage);
 if(base)for(const flag of flags)setModule(s,flag,true);if(!p)throw Error('No existing guard');Object.assign(h,{area:p.area,x:p.x,combat:null,transit:null,companions:[],quests:[],conditions:[],habits:[],hp:100,maxHp:100,energy:100,hunger:0,goal:null});Object.assign(h.inventory,{potions:0,herbs:0,rations:0,relics:0});h.stories.active=null;h.destiny.completed=true;h.personality.courage=1;h.personality.generosity=.8;p.agenda.duty=.8;p.agenda.sociability=.8;p.agenda.task=null;Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});p.health=p.maxHealth||100;
 if(!recruitPerson(s,p.id,coverContext,true))throw Error('Real guard did not join');const c=h.companions[0];c.loyalty=80;const a=s.areas.a2;for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 const e=createEnemy(s,a,{requestedSpecies:'guard',x:50});Object.assign(e,{x:50,hp:300,maxHp:300,attack:6,hidden:false,patrol:0,powers:['plain'],element:'normal',mutation:'none',tactic:'simple'});Object.assign(h,{area:a.id,x:50,hp:50,combat:e.id,goal:{kind:'hunt',area:a.id,x:50,object:e.id,started:s.tick}});p.area=a.id;p.x=48;syncActiveActor(s);return {s,h,p,c,e,a,town,convoy,carrier:base?.p,to:base?.to};
}
export function trainCover(options){const f=coverFixture(options);step(f.s);const first=f.p.skillPractice?.combat?.total;if(first!==1)throw Error('First actual guard protection absent');const e=createEnemy(f.s,f.a,{requestedSpecies:'guard',x:50});Object.assign(e,{x:50,hp:300,maxHp:300,attack:6,hidden:false,patrol:0,powers:['plain'],element:'normal',mutation:'none',tactic:'simple'});f.e.alive=false;f.e.resolved=true;f.e=e;f.h.combat=e.id;f.h.goal={kind:'hunt',area:f.a.id,x:50,object:e.id,started:f.s.tick};step(f.s);if(f.p.skillPractice.combat.total!==2)throw Error('Second actual guard protection absent');
 // A returned, safe station checkpoint, no long recovery prefix. Guard health
 // is still exactly the result of those two protections; no health is granted.
 f.h.area=f.town.id;f.h.x=42;f.h.hp=f.h.maxHp;f.h.combat=null;f.h.goal={kind:'rest',area:f.town.id,x:42,started:f.s.tick};f.p.area=f.town.id;f.p.x=40;f.s.tick++;if(!retreatDrill(f.s,coverContext))throw Error('Consenting actual practice absent');syncActiveActor(f.s);return f;
}
export function coverThreat(f){Object.assign(f.h,{area:f.a.id,x:50,hp:5,energy:100,combat:f.e.id,goal:{kind:'hunt',area:f.a.id,x:50,object:f.e.id,started:f.s.tick}});f.p.area=f.a.id;f.p.x=48;f.e.alive=true;f.e.resolved=false;syncActiveActor(f.s);return f;}
export function coverSave(f){syncActiveActor(f.s);return serialize(f.s);}
