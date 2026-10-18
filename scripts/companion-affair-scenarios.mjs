import assert from 'node:assert/strict';
import {step,route} from '../engine.js';
import {npcLearningDeedFixture,addWorkerRelative,npcDeedContext} from './npc-deed-scenarios.mjs';
import {setModule} from '../rules.js';
import {planFieldCamp} from '../modules/fieldcamp.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {pauseMentorJourney} from '../modules/mentor-journey.js';
import {observeNPCFamilyNeeds} from '../modules/npc-deeds.js';
import {syncActiveActor} from '../actor-projection.js';
import {peopleTick} from '../modules/people.js';
import {socialTick} from '../modules/social.js';
export const companionAffairContext=npcDeedContext;
// Prepared association at a real pitched camp; paid lessons and their original
// dates are produced by the normal NPC engine, not invented by this fixture.
export function companionAffairFixture({shared=false,health=25,paid=1,carried=true}={}){
 const f=npcLearningDeedFixture({atTeacher:true}),{s,p,h}=f;
 for(let i=0;i<160&&p.personalJourney.lessons.length<paid;i++)step(s);assert.equal(p.personalJourney.lessons.length,paid);assert.equal(p.personalJourney.status,'active');
 p.area=f.a.id;p.x=42;observeNPCPlace(s,p);const parent=addWorkerRelative(f,{carried});parent.health=health;parent.agenda.due=1e9;observeNPCFamilyNeeds(s,p);
 // The parent was actually seen in this starting specimen; the later party
 // sees only that record unless it really meets the parent again.
 const entry=route(s,p.area,'a2');for(const id of entry){p.area=id;observeNPCPlace(s,p);}p.area=f.a.id;
 for(const id of ['fieldcamp','camp-sites','camp-life','companions','relationships','companion-affairs','npc-intentions','npc-contacts','npc-knowledge','lineage','supply'])setModule(s,id,true);
 setModule(s,'people',false);setModule(s,'npc-needs',false);
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy')o.alive=false;
 Object.assign(h,{area:'a2',x:24,energy:60,hunger:0,hp:h.maxHp,combat:null,transit:null,goal:{kind:'explore',area:shared?'a1':'a3',x:42,started:s.tick},intent:shared?'Дойти до Красной Пристани':'Исследовать руины',reason:'После отдыха продолжит выбранную дорогу через тот же выход лагеря.',action:'ПУТЬ'});h.magic.mana=h.magic.maxMana;h.companions=[];h.quests=[];h.campSession=null;
 assert.ok(planFieldCamp(s,npcDeedContext));syncActiveActor(s);for(let i=0;i<40&&(!s.areas[h.area].temporaryCamp||Math.abs(h.x-68)>1);i++)step(s);assert.ok(s.areas[h.area].temporaryCamp);assert.ok(Math.abs(h.x-68)<=1);assert.equal(h.goal.kind,'rest');
 pauseMentorJourney(s,p);Object.assign(p,{area:h.area,x:h.x,status:'withHero'});p.agenda.task=null;p.agenda.due=s.tick+8;observeNPCPlace(s,p);p.personalJourney.phase='together';p.personalJourney.offers.push({hero:h.lineage,tick:s.tick,decision:'accepted'});
 const c={id:p.id,uid:p.id,person:p.id,name:p.name,job:'Авантюрист',role:'person',race:p.race,attack:2,healing:0,scouting:1,ethics:0,loyalty:90,hp:30,maxHp:30,joined:s.tick,motive:'Подготовленный общий путь к знакомому наставнику.'};h.companions=[c];h.relations[p.id]={trust:50,met:s.tick,lastSeen:s.tick,helped:0};
 const camp=s.areas[h.area];if(camp.temporaryCamp.mode==='personal')camp.temporaryCamp.returns[p.id]={...camp.temporaryCamp.returns[h.lineage]};
 setModule(s,'people',true);s.tick++;syncActiveActor(s);return {...f,parent,c,camp};
}
export function relativeArrivesAtCamp(f,health=15){
 const {s,parent,p,camp,h}=f,home=parent.area,startX=parent.x;
 for(const id of route(s,home,camp.id)){parent.area=id;observeNPCPlace(s,parent);}parent.area=camp.temporaryCamp.parent;parent.x=camp.temporaryCamp.site.parentX;observeNPCPlace(s,parent);parent.area=home;parent.x=startX;parent.health=health;
 parent.agenda.task={kind:'visit',target:camp.id,x:h.x,remaining:2,person:p.id,home,knownNavigation:true};parent.agenda.due=s.tick;s.tick=Math.ceil((s.tick+1)/8)*8-8;
 let turns=0;for(;turns<160&&(parent.area!==camp.id||Math.abs(parent.x-h.x)>20);turns++){s.tick+=8;peopleTick(s,companionAffairContext);}
 assert.equal(parent.area,camp.id);assert.ok(Math.abs(parent.x-h.x)<=20);socialTick(s,companionAffairContext);return turns;
}
