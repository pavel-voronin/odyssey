import {revealArea} from '../actor-atlas.js';
import {observeNPCPlace} from './npc-knowledge.js';
import {rootWorld} from '../world-ref.js';
import {houseProfile} from '../scenery.js';
import {facadeLayout} from '../facades.js';
import {registerSpatialArea,registerSpatialEdge} from './spatial.js';
import {HOUSE_PLANS,dwellingActor} from './dwelling-state.js';
export function finishDwelling(input,a,plot,r){
 const s=rootWorld(input),plan=HOUSE_PLANS[r.plan],old=plot.house;let room,door;
 if(!old){const id='a'+s.nextArea++,building=plot.id+'/building',chest=id+'/house-chest';door={id:plot.id+'/door',kind:'door',name:plan.name,owner:r.owner,x:plot.x,to:id,building,state:'intact',dwelling:plot.id,history:[{tick:s.tick,kind:'construction',owner:r.owner,project:r.id}]};
  room={id,type:'room',paletteVersion:2,name:plan.name+' · '+s.people[r.owner].name,depth:a.depth,continent:a.continent,realm:a.realm,era:a.era,culture:a.culture,...(a.climate?{climate:a.climate}:{}),faction:a.faction,danger:0,expanded:true,discovered:false,visited:false,visits:0,links:[a.id],population:[],objects:[{id:id+'-exit',kind:'door',name:'На улицу',x:8,to:a.id},{id:chest,kind:'homeChest',name:'Сундук своего дома',x:56,owner:r.owner,capacity:plan.chest,items:[]}],interior:{version:1,parent:a.id,exterior:a.id,building:door.id,kind:'room',entrance:plot.x},lodging:{version:1,state:'intact',price:0,capacity:plan.capacity,nextBooking:0,booking:null},residence:{version:1,plot:plot.id,house:door.id,title:plot.id+'/title',owner:r.owner,plan:r.plan,capacity:plan.capacity,occupants:[r.owner],chest,state:'ready',created:s.tick},forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'В доме нет диких растений'}};
  s.areas[id]=room;a.links.push(id);a.objects.push(door);s.edges[[a.id,id].sort().join('|')]={a:a.id,b:id,mode:'door',duration:0,cost:0};s.graphRevision=(s.graphRevision||0)+1;
  const profile={...houseProfile(s.seed,a,(a.facades?.profiles.length||0)),id:building,width:plan.width,floors:1,material:'timber',roof:'thatch',porch:false,windows:plan.capacity,chimney:false,smoke:false};profile.roofColor=profile.strawColor;
  a.facades ||= {version:1,profiles:[]};a.facades.profiles.push({...profile,facade:facadeLayout(profile),structure:{version:1,created:s.tick,checked:s.tick,emptyDays:0,roof:3,walls:3,history:[]}});
  plot.house={id:door.id,owner:r.owner,title:plot.id+'/title',room:id,building,plan:r.plan,created:s.tick,lastProject:r.id};registerSpatialArea(s,room);registerSpatialEdge(s,[a.id,id].sort().join('|'));
 }else{
  room=s.areas[old.room];door=a.objects.find(o=>o.id===old.id);const chest=room.objects.find(o=>o.id===room.residence.chest),profile=a.facades.profiles.find(p=>p.id===old.building);old.plan=r.plan;old.lastProject=r.id;door.name=plan.name;door.history.push({tick:s.tick,kind:'refit',owner:r.owner,project:r.id});if(door.history.length>16)door.history.shift();room.name=plan.name+' · '+s.people[r.owner].name;room.residence.plan=r.plan;room.residence.capacity=plan.capacity;room.lodging.capacity=plan.capacity;delete room.residence.works;chest.capacity=room.home?.state==='ready'?Math.max(12,plan.chest):plan.chest;profile.width=plan.width;profile.windows=plan.capacity;profile.facade=facadeLayout(profile);
 }
 if(r.steps.at(-1)?.actor===r.owner){s.people[r.owner].privateHome={area:a.id,plot:plot.id,room:room.id,title:plot.house.title};s.people[r.owner].home=room.id;const actor=dwellingActor(input,s.people[r.owner]);if(actor?.area===a.id)revealArea({...input,hero:actor},room);else observeNPCPlace(s,s.people[r.owner]);}r.completed=s.tick;
 // Unearned escrow remains physically claimable at the same project, never remote cash.
 r.payment.refundTo=r.owner;const available=r.payment.reserved-Object.values(r.payment.claims).reduce((n,c)=>n+c.amount,0);if(available>0){const c=r.payment.claims[r.owner] ||= {person:r.owner,beneficiary:r.owner,amount:0,paid:0,claimed:null};c.amount+=available;}
 return room;
}
