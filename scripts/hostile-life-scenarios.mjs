import {enemyPersonFixture,enemyPersonContext} from './enemy-person-scenarios.mjs';
import {createPerson} from '../modules/lineage.js';
import {hostileLifeTick} from '../modules/hostile-life.js';
import {syncEnemyPeople} from '../modules/enemy-person-state.js';
import {takeForage} from '../modules/local-food.js';
import {syncActiveActor} from '../actor-projection.js';
export const hostileContext=enemyPersonContext;
export function hostileFixture({depleted=false,localFood=false,guard=false,victimFood=2}={}){
 const f=enemyPersonFixture({x:50,life:true,localFood}),{s,h,a,p,enemy}=f;a.length=80;a.forage.x=35;if(depleted)takeForage(a,a.forage.stock);
 const victim=s.people[createPerson(s,{race:'human',role:'торговец',area:a.id,x:65,alive:true,parents:[],roadSupplies:{food:victimFood,medicine:0}},{initialJob:'merchant'})];victim.agenda.duty=.2;victim.agenda.task=null;victim.agenda.due=1e9;Object.assign(victim.needs,{energy:100,hunger:0,sleeping:false});a.population ||= [];a.population.push(victim.id);a.objects.push({id:'resident-'+victim.id,kind:'resident',person:victim.id,name:victim.name,x:65});
 let defender=null;if(guard){defender=s.people[createPerson(s,{race:'human',role:'страж',area:a.id,x:64,alive:true,parents:[]},{initialJob:'guard'})];Object.assign(defender.needs,{energy:100,hunger:0,sleeping:false});defender.agenda.task=null;defender.agenda.due=1e9;a.population.push(defender.id);a.objects.push({id:'resident-'+defender.id,kind:'resident',person:defender.id,name:defender.name,x:64});}
 for(const other of Object.values(s.people))if(![h.lineage,p.id,victim.id,defender?.id].includes(other.id))other.status='absent';h.area='a6';h.x=42;h.combat=null;h.goal=null;syncActiveActor(s);p.needs.hunger=80;p.needs.energy=100;enemy.patrol=1;
 if(p.hostileLife.supplies.initial!==0)throw Error('Fixed conditional birth fixture must have no spare food');return {...f,victim,defender,q:p.hostileLife};
}
export function hostilePhase(f){f.s.tick=Math.floor(f.s.tick/8)*8+8;hostileLifeTick(f.s,hostileContext);syncEnemyPeople(f.s);}
