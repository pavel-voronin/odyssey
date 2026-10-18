import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {syncActiveActor} from '../actor-projection.js';
import {revealArea} from '../actor-atlas.js';
export function intentionFixture({method='warn',off=false,heroX=32,enemyHp=100,enemyAttack=5,victimHp=35,duty=1,remaining=2,guardDuty=1,guardAttack=25}={}){
 const s=createWorld(5),h=s.hero,a=s.areas.a1,original=s.areas.a2,enemy=original.objects.find(o=>o.kind==='enemy');
 for(const id of Object.keys(s.rules))setModule(s,id,false);
 for(const id of ['intentions','orders','supply','npc-control','combat-judgment'])setModule(s,id,true);setModule(s,'intentions',!off);
 original.objects=original.objects.filter(o=>o!==enemy);a.objects.push(enemy);a.type='undercity';a.realm='underground';a.forage={stock:6,max:6,x:heroX,kind:'Съедобные грибы',lastGrowth:0};
 for(const p of Object.values(s.people))if(p.area===a.id&&p.agenda){p.agenda.job='farmer';if(p.role==='страж')p.role='житель';}
 Object.assign(h,{area:a.id,x:heroX,hp:100,maxHp:100,energy:100,hunger:55,weapon:method==='fight'?6:0,armor:0,level:1,combat:null,transit:null,conditions:[],companions:[],quests:[],alignment:0,lastAction:'collect'});
 h.personality.courage=method==='fight'?.9:.1;h.personality.generosity=method==='leave'?.05:1;h.inventory.rations=1;h.inventory.herbs=2;h.counters.forage=1;
 h.goal={kind:'forage',area:a.id,x:heroX,remaining,started:0};h.intent='Собирать съедобные грибы';h.reason='Уже начатый сбор перед дальнейшей дорогой.';h.delve=null;h.caravanJob=null;h.commitments.personal=null;
 revealArea(s,a);if(!h.memory.places.includes(a.id))h.memory.places.push(a.id);
 Object.assign(enemy,{x:48,hp:enemyHp,maxHp:enemyHp,attack:enemyAttack,alive:true,resolved:false,powers:[],mutation:'none',element:'normal',tactic:'simple',battle:{turns:0,intent:'idle',summons:0,echo:0}});
 const person=createPerson(s,{name:'Нера на дозоре',race:'human',role:'страж',area:a.id,x:40,status:'guarding',alive:true,health:victimHp,maxHealth:100,attack:1}),victim=s.people[person];victim.agenda.duty=duty;
 a.population.push(person);a.objects.push({id:'body-'+person,kind:'resident',person,name:victim.name,x:40});s.society.orders=[{person,owner:h.lineage,from:a.id,to:a.id,enemy:enemy.id,stage:'fighting',remaining:0}];
 let guard=null;if(method==='guard'){
  const id=createPerson(s,{name:'Тарен, местный страж',race:'human',role:'страж',area:a.id,x:heroX,status:'resident',alive:true,health:100,maxHealth:100,attack:guardAttack});guard=s.people[id];guard.agenda.task=null;guard.agenda.due=10000;guard.agenda.duty=guardDuty;a.population.push(id);a.objects.push({id:'body-'+id,kind:'resident',person:id,name:guard.name,x:heroX});
 }
 syncActiveActor(s);return {s,h,a,enemy,victim,guard};
}
export function addHerbPromises(f,reverse=false){
 const {s,h,a}=f;setModule(s,'quests',true);const object={id:'promise-herbs',kind:'herb',name:'Лунная трава',x:h.x,count:10,max:10};a.objects.push(object);
 h.quests=Array.from({length:4},(_,i)=>({id:'promise-'+i,kind:'herbs',title:'Травы для дома '+i,source:a.id,target:a.id,object:object.id,giver:a.population[0],status:'active',required:9,reward:12,accepted:reverse?3-i:i,deadline:1000,visited:false,cargo:false,delivered:false}));
 if(reverse)h.quests.reverse();h.goal={kind:'collect',area:a.id,x:h.x,object:object.id,quest:'promise-0',started:0};h.intent='Собрать травы по прежнему обещанию';return object;
}
