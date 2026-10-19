import assert from 'node:assert/strict';
import {createWorld,step} from '../engine.js';import {MODULES} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';import {createPerson} from '../modules/lineage.js';
import {camp,join,topicContext} from './camp-topic-scenarios.mjs';
import {receiveItem} from '../modules/inventory.js';
export const musicContext={...topicContext,receiveItem};
export function musicBase(extra=[]){const flags=['camp-music','fieldcamp','companions','relationships','identity','lineage','people','npc-control','npc-needs','psychology',...extra],s=createWorld(1,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero;Object.assign(h,{energy:100,hunger:0,hp:h.maxHp,goal:null,transit:null,combat:null,quests:[],companions:[],conditions:[]});h.stories.active=null;h.destiny.completed=true;h.memory.shopAfter=1e9;h.life.reflectAfter=1e9;h.personality.curiosity=.8;h.personality.sociability=.8;h.mind.stress=24;h.commitments.personal=null;syncActiveActor(s);return {s,h};}
export function musician(f,{role='бард',job='farmer'}={}){const id=createPerson(f.s,{role,race:'human',alive:true,area:f.h.area,x:f.h.x},{initialJob:job}),p=f.s.people[id];join(f,p);p.agenda.curiosity=.8;p.agenda.sociability=.8;p.agenda.due=1e9;return p;}
export function musicCampArrival(f){camp(f);return f;}
export function musicSteps(f,n){assert.ok(n<=16);for(let i=0;i<n;i++)step(f.s);return f;}
export function learnAtCamp(f){const teacher=musician(f);musicCampArrival(f);musicSteps(f,3);assert.equal(f.h.campMusic.history.at(-1).outcome,'completed');assert.ok(f.s.people[f.h.lineage].music);return {...f,teacher};}
// Prepared departure/road-arrival checkpoint; the completed lesson and both
// people remain factual. No walking/healing life is simulated for setup.
export function aloneAfterLesson(f){const {s,h,teacher}=f;h.companions=h.companions.filter(c=>c.person!==teacher.id);teacher.status='resident';teacher.area='a0';teacher.x=24;teacher.agenda.task=null;s.areas.a0.population ||= [];if(!s.areas.a0.population.includes(teacher.id))s.areas.a0.population.push(teacher.id);syncActiveActor(s);return f;}
