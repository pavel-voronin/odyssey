import {ecologyOn,wildGrazer,newEcologyAnimal} from './ecology-state.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {recordRemains,bodyRemains} from './remains.js';
import {markActorDeath,actorFact} from '../actor-facts.js';
import {enemyDamage} from './adversaries.js';
import {predatorCarrionTurn} from './predator-carrion.js';
import {weatherAt} from './weather.js';
const stepTo=(a,e,x)=>{e.facing=Math.sign(x-e.x)||e.facing||1;e.x+=areaStep(a,e.x,x,3);};
function death(s,a,e,cause){if(!e.alive)return bodyRemains(s,e);e.hp=0;e.alive=false;e.resolved=true;e.ecology.died=s.tick;e.ecology.cause=cause;e.ecology.action='dead';markActorDeath(s,e,e.id,e.shape);return recordRemains(s,e,{kind:'enemy',id:e.id,area:a.id,x:e.x,shape:e.shape,cause});}
export function ecologyPlants(s,a){const r=a.ecology;if(!ecologyOn(s)||!r||r.lastPlants===s.tick||s.tick%4)return;r.lastPlants=s.tick;for(const p of r.patches)if(s.tick>=p.nextGrowth){const w=weatherAt(s,a);if(['rain','storm'].includes(w.id)){p.rain++;const before=p.water;p.water=Math.min(4,p.water+1);p.overflow+=before+1-p.water;}if(p.seeds&&p.soil&&p.water&&p.stock<=10&&!['snow','frost'].includes(w.id)){p.seeds--;p.soil--;p.water--;p.seedUsed++;p.waterUsed++;p.stock+=2;p.grown+=2;}p.nextGrowth=s.tick+240;}}
export function ecologyTurn(s,a,e,ctx={}){const q=e.ecology;if(!q)return false;if(!ecologyOn(s))return true;if(!e.alive){q.action='dead';return true;}if(s.tick%4||q.lastTick===s.tick)return true;q.lastTick=s.tick;
 if(ctx.fighting?.has(e.id)){if(q.diet==='predator')predatorCarrionTurn(s,a,e,ctx);else{const n=q.needs;n.accrued++;n.overflow+=Math.max(0,n.hunger+1-100);n.hunger=Math.min(100,n.hunger+1);}q.action='combat';return true;}
 if(q.diet==='predator'){
  const acted=predatorCarrionTurn(s,a,e,ctx),n=e.predator;if(!n)return true;if(n.hunger>=100){e.hp=Math.max(0,e.hp-1);if(!e.hp){death(s,a,e,{kind:'starvation'});return true;}}if(acted){q.action=n.history.at(-1)?.kind==='rest'?'rest':'carrion';return true;}
  const humans=Object.values(s.people).some(p=>p.alive&&p.area===a.id&&['resident','wandering'].includes(p.status)&&physicalDistance(a,e.x,p.x)<=12)||Object.values(s.actorStates||{}).some(h=>h.alive&&!h.transit&&h.area===a.id&&physicalDistance(a,e.x,h.x)<=12);if(humans){q.action='avoid';q.target=null;return true;}
  const prey=a.objects.filter(p=>p.alive&&wildGrazer(p)&&physicalDistance(a,e.x,p.x)<=18).sort((p,b)=>physicalDistance(a,e.x,p.x)-physicalDistance(a,e.x,b.x)||p.id.localeCompare(b.id))[0];
  if(n.hunger>=60&&prey){q.target=prey.id;if(physicalDistance(a,e.x,prey.x)>2){stepTo(a,e,prey.x);n.energy=Math.max(0,n.energy-1);q.action='stalk';return true;}const before=prey.hp,hit=enemyDamage(s,prey,e.attack,'physical',ctx,false);prey.hp=Math.max(0,prey.hp-hit);n.energy=Math.max(0,n.energy-2);q.action='hunt';actorFact(s,'attack',e.id,prey.id);actorFact(s,'hurt',prey.id,e.id,before-prey.hp);if(!prey.hp)death(s,a,prey,{kind:'predation',enemy:e.id});return true;}
  q.target=null;q.action='wait';return true;
 }
 const n=q.needs;n.accrued++;n.overflow+=Math.max(0,n.hunger+1-100);n.hunger=Math.min(100,n.hunger+1);
 const closeFood=a.ecology.patches.some(p=>p.stock>0&&physicalDistance(a,e.x,p.x)<=1);if(n.hunger>=100&&!closeFood){n.starved++;e.hp=Math.max(0,e.hp-1);if(!e.hp){death(s,a,e,{kind:'starvation'});return true;}}if(n.energy<15){n.energy=Math.min(100,n.energy+4);q.action='rest';return true;}
 const wolf=a.objects.find(o=>o.alive&&o.ecology?.diet==='predator'&&physicalDistance(a,e.x,o.x)<=12);if(wolf){q.action='flee';q.target=wolf.id;const x=Math.max(2,Math.min(98,e.x+Math.sign(e.x-wolf.x||-1)*12));stepTo(a,e,x);n.energy=Math.max(0,n.energy-1);return true;}
 if(!q.mature&&s.tick>=q.matureAt&&q.reserves>=2){q.reserves-=2;q.spent+=2;q.mature=true;q.grown=s.tick;e.maxHp=12;e.hp=Math.min(e.maxHp,e.hp+6);q.action='grow';return true;}
 const patch=a.ecology.patches.filter(p=>p.stock>0&&physicalDistance(a,e.x,p.x)<=24).sort((p,b)=>physicalDistance(a,e.x,p.x)-physicalDistance(a,e.x,b.x))[0];
 if(n.hunger>=60&&patch){q.target=patch.id;if(physicalDistance(a,e.x,patch.x)>1){stepTo(a,e,patch.x);n.energy=Math.max(0,n.energy-1);q.action='browse-walk';return true;}patch.stock--;patch.eaten++;q.grazed++;q.reserves++;const gain=Math.min(20,n.hunger);n.hunger-=gain;n.nutrition+=gain;q.action='graze';return true;}
 const mate=q.mature&&q.reserves>=2&&s.tick>=q.nextBirth&&a.objects.find(o=>o!==e&&o.alive&&wildGrazer(o)&&o.ecology.mature&&o.ecology.reserves>=2&&s.tick>=o.ecology.nextBirth&&physicalDistance(a,e.x,o.x)<=3);
 if(mate&&a.ecology.births.length<2){const child=newEcologyAnimal(s,a,'grazer',ctx,{parents:[e.id,mate.id],young:true,x:e.x});if(child){const m=mate.ecology,before=[q.reserves,m.reserves];for(const p of [q,m]){p.reserves-=2;p.spent+=2;p.nextBirth=s.tick+480;}a.ecology.births.push({at:s.tick,child:child.id,parents:[e.id,mate.id],before,after:[q.reserves,m.reserves],paid:4});q.action='birth';return true;}}
 if(n.hunger>=100&&!patch){q.action='starve';return true;}
 q.action=patch?'rest':'search';q.target=null;if(!patch){const x=e.x>=90?10:e.x<=10?90:(e.facing===-1?10:90);stepTo(a,e,x);n.energy=Math.max(0,n.energy-1);}else n.energy=Math.min(100,n.energy+2);return true;
}
