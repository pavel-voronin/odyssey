// A prepared already active current watch body/order. This fixture does not issue
// a new council command and is never imported by the game or restore.
import {areaScale,routeDistance} from '../../geometry.js';
import {enabled} from '../../rules.js';
import {createPerson} from '../../modules/lineage.js';
import {markNPCDeparture} from '../../modules/npc-control.js';
import {provisionWatch,watchNote} from '../../modules/watch-needs.js';
import {pathHasFord} from '../../modules/fords.js';
import {grateAt} from '../../modules/mechanism-policy.js';
import {liftAt} from '../../modules/lift-policy.js';
export function prepareActiveWatch(s,source,crisis,ctx){
  if(!enabled(s,'orders')||!crisis?.enemy||s.society.orders.some(o=>o.enemy===crisis.enemy))return false;
  const family=s.people[source.population?.[0]]?.name.split(' ').slice(1).join(' ')||s.hero.family;
  const id=createPerson(s,{name:'Фарен '+family,race:s.hero.race,role:'страж',area:source.id,parents:[],alive:true,health:60,maxHealth:60,attack:5+s.hero.career.rank,status:'marching',procedural:true});
  const path=ctx.route(s,source.id,crisis.area),long=path.some(id=>areaScale(s.areas[id])!==1),travelTicks=Math.max(12,Math.ceil(routeDistance(s,path)/100*12));
  const mechanismWalk=path.some((id,i)=>i>0&&(grateAt(s,path[i-1],id)||liftAt(s,path[i-1],id)));
  s.society.orders.push({...(mechanismWalk?{mechanismWalk:true}:{}),...(long?{returnTicks:travelTicks}:{}),...(pathHasFord(s,path)?{fordWalk:true}:{}),person:id,owner:s.hero.lineage,from:source.id,to:crisis.area,enemy:crisis.enemy,stage:'marching',remaining:travelTicks});
  markNPCDeparture(s,s.people[id],'orders');
  provisionWatch(s,s.people[id],source);
  if(enabled(s,'npc-watch-needs'))source.objects.push({id:'watch-'+id,kind:'resident',person:id,name:s.people[id].name,x:s.people[id].x??42});
  const text=`${s.people[id].name} выходит по приказу совета. Герой поручает безопасность другому человеку.`;
  if(enabled(s,'npc-watch-needs'))watchNote(s,s.people[id],text,ctx,'orders');else ctx.log(s,text,'orders');return true;
}
