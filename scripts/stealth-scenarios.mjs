import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {peopleTick} from '../modules/people.js';
import {areaScale} from '../geometry.js';
export const stealthContext={log(){},route:(s,a,b)=>a===b?[a]:[],knownRoute:(s,a,b)=>a===b?[a]:[]};
export function stealthFixture(){
 const keep=['stealth','people','npc-control','identity','containers','equipment','skill-branches','body','npc-knowledge','districts','background-towns'],s=createWorld(4,{rules:Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)]))}),h=s.hero,p=s.people[h.lineage],guards=Object.values(s.people).filter(q=>q.alive&&q.agenda?.job==='guard'&&q.id!==p.id).slice(0,2),areas=['a1','a5'].map(id=>s.areas[id]);assert.equal(guards.length,2);
 for(const q of Object.values(s.people))if(!guards.includes(q)&&q!==p)q.status='absent';for(const a of Object.values(s.areas))for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 Object.assign(h,{area:areas[0].id,x:70,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null,conditions:[],companions:[],quests:[],habits:[]});h.profession='thief';h.personality.courage=.2;h.stats.guile=4;h.stories.active=null;
 for(const [i,g]of guards.entries()){Object.assign(g,{area:areas[i].id,x:50,status:'resident',health:g.maxHealth||100,ailment:null});Object.assign(g.needs,{energy:100,hunger:0,sleeping:false});Object.assign(g.agenda,{task:{kind:'patrol',target:g.area,x:50,remaining:3},due:0});}
 syncActiveActor(s);return {s,h,p,guards,areas};
}
export function postedStealth(f=stealthFixture()){for(let i=0;i<3;i++){f.s.tick+=8;peopleTick(f.s,stealthContext);}for(const g of f.guards){assert.ok(g.guardWatch?.post);assert.equal(g.guardWatch.phase,'away');}return f;}
export function approachPost(f,index=0){const {s,h,guards,areas}=f,a=areas[index],g=guards[index],scale=areaScale(a);h.area=a.id;h.x=g.guardWatch.post.x+10/scale;h.goal={kind:'explore',area:a.id,x:g.guardWatch.post.x-12/scale,started:s.tick};h.combat=null;syncActiveActor(s);return f;}
export function quietPass(f,index=0){approachPost(f,index);for(let i=0;i<6;i++)step(f.s);assert.equal(f.p.stealth?.passes.at(-1)?.status,'safe');return f;}
export function trainedStealth(f=postedStealth()){quietPass(f,0);quietPass(f,1);assert.equal(f.p.skillPractice.stealth.method.id,'wait-for-turn');return f;}
export const exactStealth=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
