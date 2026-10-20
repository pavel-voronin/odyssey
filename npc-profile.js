import {profession} from './content.js';
import {appearance} from './appearance.js';
import {initializeActorAtlas} from './actor-atlas.js';
import {initializeWeather} from './modules/weather.js';
// Assemble optional detailed defaults in an isolated initialization world, never in the real simulation.
// Only the existing person's factual body, property and controller are attached to the real world.
export function npcActorProfile(s,p,makeHero,generation){
 let seed=s.seed>>>0;for(const char of 'npc-profile:'+p.id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const sandbox=structuredClone(s);Object.assign(sandbox,{seed,rng:seed,randomStreams:{},generation:1,tick:0,nextPerson:1000000+seed%1000000000,lives:[],graves:[]});
 const h=makeHero(sandbox),job=p.agenda?.job||'farmer',profile=profession('npc-'+job);
 Object.assign(h,{lineage:p.id,name:p.name,family:p.family||'',race:p.race||'human',culture:p.culture,actorMode:'npc',actorGeneration:generation,npcProfile:{version:1,job,observedAt:s.tick},area:p.area||s.society.journeys.find(j=>j.person===p.id)?.from,x:p.x??42,alive:p.alive,maxHp:p.maxHealth||100,hp:p.health,energy:p.needs?.energy??100,hunger:p.needs?.hunger??0,gold:Math.max(0,p.agenda?.wealth??p.actorLink?.wealth??0),born:p.ageOrigin?.at??s.tick,startAge:p.ageOrigin?.years??null,appearance:appearance(s.seed,p,p.appearance),origin:'Житель мира',profession:profile.id,level:1,xp:0,weapon:0,armor:0,inventory:p.actorLink?.inventory||{herbs:0,potions:0,relics:0,rations:0},bag:[],equipment:{weapon:null,armor:null,charm:null},companions:[],titles:[],quests:[],goal:null,combat:null,kills:0,distance:0,transit:null,lastAction:'idle',speech:'',intent:'Между собственными делами',reason:'Работа, нужды и дорога принадлежат этому человеку.',action:'ЖИЗНЬ'});
 delete h.routePreferences;
 // A new observation profile is not a new birth or another starting gift.
 h.sketchbook.paper=0;h.smoking.tobacco=0;
 h.personality={courage:1-(p.agenda?.duty??.5)*.6,curiosity:p.agenda?.curiosity??.5,sociability:p.agenda?.sociability??.5,generosity:.5};h.stats=Object.fromEntries(['might','wit','guile','luck','spirit'].map((key,i)=>[key,profile.stats[i]]));h.habits=[];h.conditions=[];h.alignment=0;
 const places=new Set([p.area,p.agenda?.home,...(p.navigation?.places||[]).filter(e=>e.workSeen!==undefined).map(e=>e.area)].filter(id=>s.areas[id]));
 h.memory={places:[...places],people:[...new Set([...(p.navigation?.contacts||[]).map(c=>c.person),...Object.keys(p.agenda?.bonds||{})])],avoided:{},facts:(p.agenda?.knowledge||[]).map(e=>({...e})),threats:{},merchant:null,npcNotes:{}};
 h.relations=Object.fromEntries(Object.entries(p.agenda?.bonds||{}).map(([id,trust])=>[id,{trust,met:s.tick,lastSeen:s.tick,helped:0}]));h.social={fame:0,home:p.agenda?.home||null,lastCivilQuestWork:0,lostCompanions:0};
 h.magic={mana:0,maxMana:0,spells:[],cooldowns:{},casts:0};h.career={xp:0,rank:1,path:job==='guard'?'adventure':'peaceful',records:{[h.profession]:{xp:0,rank:1}},history:[],lastChange:h.born};h.money={style:(p.agenda?.duty??.5)>.6?'cautious':'purposeful',priority:null};
 h.life={phase:'resident',home:p.agenda?.home||null,motive:null,reflectAfter:Number.MAX_SAFE_INTEGER,ended:false};h.timeline=(p.agenda?.knowledge||[]).map(e=>({...e,type:'npc',area:p.area,life:generation}));h.timelineDropped=0;h.biography=[];h.actorJournal=h.timeline.slice().reverse();h.stories={active:null,nextOffer:Number.MAX_SAFE_INTEGER,completed:[]};
 h.property={...h.property,known:{},lost:{},memory:{losses:0,lastCheck:null},origin:{eligible:false,checked:true,granted:null},owned:Object.values(s.areas).flatMap(a=>a.objects.filter(o=>o.kind==='workshop'&&o.owner===p.id).map(o=>({area:a.id,id:o.id}))),contract:Object.values(s.propertyContracts||{}).find(c=>c.buyer===p.id&&['active','performed','credited'].includes(c.status))?.id||null,claims:Object.values(s.propertyContracts||{}).filter(c=>c.buyer===p.id&&c.status==='claim').map(c=>c.id)};
 if(p.looseItems?.length){h.bag=p.looseItems;delete p.looseItems;}
 h.appearance.mark ||= 'Приметы не записаны';h.ruleFlags=s.rules;delete h.weatherTaste;initializeWeather(s,h);initializeActorAtlas(s,h);return h;
}
