import {ferryOn,FERRY_SEATS,FERRY_CAPACITY} from './ferry-state.js';
import {takeGoods} from './goods.js';
// One finite, pre-existing port business in a new world's initial population.
export function createPortFerry(s,ctx){
 if(!ferryOn(s)||s.ferry||s.hero||s.tick!==0||!s.geographyFrame||s.rules.people===false||s.rules.supply===false)return false;
 const frame=s.geographyFrame,west=frame.sites['port-west'],east=frame.sites['port-east'],a=s.areas[west?.area],b=s.areas[east?.area];if(!a?.civic||!b?.civic||a.civic.food<8||a.civic.tools<2)return false;
 const captain=(a.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.role!=='ребёнок'&&p.agenda?.job==='merchant');if(!captain)return false;
 const foodBefore=a.civic.food,toolsBefore=a.civic.tools;takeGoods(s,a,'food',8,{reason:'initial-ferry-provisions',actor:captain.id});takeGoods(s,a,'tools',2,{reason:'initial-ferry-hull',actor:captain.id});
 const id='ferry/'+a.id+'/'+b.id,deck=ctx.addArea(s,'sea','Палуба парома «Два берега»',0,{boatDeck:{version:1,ship:id},continent:a.continent,realm:'surface',era:a.era,culture:a.culture});
 const docks={};for(const port of [a,b]){const dock={id:'dock/'+id+'/'+port.id,kind:'ferryDock',ship:id,name:'Причал парома',x:50,hp:12,maxHp:12};port.objects.push(dock);docks[port.id]=dock.id;}
 const geometry={version:1,layer:a.spatial.layer,from:{...west.berth},to:{...east.berth}};
 s.ferry={version:1,id,name:'Два берега',owner:captain.id,captain:captain.id,deck,ports:[a.id,b.id],docks,phase:'docked',port:a.id,from:a.id,to:b.id,departure:s.tick+3,voyage:0,distance:Math.round(Math.hypot(east.berth.x-west.berth.x,east.berth.y-west.berth.y)),travelled:0,speed:13,lastTick:s.tick,hull:80,maxHull:80,food:8,seats:FERRY_SEATS,capacity:FERRY_CAPACITY,rigging:1,pause:0,eventDone:false,geometry,passengers:{},history:[],source:{kind:'port-constructor',person:captain.id,area:a.id,at:s.tick,foodBefore,foodAfter:a.civic.food,toolsBefore,toolsAfter:a.civic.tools}};
 captain.ferryDuty={version:1,ship:id,at:s.tick};captain.area=deck;captain.x=74;captain.agenda.task=null;
 ctx.connect(s,a.id,b.id,{mode:'sea',duration:10,cost:6,ferry:id});return true;
}
