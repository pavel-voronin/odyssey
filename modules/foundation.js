import {refugeOn} from './refuge-state.js';
import {physicalDistance} from '../geometry.js';
import {foodCapability,foodSourceState,localFoodChoice} from './local-food.js';
import {initializeGoodsArea,goodsPutter} from './goods.js';
import {depositCargo} from './stores.js';
import {houseProfile} from '../scenery.js';
import {facadeLayout} from '../facades.js';
import {registerSpatialArea} from './spatial.js';
const ready=p=>p?.alive&&p.role!=='ребёнок'&&!p.ailment&&!p.needs.sleeping&&p.health>=(p.maxHealth||100)*.75&&p.needs.energy>=15&&p.needs.hunger<65;
const group=(s,p)=>s.migrations?.[p.refugeGroup];
const local=(s,p,a,x)=>p?.area===a.id&&!p.roadTransit&&physicalDistance(a,p.x,x)<=2;
function pause(s,r,reason){if(r)r.pause={tick:s.tick,reason};}
export function prepareFoundation(s,p){
 if(!refugeOn(s))return false;const g=group(s,p),a=s.areas[p.area],r=a?.foundation;
 if(g?.status!=='site-ready'||g.refuge?.mode!=='found'||a.id!==g.target||r?.status==='done'||r&&r.group!==g.id||!ready(p)||p.agenda.task&&!['rest','foundationWork'].includes(p.agenda.task.kind))return false;
 if(!r&&p.id!==g.refuge.kit.builder)return false;
 if(r&&!['artisan','farmer','healer'].includes(p.agenda.job))return false;
 p.agenda.task={kind:'foundationWork',target:a.id,x:g.refuge.x,remaining:1,group:g.id};return true;
}
function available(s,p,g,a,r){
 if(!ready(p))return 'health';if(!local(s,p,a,g.refuge.x))return 'position';
 const carrier=s.people[g.carrier],forager=s.people[r?.provider||g.refuge.kit.forager],food=foodSourceState(s,a);
 if(!a.refugeSite||a.refugeSite.id!==g.refuge.site||a.civic||a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(a,o.x,g.refuge.x)<=28))return 'site';
 if(!forager?.alive||forager.area!==a.id||!food?.available||!foodCapability(s,forager,food.kind).allowed)return 'food-source';
 if(g.cargoLost||!carrier?.alive||carrier.area!==a.id||physicalDistance(a,carrier.x,p.x)>40||g.cargo.food<1)return 'food';
 if(!r&&(p.id!==g.refuge.kit.builder||p.agenda.job!=='artisan'||p.agenda.tools<1||p.goodsRawCargo?.owner!==p.id||p.goodsRawCargo.quantity<4))return 'material';return null;
}
function complete(s,a,r,g,ctx){
 r.status='done';r.completed=s.tick;r.tool.state='installed';delete r.pause;
 const present=g.members.map(id=>s.people[id]).filter(p=>p?.alive&&p.area===a.id),rest=r.id+'/shelter',building=a.id+'-building-0';
 a.foundedSettlement={version:1,id:a.id+'/settlement/'+g.id,foundation:r.id,group:g.id,created:s.tick,founders:present.map(p=>p.id),housing:{id:rest,building,x:a.refugeSite.x,capacity:present.length},service:{kind:'food',provider:r.provider,source:a.refugeSite.food}};
 a.population=[...new Set([...(a.population||[]),...present.map(p=>p.id)])];
 a.type='village';a.name='Посёлок «'+r.originalName+'»';a.city=a.id;a.districts=[a.id];
 a.civic={food:0,medicine:0,tools:0,treasury:0,safety:0,tax:0,ruler:null,crisis:null,marketUntil:0,lastEvent:s.tick,completedOffers:[],eventSerial:0};
 initializeGoodsArea(s,a);a.goods.sources={field:{id:a.id+'/fields',place:a.id,initial:0,stock:0,capacity:0,regrown:0,harvested:0,renewedAt:s.tick},materials:{id:a.id+'/raw-materials',place:a.id,initial:0,stock:0,delivered:0,used:0}};
 depositCargo(a,g.cargo,goodsPutter(s,{reason:'foundation-household',actor:g.carrier}));
 const profile={...houseProfile(s.seed,a,0),width:48,floors:1,material:'timber',roof:'thatch',windows:1,porch:false,chimney:false,smoke:false};profile.roofColor=profile.strawColor;
 a.facades={version:1,profiles:[{...profile,id:building,facade:facadeLayout(profile),structure:{version:1,created:s.tick,checked:s.tick,emptyDays:0,roof:3,walls:3,history:[]}}]};
 a.objects.push({id:rest,kind:'rest',name:'Общий дом основателей',x:a.refugeSite.x,building,state:'intact',foundation:r.id});
 r.previousHomes={};for(const p of present){r.previousHomes[p.id]=p.home||g.source;p.home=a.id;p.agenda.home=a.id;p.lastMigration=s.tick;delete p.refugeGroup;if(p.agenda.task?.kind==='foundationWork')p.agenda.task=null;}
 if(a.geography){const site=s.geographyFrame.sites[a.geography.site];site.type='village';site.tier='village';a.geography.tier='village';s.geographyFrame.revision++;}registerSpatialArea(s,a);
 g.status='founded';g.founded=s.tick;g.history.push({tick:s.tick,text:a.name+': семья закончила общий дом и открыла выдачу собранной пищи. Казна пуста.'});if(g.history.length>16)g.history.shift();
 if(s.hero.area===a.id&&!s.hero.transit)ctx.log(s,g.history.at(-1).text,'migration');
}
export function foundationAction(s,p,ctx){
 const t=p.agenda.task;if(t?.kind!=='foundationWork')return false;if(!refugeOn(s))return true;const g=s.migrations[t.group],a=s.areas[p.area];let r=a?.foundation;
 if(!g||g.status!=='site-ready'||g.target!==a?.id||g.refuge?.mode!=='found'||r?.status==='done'||r&&r.group!==g.id){p.agenda.task=null;return true;}
 if(r?.lastWorkTick>=s.tick)return true;
 const reason=available(s,p,g,a,r);if(reason){pause(s,r,reason);p.agenda.task=null;p.agenda.due=s.tick+8;return true;}
 if(!r){const cargo=p.goodsRawCargo,before=cargo.quantity;cargo.quantity-=4;p.agenda.tools--;r=a.foundation={version:1,id:a.refugeSite.id+'/foundation',site:a.refugeSite.id,group:g.id,originalType:a.type,originalName:a.name,status:'building',started:s.tick,progress:0,lastWorkTick:-1,steps:[],provider:g.refuge.kit.forager,material:{kind:'raw',owner:p.id,source:cargo.source,before,after:cargo.quantity,initial:4,remaining:4,consumed:0},tool:{owner:p.id,kind:'building-tool',state:'reserved'}};}
 const energy=p.needs.energy,food=g.cargo.food;g.cargo.food--;p.needs.energy-=2;r.material.remaining--;r.material.consumed++;r.progress++;r.lastWorkTick=s.tick;delete r.pause;r.steps.push({tick:s.tick,actor:p.id,energyBefore:energy,energyAfter:p.needs.energy,foodBefore:food,foodAfter:g.cargo.food,raw:1});p.agenda.work++;p.agenda.task=null;p.agenda.due=s.tick+8;
 if(s.hero.area===a.id&&!s.hero.transit)ctx.log(s,p.name+': общий дом — '+r.progress+'/4. Потрачены материал и порция еды.','migration');
 if(r.progress===4)complete(s,a,r,g,ctx);return true;
}
export function foundedFoodPlan(s,p){
 if(!refugeOn(s)||!ready(p))return false;const a=s.areas[p.area],r=a?.foundedSettlement;if(!r||r.service.provider!==p.id||a.civic.food>=Math.max(12,r.founders.length*2))return false;
 const food=localFoodChoice(s,p,null,a);if(!food)return false;p.agenda.task={kind:'gather',target:a.id,x:food.x,remaining:food.remaining,home:a.id,foodSource:food.id};return true;
}
