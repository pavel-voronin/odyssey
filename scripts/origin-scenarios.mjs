import {createWorld,serialize,restore,createNextStory} from '../engine.js';import {setModule} from '../rules.js';import {craftFixture,demonstrateCraft,damageCraftRoom,craftContext} from './craft-respect-scenarios.mjs';import {commissionRepair,quoteRepair} from '../modules/resident-orders.js';
export const originContext=craftContext;
export function wordFixture({form='witness',witness=false}={}){
 const f=craftFixture(),{s,h,p,a}=f;setModule(s,'word-custom',true);demonstrateCraft(f);damageCraftRoom(f);h.hp=h.maxHp;h.hunger=0;h.energy=100;h.x=42;p.x=42;p.wordCustom={version:1,form,culture:p.culture};p.agenda.bonds={};
 const q=Object.values(s.people).find(q=>q.id!==p.id&&q.id!==h.lineage&&q.alive&&q.role!=='ребёнок'&&q.agenda);
 if(!q)throw Error('Actual second adult required');
 for(const other of Object.values(s.people))if(other.id!==p.id&&other.id!==h.lineage)other.status='absent';
 if(witness){q.area=a.id;q.x=42;q.status='resident';q.needs.sleeping=false;p.agenda.bonds[q.id]=1;}
 if(!commissionRepair(s,p,f.o))throw Error('Actual quote could not be commissioned');const c=Object.values(s.workOrders).at(-1);quoteRepair(s,p,p.agenda.task,craftContext);if(c.status!=='quoted')throw Error('Actual quote missing');return {...f,q,c};
}
