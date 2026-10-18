import assert from 'node:assert/strict';
import {createWorld,route} from '../engine.js';
import {recordAreaVisit} from '../actor-atlas.js';
import {setModule} from '../rules.js';
import {recruitPerson,hurtCompanion} from '../modules/social.js';

// A prepared combat checkpoint, not a claimed naturally recruited expedition.
// The people and supplies already exist; stock is moved out of the actual town.
export function partyCombatFixture({roles=['guard','healer'],seed=0}={}){
 const s=createWorld(seed),h=s.hero,town=s.areas.a1,logs=[];
 for(const id of ['companion-goals','combat-judgment','magic','weapon-styles','stories'])setModule(s,id,false);
 h.area='a1';h.x=42;h.combat=null;h.transit=null;h.companions=[];
 const ctx={route,knownRoute:route,log:(_s,text,type)=>logs.push({text,type}),random:()=>.99,hurtCompanion};
 const members=[];
 for(const job of roles){
  const p=Object.values(s.people).find(p=>p.id!==h.lineage&&p.alive&&p.area==='a1'&&p.status==='resident'&&p.agenda.job===job&&!members.some(m=>m.person.id===p.id));assert.ok(p,'existing '+job);
  delete p.personalJourney;assert.ok(recruitPerson(s,p.id,ctx,true));const c=h.companions.at(-1);c.loyalty=80;
  p.health=p.maxHealth||100;p.needs.energy=100;p.needs.hunger=10;p.needs.sleeping=false;c.hp=c.maxHp;
  const medicine=job==='healer'?4:0;assert.ok(town.civic.medicine>=medicine&&town.civic.food>=1);town.civic.medicine-=medicine;town.civic.food--;
  p.roadSupplies={food:1,medicine};members.push({person:p,companion:c});
 }
 const e=s.areas.a2.objects.find(o=>o.kind==='enemy');assert.ok(e);
 h.area='a2';h.x=e.x;recordAreaVisit(s,'a2');h.combat=e.id;h.hp=Math.max(8,Math.round(h.maxHp*.4));h.energy=100;h.hunger=0;h.inventory.potions=0;h.personality.courage=1;h.conditions=[];
 e.hp=e.maxHp=600;e.attack=6;e.powers=['plain'];e.element='normal';e.mutation='none';e.tactic='simple';e.battle={turns:0,intent:'idle',summons:0,echo:0};
 for(const {person:p}of members){p.area=h.area;p.x=h.x-4;}
 return {s,h,e,members,guard:members.find(m=>m.person.agenda.job==='guard'),healer:members.find(m=>m.person.agenda.job==='healer'),ctx,logs};
}
