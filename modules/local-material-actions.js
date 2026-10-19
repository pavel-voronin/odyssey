import {SPELLS} from '../content.js';
import {enabled} from '../rules.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {materialsOn,materialBody,materialKnife,materialEvent,removeWoodBlocker} from './local-material-state.js';
import {mechanismMemory} from './mechanism-memory.js';
import {weatherAt} from './weather.js';
import {woundFocus} from './wound-state.js';
import {spellInvoice} from './spell-invoice.js';
import {spendSpellFunding} from './waystone-state.js';
import {wearOwnedItem} from './item-condition.js';
import {npcAction} from './npc-control.js';
const spark=SPELLS.find(p=>p.id==='spark');
const raining=(s,a)=>['rain','storm'].includes(weatherAt(s,a).id);
function safe(s,p,b){return p?.alive&&!p.needs.sleeping&&!p.ailment&&b&&b.energy>=3&&(b.h?!b.h.combat&&b.h.hp>=b.h.maxHp*.5:p.health>=(p.maxHealth||100)*.5)&&!s.areas[b.area].objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(s.areas[b.area],b.x,e.x)<18);}
function flameQuote(s,p,b){return b.h&&enabled(s,'magic')&&woundFocus(s,p)&&b.h.magic.spells.includes('spark')&&(b.h.magic.cooldowns.spark||0)<=s.tick?spellInvoice(s,b.h,spark):null;}
export function materialOperation(s,p,key,action,ctx={}, {inTurn=false}={}){
 const g=s.edges[key]?.mechanism,m=g?.material,b=materialBody(s,p),a=b&&s.areas[b.area];if(!materialsOn(s)||!m||!safe(s,p,b)||b.area!==g.lever.area||physicalDistance(a,b.x,g.lever.x)>9||m.lastActionTick===s.tick||!m.fuel.remaining||m.fire?.status==='burning')return false;
 if(action==='open')action='cut';if(!['inspect','dry','ignite','cut'].includes(action))return false;
 const knife=action==='cut'&&materialKnife(s,p),quote=['dry','ignite'].includes(action)&&flameQuote(s,p,b);
 if(action==='cut'&&!knife||action==='dry'&&(!m.wet||raining(s,a))||action==='ignite'&&(m.wet||raining(s,a))||['dry','ignite'].includes(action)&&(!quote||b.h.magic.mana<quote.manaCost))return false;
 if(!b.h&&!inTurn&&!npcAction(s,p,'personal'))return false;
 let payment=null;if(quote){const before=b.h.magic.mana;if(!spendSpellFunding(s,b.h,quote.totalManaCost,'spark'))return false;payment={spell:'spark',manaBefore:before,manaAfter:b.h.magic.mana,mana:before-b.h.magic.mana,charge:quote.waystoneCost,total:quote.totalManaCost,item:quote.waystoneItem,cast:b.h.magic.casts+1};b.h.magic.casts++;b.h.magic.cooldowns.spark=s.tick+spark.cooldown;}
 const energy=action==='inspect'?1:action==='cut'?3:2;if(b.h){b.h.energy-=energy;b.h.lastAction=quote?'spell':'mechanism';b.h.goal=null;}else p.needs.energy-=energy;
 m.lastActionTick=s.tick;const memory=mechanismMemory(p);let note=memory.known.find(n=>n.key===key);if(!note){note={key,state:g.state,at:s.tick,witness:p.id,leverArea:b.area,understood:true,requiresHold:false};memory.known.push(note);if(memory.known.length>24)memory.known.shift();}note.understood=true;note.state=g.state;note.at=s.tick;memory.lastActionTick=s.tick;
 if(action==='dry')m.wet=0;
 if(action==='ignite')m.fire={version:1,started:s.tick,actor:p.id,payment,status:'burning',lastPhase:-1,affected:[]};
 if(action==='cut'){m.fuel.remaining--;m.fuel.cut++;wearOwnedItem(s,knife,p.id,'gather',g.id);removeWoodBlocker(s,g,p.id);}
 note.state=g.state;note.woodSparkMana=materialRouteNote(s,p).sparkMana;materialEvent(g,{at:s.tick,actor:p.id,action,energy,payment,tool:knife?.id??null,remaining:m.fuel.remaining,wet:m.wet});
 if(p.id===s.hero.lineage||s.hero.area===b.area&&physicalDistance(a,s.hero.x,b.x)<=30)ctx.log?.(s,p.name+(action==='inspect'?' проверяет деревянную заслонку: дерево можно разобрать ножом или сжечь; мокрое сначала нужно высушить.':action==='dry'?' просушивает мокрое дерево знакомой Искрой, расходуя ману.':action==='ignite'?' поджигает сухую заслонку. Огню хватит только оставшегося здесь дерева.':' срезает часть настоящей деревянной заслонки своим рабочим ножом.'),'craft');return true;
}
export function materialBlockedPlan(s,g,ctx){
 const h=s.hero,p=s.people[h.lineage],b=materialBody(s,p);if(!materialsOn(s)||!g.material||!safe(s,p,b)||g.material.fire?.status==='burning'){h.goal=null;return true;}
 const quote=flameQuote(s,p,b),knife=materialKnife(s,p),nearProperty=s.areas[h.area].objects.some(o=>o.building&&physicalDistance(s.areas[h.area],o.x,g.lever.x)<=9),fire=quote&&h.magic.mana>=quote.manaCost&&h.personality.curiosity>=.6&&(!nearProperty||h.personality.courage>.7),action=fire?(g.material.wet?'dry':'ignite'):knife?'cut':null;
 if(!action){h.goal=null;ctx.log?.(s,'Дерево преградило прямой проход. Без подходящего способа он выбирает знакомый обход.','plan');return true;}
 ctx.goal(s,'mechanism',h.area,g.lever.x,action==='cut'?'Разобрать деревянную преграду':action==='dry'?'Просушить деревянную преграду':'Поджечь деревянную преграду','Работа требует отдельного действия и настоящих сил/маны; огонь ограничен оставшимся деревом.',{key:[g.from,g.to].sort().join('|'),operation:action});return true;
}
// Uses the already claimed personal body phase; retains the existing assignment.
export function materialNPCTurn(s,p,ctx){
 const b=materialBody(s,p),to=p.agenda?.task?.target;if(!materialsOn(s)||b?.h||!to||to===b?.area||!safe(s,p,b)||!materialKnife(s,p)||!s.areas[b.area].links.includes(to))return false;
 const key=[b.area,to].sort().join('|'),g=s.edges[key]?.mechanism;if(!g?.material||g.state!=='closed'||g.lever.area!==b.area||g.material.fire?.status==='burning'||physicalDistance(s.areas[b.area],b.x,g.lever.x)>30)return false;
 if(physicalDistance(s.areas[b.area],b.x,g.lever.x)>9){const step=areaStep(s.areas[b.area],b.x,g.lever.x,6);p.x+=step;p.needs.energy-=.7;return true;}
 return materialOperation(s,p,key,'cut',ctx,{inTurn:true});
}

export function materialRouteNote(s,p){const b=materialBody(s,p);return {sparkMana:b?.h&&enabled(s,'magic')&&b.h.magic.spells.includes('spark')?spellInvoice(s,b.h,spark).manaCost:null};}
