import {enemyPersonFixture,enemyPersonContext} from './enemy-person-scenarios.mjs';
import {createPerson} from '../modules/lineage.js';
import {setModule} from '../rules.js';
import {tradeGoods} from '../modules/market.js';
import {extractRaw} from '../modules/goods.js';
import {spillPackCargo} from '../modules/container-cargo.js';
import {hostileLifeTick} from '../modules/hostile-life.js';
import {syncEnemyPeople} from '../modules/enemy-person-state.js';
import {setActorMoney,syncActiveActor} from '../actor-projection.js';
import {serialize} from '../engine.js';
export const assetContext=enemyPersonContext;
export function assetFixture({guard=false,materials=false}={}){
 const f=enemyPersonFixture({x:50,life:true}),{s,h,a,p,enemy}=f;for(const id of ['asset-risk','goods-cycle','local-market'])setModule(s,id,true);setModule(s,'people',true);for(const other of Object.values(s.people))if(![h.lineage,p.id].includes(other.id))other.status='absent';
 const market=Object.values(s.areas).find(a=>a.civic?.food>=30&&a.civic.tools>1);if(!market)throw Error('No actual native market');h.area=market.id;h.x=42;h.inventory.rations=0;syncActiveActor(s);setActorMoney(s,s.people[h.lineage],200);if(tradeGoods(s,market,h.lineage,'food','buy',16).quantity!==16)throw Error('No real purchased food');
 if(materials){h.x=58;if(tradeGoods(s,market,h.lineage,'tools','buy',1).quantity!==1)throw Error('No actual tool');const wild=Object.values(s.areas).find(a=>['forest','mountain','cave','ruins','island'].includes(a.type)&&!a.interior&&!a.temporaryCamp);h.area=wild.id;if(extractRaw(s,wild,2)!==2)throw Error('No actual raw');s.people[h.lineage].goodsRawCargo={source:wild.id,quantity:2};}
 h.area=a.id;h.x=42;h.combat=null;h.goal=null;syncActiveActor(s);const owner=s.people[h.lineage];owner.roadSupplies.food-=8;const store=spillPackCargo(s,{food:8,medicine:0,tools:0},{owner:h.lineage,area:a.id,x:h.x,name:'Припасы владельца'});if(!store)throw Error('No actual owned store');a.length=80;Object.assign(p.agenda,{wealth:0,duty:.2});Object.assign(p.needs,{hunger:40,energy:100,sleeping:false});enemy.hp=enemy.maxHp;p.health=enemy.hp;a.forage.stock=0;
 const victim=s.people[createPerson(s,{race:'human',role:'торговец',area:a.id,x:65,alive:true,roadSupplies:{food:2,medicine:0}},{initialJob:'merchant'})];Object.assign(victim.agenda,{duty:.2,task:null,due:1e9});Object.assign(victim.needs,{hunger:0,energy:100,sleeping:false});(a.population ||= []).push(victim.id);a.objects.push({id:'resident-'+victim.id,kind:'resident',person:victim.id,name:victim.name,x:65});
 let defender=null;if(guard){defender=s.people[createPerson(s,{race:'human',role:'страж',area:a.id,x:42,alive:true},{initialJob:'guard'})];Object.assign(defender.agenda,{duty:.8,task:null,due:1e9});Object.assign(defender.needs,{hunger:0,energy:100,sleeping:false});a.population.push(defender.id);a.objects.push({id:'resident-'+defender.id,kind:'resident',person:defender.id,name:defender.name,x:42});}
 syncActiveActor(s);return {...f,store,owner,victim,defender};
}
export function assetPhase(f){f.s.tick=Math.floor(f.s.tick/8)*8+8;hostileLifeTick(f.s,assetContext);syncEnemyPeople(f.s);}
export function assetHungry(f){for(let n=0;n<2&&f.p.roadSupplies.food>0;n++){f.p.needs.hunger=80;assetPhase(f);}f.p.needs.hunger=90;return f;}
export function assetSave(f){syncActiveActor(f.s);syncEnemyPeople(f.s);return serialize(f.s);}
