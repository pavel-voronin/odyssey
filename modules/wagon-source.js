import {wagonsOn,wagons} from './wagon-state.js';
import {productionSources,takeGoods} from './goods.js';
// A real finite constructor recipe, only at world birth. Restore/enabling cannot
// issue a cart to a previously born world or refill its resources.
export function createWagon(s,newArea=null){
 if(!wagonsOn(s)||!newArea&&(s.hero||s.tick!==0)||wagons(s).length)return;const m=Object.values(s.horses?.byId||{})[0],p=newArea?(newArea.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.role!=='ребёнок'&&p.agenda?.job==='merchant'):s.people[m?.owner],a=newArea||s.areas[p?.area];if(!p||!a?.civic||a.civic.tools<2)return;
 const raw=productionSources(s,a)?.materials;if(!raw||raw.stock<4)return;const wood=raw.stock,tools=a.civic.tools;raw.stock-=4;raw.used+=4;takeGoods(s,a,'tools',2,{reason:'wagon-constructor',actor:p.id});
 a.objects.push({kind:'wagon',id:'wagon/'+a.id+'/0',name:'Дорожная телега',x:Math.min(95,p.x+2),version:1,owner:p.id,horse:null,driver:null,convoy:null,passenger:null,capacity:48,condition:12,wear:0,lastMove:-1,lastAction:-1,items:[],source:{at:s.tick,area:a.id,owner:p.id,wood:{id:raw.id,before:wood,after:raw.stock,units:4},tools:{before:tools,after:a.civic.tools,units:2}},history:[]});
}
