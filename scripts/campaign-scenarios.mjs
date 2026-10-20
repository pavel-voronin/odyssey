import assert from 'node:assert/strict';
import {diplomacyFixture,originAccepted,destinationMeeting,diplomaticContext} from './diplomacy-scenarios.mjs';
import {observeMigrationPlace} from '../modules/migration-memory.js';
import {setModule} from '../rules.js';
import {makeItem} from '../modules/inventory.js';
import {npcAction} from '../modules/npc-control.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {campaignNPCTurn,campaignDecision} from '../modules/campaign-actions.js';
import {ordersTick} from '../modules/orders.js';
import {serialize,restore,log} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
export const campaignContext={...diplomaticContext,log};
export function campaignFixture({refuge=false}={}){const f=originAccepted(diplomacyFixture({trust:-40}));destinationMeeting(f);assert.equal(f.q.status,'vetoed');const {s,chiefA:p,A,agent,guard,b}=f;
 for(const k of ['limited-campaigns','orders','npc-needs','npc-watch-needs','supply','equipment','remains'])setModule(s,k,true);
 // Prepared current possessions use the ordinary actual item constructor, not campaign loot.
 const members=A.population.map(id=>s.people[id]).filter(v=>v?.alive&&v.id!==p.id&&v.id!==agent.id&&v.id!==s.hero.lineage&&v.role!=='ребёнок').slice(0,2);assert.equal(members.length,2);
 for(const v of [...members,guard]){v.looseItems ||= [];v.looseItems.push(makeItem(s,{random:()=>0},3));v.status='resident';v.health=v.maxHealth||100;v.ailment=null;Object.assign(v.needs,{energy:100,hunger:0,sleeping:false});Object.assign(v.agenda,{task:null,duty:.8,due:1e9});if(v!==guard){v.area=A.id;v.x=42;observeNPCPlace(s,v);}}
 p.agenda.curiosity=.3;p.agenda.duty=.9;p.area=A.id;p.x=42;p.agenda.task=null;p.needs.energy=100;p.needs.hunger=0;p.needs.sleeping=false;
 if(refuge){setModule(s,'migrations',true);setModule(s,'migration-knowledge',true);observeMigrationPlace(s,agent);}
 // Actual rejected-message arrival: journey duration is not claimed tested here.
 agent.area=A.id;agent.x=42;agent.status='resident';agent.agenda.task=null;agent.diplomaticDuty.active=false;
 s.tick++;assert.equal(npcAction(s,agent,'personal'),true);assert.equal(campaignNPCTurn(s,agent,campaignContext),true);assert.ok(p.news.known[f.q.responseNews]);f.members=members;f.actions=1;return f;}
export function decideCampaign(f){f.s.tick++;assert.equal(npcAction(f.s,f.chiefA,'personal'),true);assert.equal(campaignDecision(f.s,f.chiefA,f.q,campaignContext,{inTurn:true}),true);f.op=f.s.authorities.campaigns.operations[f.q.id];f.actions++;return f.op;}
export function campaignTurn(f){if(++f.actions>12)throw Error('Campaign action budget');f.s.tick++;ordersTick(f.s,campaignContext);}
export function postCheckpoint(f){for(const p of f.members){const old=f.s.areas[p.area];old.objects=old.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);p.area=f.b.from;p.x=f.b.x;f.s.areas[p.area].objects.push({id:'watch-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});}return f;}
export function exactCampaign(f){syncActiveActor(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);return raw;}

