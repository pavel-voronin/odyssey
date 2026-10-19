import {packView} from './container-state.js';
import {refugeOn,observeRefuge,finishRefugeSurvey} from './refuge-state.js';
import {knownMigrationDestination,migrationKnownPath,migrationHasFood} from './migration-choice.js';
import {foodCapability,foodSourceState,localFoodChoice,localFoodEnabled} from './local-food.js';
import {physicalDistance} from '../geometry.js';
export {finishRefugeSurvey};
const usableNote=(s,n)=>s.tick-n.seen<=480;
export function foundationKit(s,members,path,kind=null){
 const builder=members.find(p=>p.agenda?.job==='artisan'&&p.agenda.tools>=1&&p.goodsRawCargo?.owner===p.id&&p.goodsRawCargo.quantity>=4&&packView(s,p.id).used+Math.ceil(p.goodsRawCargo.quantity/4)<=24),forager=members.find(p=>(kind?[kind]:['mushroom','fish']).some(k=>foodCapability(s,p,k).allowed));
 return builder&&forager?{builder:builder.id,forager:forager.id,raw:4,tools:1,setupFood:members.length*2,roadFood:members.length*Math.max(1,Math.ceil((path.length-1)/3))}:null;
}
export function chooseFamilyRefuge(s,source,members,from,exclude=null){
 const leader=members[0],town=knownMigrationDestination(s,source,members,from,exclude,true),relatives=leader.navigation?.contacts||[];
 if(town&&(town.note?.work||relatives.some(c=>c.relative&&c.missingAt==null&&c.area===town.a.id)))return {...town,refuge:{version:1,mode:'join',decided:s.tick,x:42,site:null,knowledge:relatives.some(c=>c.relative&&c.missingAt==null&&c.area===town.a.id)?'kin':'work',kit:null}};
 const notes=Object.values(leader.refugeKnowledge||{}).filter(n=>n.area!==exclude&&n.area!==source.id&&usableNote(s,n)).map(n=>({n,path:migrationKnownPath(s,leader,from,n.area)})).filter(c=>c.path.length>0&&c.path.length<=9&&s.areas[c.n.area]?.era===source.era);
 const plots=notes.filter(c=>c.n.mode==='plot'&&!c.n.occupied&&c.n.water&&c.n.food>=members.length*2).sort((a,b)=>a.path.length-b.path.length||a.n.area.localeCompare(b.n.area));
 for(const {n,path}of plots){const kit=foundationKit(s,members,path,n.foodKind);if(from!==source.id||!kit||!members.some(p=>foodCapability(s,p,n.foodKind).allowed)||!migrationHasFood(s,source,members,path)||Math.max(0,source.civic.food-4)<kit.roadFood+kit.setupFood)continue;return {a:s.areas[n.area],name:s.areas[n.area].name,path,note:null,refuge:{version:1,mode:'found',decided:s.tick,x:n.x,site:n.site,knowledge:'survey',kit}};}
 const camps=notes.filter(c=>c.n.mode==='camp').sort((a,b)=>a.path.length-b.path.length||a.n.area.localeCompare(b.n.area));
 if(camps.length){const {n,path}=camps[0];return {a:s.areas[n.area],name:s.areas[n.area].name,path,note:null,refuge:{version:1,mode:'camp',decided:s.tick,x:n.x,site:n.site,knowledge:'visit',kit:null}};}
 return null;
}
export function refugeArrivalAllowed(s,p,g){
 const r=g.refuge,a=s.areas[p.area];if(!r||r.mode==='join')return null;if(p.area!==g.target||physicalDistance(a,p.x,r.x)>12)return false;
 if(r.mode==='camp')return !a.civic&&a.type==='camp'&&a.objects.some(o=>o.id===r.site&&o.kind==='rest'&&!o.closed&&(!o.state||o.state==='intact'));
 const members=g.members.map(id=>s.people[id]).filter(q=>q?.alive),site=a.refugeSite,food=foodSourceState(s,a),kit=foundationKit(s,members,g.knowledge.path,food?.kind);
 return Boolean(!a.civic&&site?.id===r.site&&site.water.kind==='spring'&&food?.available&&food.stock>=members.length&&kit&&kit.builder===r.kit.builder&&kit.forager===r.kit.forager&&!g.cargoLost&&g.cargo.food>=r.kit.setupFood);
}
export function refugePersonalPlan(s,p){
 if(!refugeOn(s)||!localFoodEnabled(s)||p.role==='ребёнок'||p.ailment||p.health<(p.maxHealth||100)*.75)return false;
 const a=s.areas[p.area],g=s.migrations[p.refugeGroup];
 if(g&&['camped','site-ready'].includes(g.status)&&!a.civic){
  const food=localFoodChoice(s,p,null,a);if(food&&p.needs.hunger>35){p.agenda.task={kind:'gather',target:a.id,x:food.x,remaining:food.remaining,home:a.id,foodSource:food.id};return true;}
  p.agenda.task={kind:'rest',target:a.id,x:g.refuge.x,remaining:2};return true;
 }
 if(!a.civic&&a.type==='forest'&&!a.refugeSite&&p.refugeSurvey?.area!==a.id&&a.forage?.localFood&&foodCapability(s,p,a.forage.localFood.kind).allowed&&p.needs.energy>=30){p.agenda.task={kind:'refugeSurvey',target:a.id,x:a.forage.x,remaining:3,turns:0};return true;}
 observeRefuge(s,p);return false;
}
