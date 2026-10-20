import assert from 'node:assert/strict';
import {foundationFixture,foundationContext} from './foundation-scenarios.mjs';
import {prepareFoundation,foundationAction} from '../modules/foundation.js';
import {setModule} from '../rules.js';
import {npcAction} from '../modules/npc-control.js';
import {finiteSavings,dwellingTurn} from './dwelling-scenarios.mjs';
import {extractRaw,deliverRaw,takeGoods} from '../modules/goods.js';
import {createPerson} from '../modules/lineage.js';
import {familyAction,familyChoice} from '../modules/family-actions.js';
import {serialize,restore} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {YEAR_TICKS} from '../calendar-units.js';
export const familyContext={...foundationContext,birthPerson:createPerson};
export function familyExact(s){syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);return raw;}
let sourceRaw,unionRaw;
export function familyFixture(){if(!sourceRaw){const f=foundationFixture(),{s,a,leader:owner,builder:partner}=f;for(const flag of ['families','lineage','relationships','home-building','homes','interiors','lodging','npc-needs','npc-personal-supplies'])setModule(s,flag,true);
 for(const p of [partner,owner,partner,owner]){s.tick+=8;p.agenda.task=null;assert.equal(prepareFoundation(s,p),true);assert.equal(npcAction(s,p,'personal'),true);assert.equal(foundationAction(s,p,familyContext),true);}assert.equal(a.foundation.status,'done');assert.equal(s.families.shared[[owner.id,partner.id].sort().join('|')].actions,4);
 Object.assign(f,{owner,worker:partner});owner.housePreference='family';owner.agenda.duty=.8;finiteSavings(s,owner,70);const raw=extractRaw(s,a,6);assert.equal(raw,6);owner.goodsRawCargo={quantity:raw,owner:owner.id,source:a.id};assert.equal(deliverRaw(s,a,owner,raw),6);for(const stage of ['allocate','start','supply','work','work','work','work'])dwellingTurn(f,owner,stage);assert.ok(owner.privateHome);partner.x=owner.x;Object.assign(owner.agenda,{task:null,duty:.8,sociability:.8});Object.assign(partner.agenda,{task:null,duty:.5,sociability:.8});finiteSavings(s,partner,10);for(const p of [owner,partner]){p.needs.energy=100;p.needs.hunger=0;}s.tick+=YEAR_TICKS;sourceRaw=familyExact(s);}
 const s=restore(sourceRaw),shared=Object.values(s.families.shared)[0],offerer=shared.people.map(id=>s.people[id]).find(p=>p.privateHome),partner=s.people[shared.people.find(id=>id!==offerer.id)],a=s.areas[offerer.privateHome.area];return {s,owner:offerer,partner,a,room:s.areas[offerer.privateHome.room],actions:0};}
export function familyAct(f,p,kind=null,extra={}){if(++f.actions>12)throw Error('Family action budget');f.s.tick++;assert.equal(npcAction(f.s,p,'personal'),true);const g=kind?{kind,person:(p===f.owner?f.partner:f.owner).id,room:f.room.id,...extra}:familyChoice(f.s,p);assert.ok(g,'personal family choice');assert.equal(familyAction(f.s,p,g,familyContext,{inTurn:true}),true);return g;}
export function pairedFamily(){if(!unionRaw){const f=familyFixture();familyAct(f,f.owner);familyAct(f,f.partner);assert.equal(Object.values(f.s.families.unions).length,1);unionRaw=familyExact(f.s);}const f=familyFixture(),s=restore(unionRaw);f.s=s;f.owner=s.people[f.owner.id];f.partner=s.people[f.partner.id];f.a=s.areas[f.a.id];f.room=s.areas[f.room.id];f.u=Object.values(s.families.unions)[0];return f;}
export function atFamilyRoom(f){for(const p of [f.owner,f.partner]){p.area=f.room.id;p.x=42;p.status='resident';p.agenda.task=null;p.needs.energy=100;p.needs.hunger=0;}return f;}
export function provisionFamily(f){for(const p of [f.owner,f.partner]){assert.equal(takeGoods(f.s,f.a,'food',2,{flow:'exported',reason:'prepared actual family provisions',actor:p.id}),2);p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food+=2;}return f;}
export function expandFamilyRoom(f){f.owner.area=f.a.id;f.owner.x=f.a.dwellingPlot.x;f.owner.housePreference='household';const n=extractRaw(f.s,f.a,2);assert.equal(n,2);f.owner.goodsRawCargo={quantity:n,owner:f.owner.id,source:f.a.id};assert.equal(deliverRaw(f.s,f.a,f.owner,2),2);for(const stage of ['start','supply','work','work','work']){dwellingTurn(f,f.owner,stage);if(++f.actions>12)throw Error('Family action budget');}assert.equal(f.room.residence.capacity,3);return atFamilyRoom(f);}
export function familyChild(f=pairedFamily()){expandFamilyRoom(f);provisionFamily(f);f.owner.familyChildWish=f.partner.familyChildWish=true;familyAct(f,f.owner,'familyPairChildAsk',{union:f.u.id});familyAct(f,f.partner,'familyPairChildAnswer',{union:f.u.id});assert.equal(f.u.children.length,1);return f;}

