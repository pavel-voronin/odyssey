import assert from 'node:assert/strict';
import {lodgingFixture} from './lodging-scenarios.mjs';
import {MODULES,setModule} from '../rules.js';
import {commonContext} from './common-life-scenarios.mjs';
import {receiveItem} from '../modules/inventory.js';
import {lodgingPlan,bookRoom} from '../modules/lodging.js';
import {homePlan,homeAction} from '../modules/homes.js';
import {workspaceAccess} from '../modules/property.js';
import {brothLesson} from '../modules/cooking.js';
import {foodStores} from '../modules/food-stores.js';
import {syncActiveActor} from '../actor-projection.js';
export const homeContext={...commonContext,receiveItem,workspaceAccess:s=>workspaceAccess(s,commonContext)};
export function homeFixture({hearth=false,book=true,seed=0}={}){
 const f=lodgingFixture(seed),{s,h,p,room}=f;
 const on=['homes','lodging','interiors','people','npc-control','npc-contacts','identity','equipment','containers','goods-cycle','local-market','property','forging','local-food','supply','hearth-food'];for(const m of MODULES)setModule(s,m.id,on.includes(m.id));
 h.inventory.rations=4;h.inventory.herbs=2;h.bag=[];h.quests=[];h.companions=[];h.goal=null;h.energy=40;h.hp=h.maxHp;h.hunger=5;h.memory.shopAfter=1e9;h.life.reflectAfter=1e9;h.destiny.completed=true;s.areas.a1.danger=0;
 for(const person of Object.values(s.people))if(![h.lineage,p.id].includes(person.id))person.status='absent';
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 const savings=Object.values(s.areas).find(a=>a.id!=='a1'&&a.civic?.treasury>=60);assert.ok(savings);savings.civic.treasury-=60;h.gold+=60; // Finite prepared savings, not an earned-income claim.
 p.agenda.task=null;p.agenda.due=1e9;p.needs.energy=100;p.needs.hunger=0;syncActiveActor(s);
 if(book){assert.equal(lodgingPlan(s,homeContext),true);bookRoom(s,homeContext);assert.equal(room.lodging.booking.payer,h.lineage);}h.goal=null;h.energy=100;h.hp=h.maxHp;
 if(hearth){
  const store=foodStores(s.people[h.lineage]);store.stock.mushroom=1;store.obtained.mushroom=1; // Prepared real finite ingredient, not a natural encounter claim.
  h.goal={kind:'brothLearn',area:h.area,x:p.x,teacher:p.id};h.x=p.x;
  for(let n=0;n<3;n++){s.tick++;assert.equal(brothLesson(s,homeContext),true);}assert.ok(s.people[h.lineage].foodCooking.recipes['trail-broth']);h.goal=null;h.hunger=45;
 }
 return{...f,tenant:s.people[h.lineage]};
}
export function buyHomeMaterials(f){const {s,h}=f;assert.equal(homePlan(s,homeContext),true);assert.equal(h.goal.kind,'homeMaterials');h.area=h.goal.area;h.x=h.goal.x;s.tick++;assert.equal(homeAction(s,homeContext),true);h.area=f.hall.id;h.x=f.p.x;}
export function agreeHome(f){if((f.tenant.marketCargo?.tools||0)<2)buyHomeMaterials(f);const {s,h}=f;assert.equal(homePlan(s,homeContext),true);assert.equal(h.goal.kind,'homeAgree');h.area=h.goal.area;h.x=f.p.x;s.tick++;assert.equal(homeAction(s,homeContext),true);return f.room.home;}
export function fitHome(f){if(!f.room.home)agreeHome(f);const {s,h}=f;assert.equal(homePlan(s,homeContext),true);assert.equal(h.goal.kind,'homeFit');h.area=f.room.id;h.x=56;for(let n=0;n<3;n++){s.tick++;assert.equal(homeAction(s,homeContext),true);}assert.equal(f.room.home.state,'ready');return f;}
