import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function poisonFixture({hp=5,until=65,camp=true,potions=0,herbs=0,off=false,tick=0}={}){
 const s=createWorld(5),h=s.hero;for(const id of Object.keys(s.rules))setModule(s,id,false);
 for(const id of ['body','supply'])setModule(s,id,true);setModule(s,'poison-care',!off);setModule(s,'fieldcamp',camp);
 s.tick=tick;h.area='a0';h.x=45;h.hp=hp;h.maxHp=40;h.energy=70;h.hunger=50;h.conditions=[{id:'poison',since:tick,until}];h.inventory.potions=potions;h.inventory.herbs=herbs;h.inventory.rations=1;h.quests=[];h.combat=null;h.transit=null;h.companions=[];h.habits=[];
 for(const a of Object.values(s.areas))a.discovered=a.id==='a0';h.atlas={version:1,known:['a0'],visited:['a0'],roads:[],visits:{a0:1}};
 const a=s.areas.a0;a.objects=a.objects.filter(o=>o.kind!=='enemy');a.forage={stock:6,max:6,x:45,lastGrowth:tick,kind:'Съедобные коренья'};
 h.goal={kind:'forage',area:a.id,x:45,remaining:2,started:tick};h.intent='Собирать еду';h.reason='Начатый сбор перед дальнейшим путём.';syncActiveActor(s);return {s,h,a};
}
