import {foodFixture,startFood,foodContext} from './local-food-scenarios.mjs';
import {step} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';import {setModule} from '../rules.js';
import {cookingPlan} from '../modules/cooking.js';import {actualHearth} from '../modules/hearth-food.js';
import {revealArea} from '../actor-atlas.js';
export const hearthContext=foodContext;
export function hearthFixture(kind='mushroom'){
 const f=foodFixture(kind,s=>Object.values(s.people).some(p=>p.id!==s.hero.lineage&&p.alive&&(p.agenda?.job==='healer'||p.role==='Хозяин трактира'))),{s,h,p,a}=f;setModule(s,'hearth-food',true);
 const turns=startFood(f).remaining;for(let i=0;i<turns;i++)step(s);
 while(h.inventory.herbs<2){
  const herbArea=Object.values(s.areas).find(a=>a.objects.some(o=>o.kind==='herb'&&o.count>0)),herb=herbArea?.objects.find(o=>o.kind==='herb'&&o.count>0);if(!herb)throw Error('Actual finite herb pickup missing');
  for(const o of herbArea.objects)if(o.kind==='enemy')o.alive=false;
  const before=h.inventory.herbs;h.area=herbArea.id;h.x=herb.x;h.goal={kind:'collect',area:herbArea.id,x:herb.x,object:herb.id};syncActiveActor(s);step(s);if(h.inventory.herbs<=before)throw Error('Actual herb pickup failed');
 }
 const teacher=Object.values(s.people).find(q=>q.id!==p.id&&q.alive&&(q.agenda?.job==='healer'||q.role==='Хозяин трактира'));if(!teacher)throw Error('No genuine generated healer or innkeeper');
 const town=s.areas[teacher.area];if(!town)throw Error('Healer has no home');
 Object.assign(teacher,{status:'resident',health:teacher.maxHealth||100,x:68});Object.assign(teacher.agenda,{task:null,due:1e9});Object.assign(teacher.needs,{hunger:0,energy:100,sleeping:false,loneliness:0});
 h.area=town.id;h.x=68;h.hunger=45;h.hp=h.maxHp;h.energy=100;h.personality.curiosity=.9;h.habits=h.habits.filter(id=>id!=='hoarder');h.quests=[];h.goal=null;
 for(const o of town.objects)if(o.kind==='enemy')o.alive=false;
 for(const id of ['people','npc-control','npc-needs'])setModule(s,id,true);
 syncActiveActor(s);return{...f,teacher,town};
}
export function learnBroth(f){if(!cookingPlan(f.s,hearthContext))throw Error('Real lesson not chosen');if(f.h.goal.kind!=='brothLearn')throw Error('Expected lesson');for(let i=0;i<20&&!f.p.foodCooking?.recipes['trail-broth'];i++)step(f.s);if(!f.p.foodCooking?.recipes['trail-broth'])throw Error('Real three lessons incomplete');}
export function toHearth(f){const {s,h}=f,a=Object.values(s.areas).find(a=>actualHearth(s,a));if(!a)throw Error('No generated camp hearth');h.area=a.id;h.x=actualHearth(s,a).x;h.hp=h.maxHp;h.energy=100;h.hunger=45;h.goal=null;revealArea(s,a.id);syncActiveActor(s);f.camp=a;return a;}
