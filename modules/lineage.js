import {initializePersonAge,canBearChild,ageLimits,initialAdultAge,personAgeAt} from './age-state.js';
import {recordCastleChild,castlesOn} from './castle-state.js';
import {birthHobbyProducer} from './hobby-stock.js';
import {birthFarmKit} from './farming-state.js';
import {birthMusic} from './camp-music-state.js';
import {birthLiteracy} from './literacy-state.js';
import {actorPalette} from '../palette.js';
import {initializeFoodKit} from './local-food.js';
import { RACES,FAMILIES,APPEARANCES,race } from '../content.js';
import { moduleRandom,enabled } from '../rules.js';
import { isTown } from './common.js';
import { initializePersonAgenda,NPC_JOBS } from './people.js';
import {nameRecord,makeName,areaCulture,initializeCultures} from './cultures.js';
const pick=(s,list)=>list[Math.floor(moduleRandom(s,'lineage')*list.length)];
const names=['Адель','Бран','Селин','Фарен','Летта','Ивар','Вела','Корен','Ним','Саф','Юна','Дорн'];
export function createPerson(s,record,{initialJob=null,ageYears=null}={}){
  if(record.role==='ребёнок'&&initialJob&&initialJob!=='student')throw new Error('A newborn cannot start adult work');
  if(initialJob&&!Object.hasOwn(NPC_JOBS,initialJob))throw new Error('Unknown initial occupation');
  if(record.role==='ребёнок'&&(!s.areas?.[record.area]||!record.parents?.length||new Set(record.parents).size!==record.parents.length||!record.parents.every(id=>canBearChild(s,s.people?.[id],record.area))))throw new Error('Birth requires actual mature parents at the birth place');
  s.people ||= {};s.nextPerson ||= 0;
  const input=Object.fromEntries(Object.entries(record).filter(([,value])=>value!==undefined));
  input.name ||= names[s.nextPerson%names.length];
  if(input.role==='ребёнок'){input.born=s.tick;input.generation=1+Math.max(0,...input.parents.map(id=>s.people[id].generation||0));}
  const id='person-'+s.nextPerson++,data=nameRecord(s,{...input,alive:input.alive!==false,race:input.race||'human',role:input.role||'житель'},id);s.people[id]={id,parents:[],health:data.alive?100:0,ailment:null,status:data.alive?'resident':'dead',paletteVersion:2,...data};initializePersonAge(s,s.people[id],{years:ageYears});initializePersonAgenda(s,s.people[id]);
  // Consume exactly the former random agenda, then finalize the initial role
  // before any occupation-specific possessions or knowledge are granted.
  if(initialJob&&s.people[id].agenda)s.people[id].agenda.job=initialJob;
  initializeFoodKit(s,s.people[id],null,{newborn:true});birthLiteracy(s,s.people[id]);birthMusic(s,s.people[id]);birthFarmKit(s,s.people[id],null,{newborn:true});birthHobbyProducer(s,s.people[id],{newborn:true});recordCastleChild(s,s.people[id]);if(record.role==='ребёнок')for(const parent of record.parents)s.people[parent].lastBirth=s.tick;return id;
}
const person=createPerson;
export function populateArea(s,a){
  s.people ||= {};
  if(!isTown(a)||a.population)return;
  const oldFamily=pick(s,FAMILIES),species=pick(s,RACES).id,culture=areaCulture(s,a);
  const family=enabled(s,'cultures')?makeName(s,{id:'area-family:'+a.id,culture}).family:oldFamily;
  const mother=person(s,{name:pick(s,names)+' '+family,race:species,role:'предок',alive:false,procedural:true,culture,family});
  const father=person(s,{name:pick(s,names)+' '+family,race:species,role:'предок',alive:false,procedural:true,culture,family});
  const elder=person(s,{name:pick(s,names)+' '+family,race:species,role:'житель',area:a.id,parents:[mother,father],alive:true,procedural:true,culture,family},{ageYears:ageLimits({race:species})[0]*2+5});
  a.population=[elder];const object=a.objects.find(o=>o.kind==='resident');if(object){object.person=elder;object.name=s.people[elder].name;}
}
export function initializeLineage(s,h){
  s.people ||= {};s.nextPerson ||= 0;
  const familyHome=Object.values(s.areas).find(isTown);
  if(!h.lineage){
    const predecessor=s.lives?.findLast(l=>l.actorMode!=='npc')||s.graves?.at(-1);
    const inheritanceDraw=predecessor?.lineage && moduleRandom(s,'lineage')<.4;
    const inherited=inheritanceDraw&&personAgeAt(s.people[predecessor.lineage],s.tick)>=2*ageLimits({race:predecessor.race})[0];
    const courtParent=!predecessor&&s.generation===1&&s.seed%8===4&&castlesOn(s)?Object.values(s.castles?.byId||{}).map(h=>s.people[h.founder]).find(p=>p?.alive&&personAgeAt(p,s.tick)>=2*ageLimits(p)[0]):null;
    const oldFamily=courtParent?.family||(inherited?predecessor.family:pick(s,FAMILIES)),culture=courtParent?.culture||(inherited?s.people[predecessor.lineage]?.culture:areaCulture(s,s.areas[h.area]));
    const family=courtParent?.family||(enabled(s,'cultures')&&!inherited?makeName(s,{id:'hero-family:'+s.generation,culture}).family:oldFamily);
    const species=courtParent?.race||(inherited?predecessor.race:pick(s,RACES).id);
    const prospective={id:'person-'+(s.nextPerson+(courtParent||inherited?0:2)),race:species};
    const heroAge=initialAdultAge(s,prospective);
    const parents=courtParent?[courtParent.id]:inherited?[predecessor.lineage]:[
      person(s,{name:pick(s,names)+' '+family,race:species,role:'родитель',area:familyHome?.id,alive:moduleRandom(s,'lineage')>.2,procedural:true,culture,family},{ageYears:heroAge+ageLimits(prospective)[0]+5}),
      person(s,{name:pick(s,names)+' '+family,race:species,role:'родитель',area:familyHome?.id,alive:moduleRandom(s,'lineage')>.2,procedural:true,culture,family},{ageYears:heroAge+ageLimits(prospective)[0]+5})
    ];
    h.family=family;h.race=species;h.lineage=person(s,{name:h.name+' '+family,race:species,role:'герой',parents,alive:h.alive,generation:s.generation,area:h.area},{ageYears:Math.min(heroAge,...parents.map(id=>{const age=personAgeAt(s.people[id],s.tick);return age===null?heroAge:age-ageLimits(prospective)[0];}))});
    if(enabled(s,'cultures')){
      const p=s.people[h.lineage],naming=makeName(s,{id:p.id,area:h.area,culture,parents,family:culture==='ember'?undefined:family});
      h.name=naming.given;h.family=naming.family;h.culture=naming.culture;Object.assign(p,{name:naming.full,naming,culture:naming.culture,family:naming.family});
    }
    // Keep the legacy draws aligned: a cosmetic update must not reshuffle later lineage decisions.
    const legacyLook={hair:pick(s,APPEARANCES.hair),cloak:pick(s,APPEARANCES.cloak),mark:pick(s,APPEARANCES.marks)};
    h.appearance={...legacyLook,...actorPalette(s.seed,h.lineage,h.culture)};
    h.origin=courtParent?'Потомок действительного княжеского дома':inherited?'Наследник прежней истории':'Первый путник своей семьи';
    if(familyHome)for(const id of parents)if(s.people[id]?.alive&&s.people[id].role==='родитель'&&!familyHome.population.includes(id))familyHome.population.push(id);
  }
  initializeCultures(s,h);
}
export function ancestry(s,id,depth=0){
  const p=s.people?.[id];if(!p||depth>6)return [];
  return [{...p,depth},...p.parents.flatMap(parent=>ancestry(s,parent,depth+1))];
}
export function racialDefense(s,raw,ctx){
  if(!enabled(s,'lineage'))return raw;
  const h=s.hero;
  if(h.race==='orc')return Math.max(1,raw-1);
  if(h.race==='halfling'&&ctx.random(s)<.1){ctx.log(s,'Удар задевает только край плаща. Полурослику снова везёт.','combat');return 0;}
  return raw;
}
