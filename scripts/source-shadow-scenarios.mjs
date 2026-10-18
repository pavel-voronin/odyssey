import {mkdir,writeFile} from 'node:fs/promises';
import {serialize} from '../engine.js';
import {contourFixture} from './contour-shadow-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {lodgingFixture} from './lodging-scenarios.mjs';
const directory='artifacts/source-shadows-92';await mkdir(directory,{recursive:true});
const ordinary=contourFixture({night:true,town:true});setModule(ordinary,'source-shadows',true);await writeFile(`${directory}/ordinary.state.json`,serialize(ordinary));
for(const off of [false,true]){
 const s=contourFixture({species:'myconid',night:true,town:true}),h=s.hero,a=s.areas[h.area];
 setModule(s,'source-shadows',!off);setModule(s,'body',true);setModule(s,'equipment',true);setModule(s,'enchantments',true);
 a.district='Мастерские';h.x=45;h.conditions=[{id:'blessing',since:s.tick,until:s.tick+1000}];
 h.equipment.charm={id:'qa-glow',name:'Лунное стекло',base:'amulet',slot:'charm',stat:'luck',power:0,modifier:'luck',history:[],enchantment:{resonance:0,uses:0,owners:[],counts:{},memory:[]}};
 for(let i=0;i<4;i++)a.objects.push({id:'qa-rift-'+i,kind:'gate',mode:i%2?'time':'portal',x:28+i*13,to:'a0'});
 h.intent='Наблюдение за несколькими источниками';h.reason='Контрольная сцена: кузня, фонари, порталы и реальное свечение героя.';syncActiveActor(s);
 await writeFile(`${directory}/${off?'legacy':'many'}.state.json`,serialize(s));
}
{
 const {s,h,room}=lodgingFixture();for(const key of Object.keys(s.rules))setModule(s,key,false);
 for(const key of ['lighting','contour-shadows','source-shadows','lineage'])setModule(s,key,true);
 s.tick=210;h.area=room.id;h.x=30;h.hp=h.maxHp;h.energy=100;h.hunger=5;h.companions=[];h.combat=null;h.transit=null;h.conditions=[];h.lastAction='idle';h.goal={kind:'routeWait',area:room.id,x:h.x,until:100000};h.intent='Свет в гостевой';h.reason='Контроль настоящего интерьерного источника, без неба.';h.speech='';syncActiveActor(s);
 await writeFile(`${directory}/interior.state.json`,serialize(s));
}
console.log(directory);
