import {packPetsOn,petPack,petNear} from './pack-pet-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {carriedFood,consumeCarriedSupplies} from './stores.js';
import {scentPlantKnown,rememberScentPlant} from './pet-scent-policy.js';
const on=s=>enabled(s,'pet-training')&&enabled(s,'companions');
const present=(s,c)=>Boolean(c&&s.hero.companions.includes(c)&&!c.person&&c.id==='dog'&&c.hp>0&&petNear(s,c)&&s.hero.alive&&!s.hero.life.ended&&!s.hero.transit&&!s.hero.combat);
const safe=s=>!s.areas[s.hero.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&physicalDistance(s.areas[s.hero.area],s.hero.x,o.x)<=30);
const learned=c=>c?.petTraining?.lessons.length===3;
const state=(s,c)=>(c.petTraining ||= {version:1,energy:100,hunger:10,lastUpkeep:s.tick,lastActionTick:-1,after:0,lessons:[],finds:[]});
function ready(s,c){const h=s.hero,t=c?.petTraining;return on(s)&&present(s,c)&&safe(s)&&c.loyalty>=60&&h.energy>=35&&h.hunger<65&&h.hp>=h.maxHp*.65&&(!t||t.energy>=35&&t.hunger<65&&t.lastActionTick!==s.tick);}
export function petTrainingTick(s){
 if(!on(s)&&!packPetsOn(s))return;const h=s.hero;
 for(const c of h.companions){const t=c.petTraining;if(!on(s)&&!petPack(c)||c.person||c.id!=='dog'||!t||c.hp<=0||t.lastUpkeep===s.tick||s.tick%8!==0)continue;t.lastUpkeep=s.tick;t.hunger=Math.min(100,t.hunger+.8);t.energy=Math.max(0,t.energy-.4);if(h.goal?.kind==='rest'&&!h.combat&&petNear(s,c))t.energy=Math.min(100,t.energy+4);}
}
export function dogTrainingPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!on(s))return false;
 const hungry=h.companions.find(c=>present(s,c)&&c.petTraining?.hunger>=35&&c.loyalty>=50);if(hungry&&safe(s)&&h.energy>=2&&carriedFood(p,h.inventory)>=3){ctx.goal(s,'dogFeed',h.area,h.x,'Покормить собаку','Одну порцию нужно отдать из настоящих припасов хозяина.',{dog:hungry.uid});return true;}
 if(h.personality.generosity<.55||h.personality.curiosity<.55||h.inventory.herbs<1||carriedFood(p,h.inventory)<6)return false;
 const c=h.companions.find(c=>ready(s,c)&&!learned(c)&&(c.petTraining?.after||0)<=s.tick);if(!c)return false;
 ctx.goal(s,'dogLesson',h.area,h.x,'Позаниматься с собакой','Хозяин даёт понюхать свою лечебную траву и расходует корм за поиск. Нужны спокойное место и доверие.',{dog:c.uid});return true;
}
export function feedDog(s,uid,ctx={}){
 const h=s.hero,c=h.companions.find(c=>c.uid===uid),t=c?.petTraining,p=s.people[h.lineage];if(!on(s)||!present(s,c)||!safe(s)||!t||t.lastActionTick===s.tick||t.hunger<35||c.loyalty<50||h.energy<2||carriedFood(p,h.inventory)<3||!consumeCarriedSupplies(p,null,'food',1))return false;
 t.hunger=Math.max(0,t.hunger-48);t.lastActionTick=s.tick;h.energy--;h.lastAction='feed';ctx.log?.(s,`${c.name} съедает порцию из дорожных припасов хозяина.`,'companion');return true;
}
export function dogFeedAction(s,ctx){feedDog(s,s.hero.goal?.dog,ctx);s.hero.goal=null;}
export function teachDog(s,uid,ctx={}){
 const h=s.hero,c=h.companions.find(c=>c.uid===uid),p=s.people[h.lineage],t=c?.petTraining;
 if(!ready(s,c)||learned(c)||t?.after>s.tick||h.inventory.herbs<1||carriedFood(p,h.inventory)<6||!consumeCarriedSupplies(p,null,'food',1))return false;
 const d=state(s,c);h.energy-=2;d.energy-=2;d.hunger=Math.max(0,d.hunger-12);d.lastActionTick=s.tick;d.after=s.tick+24;d.lessons.push({tick:s.tick,owner:h.lineage,area:h.area,sample:{kind:'herb',holder:h.lineage,quantity:h.inventory.herbs}});h.lastAction='teach';
 ctx.log?.(s,`${c.name} ищет знакомый запах лечебной травы. ${d.lessons.length}/3 спокойных занятий; одна порция корма съедена.${learned(c)?' Теперь он умеет искать этот запах.':''}`,'companion');return true;
}
export function dogLessonAction(s,ctx){const h=s.hero;teachDog(s,h.goal?.dog,ctx);h.goal=null;}
function target(s,c){const h=s.hero,a=s.areas[h.area];if(!on(s)||!present(s,c)||!learned(c)||c.loyalty<50||!safe(s)||c.petTraining.hunger>=65||c.petTraining.energy<30||c.petTraining.lastActionTick===s.tick||h.energy<2)return null;return a.objects.find(o=>o.kind==='herb'&&o.count>0&&o.scentCover&&!scentPlantKnown(s,h,a,o)&&physicalDistance(a,h.x,o.x)<=48);}
export function dogSearchPlan(s,ctx){
 const h=s.hero;if(!on(s)||h.inventory.herbs>=3&&!h.quests.some(q=>q.status==='active'&&q.kind==='herbs'))return false;
 for(const c of h.companions){const o=target(s,c);if(!o)continue;ctx.goal(s,'dogSearch',h.area,h.x,'Дать собаке взять запах','Он знает только знакомый запах травы. Добычу ещё нужно найти, подойти и собрать.',{dog:c.uid,object:o.id});return true;}return false;
}
export function dogSearchAction(s,ctx){
 const h=s.hero,g=h.goal,c=h.companions.find(c=>c.uid===g?.dog),o=c&&target(s,c),a=s.areas[h.area];
 if(!o||o.id!==g.object){h.goal=null;return false;}
 const d=c.petTraining;d.energy-=2;h.energy--;d.lastActionTick=s.tick;d.finds.push({tick:s.tick,owner:h.lineage,area:a.id,object:o.id,remaining:o.count});if(d.finds.length>8)d.finds.shift();rememberScentPlant(s,h,a,o,c.uid);h.lastAction='search';
 ctx.goal(s,'collect',a.id,o.x,'Пойти за собакой к траве','Пёс указал существующее растение по знакомому запаху. Запас ещё не собран.',{object:o.id});ctx.log?.(s,`${c.name} берёт знакомый запах из-под зарослей. Герой идёт проверить найденную траву.`,'discover');return true;
}
export function petTrainingHTML(c){const t=c?.petTraining;return t?`<p>Запах лечебной травы: ${t.lessons.length===3?'освоен':t.lessons.length+' / 3 занятия'} · голод ${Math.ceil(t.hunger)} / 100 · силы ${Math.ceil(t.energy)} / 100</p>`:'';}
