import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {LOCAL_FOODS} from './food-stores.js';
export const BROTH_RECIPE='trail-broth',BROTH_WORK=3,BROTH_WARM=48,BROTH_LIFE=240,MEAL_WARMTH=48;
export const cookingEnabled=s=>enabled(s,'hearth-food')&&enabled(s,'local-food')&&enabled(s,'supply');
export function culinary(p){return p.foodCooking ||= {recipes:{},study:[],pending:null,history:[]};}
export function knowsBroth(s,p){return cookingEnabled(s)&&Boolean(p?.foodCooking?.recipes[BROTH_RECIPE]);}
export function actualHearth(s,area){
 const a=typeof area==='string'?s.areas[area]:area;
 if(!a||a.interior||a.type!=='camp')return null;
 return a.objects.find(o=>o.kind==='rest'&&!o.destroyed&&o.state!=='burned')||null;
}
export function safeCooking(s,h){return Boolean(h?.alive&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.8&&h.energy>=40&&h.hunger<75&&!h.conditions.some(c=>c.id==='poison'&&c.until>s.tick)&&!s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[h.area],h.x,o.x)<=28));}
export function brothIngredient(s,h){
 const p=s.people[h.lineage],q=p?.localFood;
 if(!q||q.owner!==p.id||!(h.inventory.herbs>0))return null;
 // Keep a promised remedy and a hoarder's last herb unless cold is immediate.
 const cold=h.ruleFlags?.body!==false&&h.conditions.some(c=>c.id==='frost'&&c.until>s.tick);
 if(h.quests.some(q=>q.status==='active'&&['herbs','medicine'].includes(q.kind))&&h.inventory.herbs<=1||!cold&&h.habits.includes('hoarder')&&h.inventory.herbs<=1)return null;
 const kind=['mushroom','fish'].find(id=>q.stock[id]>0);return kind?{kind,portions:LOCAL_FOODS[kind].portions,herbs:1}:null;
}
export function kitchenBatch(s,area){return s.areas[area]?.hearthKitchen?.current||null;}
export function edibleBroth(s,h){
 if(!cookingEnabled(s)||!h?.alive||h.transit||h.combat)return null;
 const a=s.areas[h.area],hearth=actualHearth(s,a),b=kitchenBatch(s,h.area);
 return hearth&&b?.status==='ready'&&b.owner===h.lineage&&b.hearth===hearth.id&&b.remaining>0&&b.expires>s.tick?b:null;
}
function history(p,event){const q=culinary(p);q.history.push(event);if(q.history.length>16)q.history.shift();}
export function finishKitchen(s,a,status){
 const k=a?.hearthKitchen,b=k?.current;if(!b||!['preparing','ready'].includes(b.status))return false;
 if(b.status==='ready'){k.lostPortions+=b.remaining;b.lost+=b.remaining;b.remaining=0;}else {b.inputLost=b.inputPortions;k.ruinedInputPortions+=b.inputPortions;}
 b.status=status;b.ended=s.tick;const p=s.people[b.owner];if(p?.foodCooking?.pending?.batch===b.id)p.foodCooking.pending=null;
 if(p)history(p,{id:b.id,tick:s.tick,area:a.id,outcome:status});return true;
}
export function batchWorkMatches(s,h,b){
 const a=s.areas[b?.area],fire=a&&actualHearth(s,a),goal=h?.goal;
 return Boolean(h?.alive&&b&&h.lineage===b.owner&&h.area===b.area&&!h.transit&&!h.combat&&fire&&goal?.area===b.area&&physicalDistance(a,goal.x,fire.x)<=1&&(b.mode==='camp'?goal.kind==='rest':goal.kind==='brothCook'));
}
export function kitchenTick(s,a,ctx=null){
 if(!cookingEnabled(s))return;const b=kitchenBatch(s,a.id);if(!b)return;
 if(!actualHearth(s,a)||!s.people[b.owner]?.alive){finishKitchen(s,a,'abandoned');return;}
 const cook=s.actorStates?.[b.owner]||(s.hero.lineage===b.owner?s.hero:null);
 if(b.status==='preparing'&&(s.people[b.owner].status==='captive'||!batchWorkMatches(s,cook,b))){if(finishKitchen(s,a,'ruined')&&s.hero.area===a.id&&!s.hero.transit)ctx?.log(s,'Готовку пришлось прервать. Травы и добыча испорчены.','food');return;}
 if(b.status==='ready'&&s.tick>=b.expires&&finishKitchen(s,a,'spoiled')&&s.hero.area===a.id&&!s.hero.transit)ctx?.log(s,'Оставленная у очага похлёбка испортилась.','food');
}
export function startBroth(s,h,{mode='goal'}={}){
 if(!cookingEnabled(s)||!safeCooking(s,h)||h.energy<40+BROTH_WORK)return null;
 const p=s.people[h.lineage],a=s.areas[h.area],hearth=actualHearth(s,a),input=brothIngredient(s,h);
 if(!knowsBroth(s,p)||!hearth||physicalDistance(a,h.x,hearth.x)>1||!input)return null;
 if(p.foodCooking.pending||p.foodCooking.lastAction>=s.tick||!batchWorkMatches(s,h,{area:a.id,owner:p.id,mode}))return null;
 kitchenTick(s,a);const previous=kitchenBatch(s,a.id);
 if(previous&&['preparing','ready'].includes(previous.status))return null;
 const q=culinary(p);if(q.pending)return null;
 const k=a.hearthKitchen ||= {hearth:hearth.id,implement:{kind:'fixed-pot',origin:'existing-hearth',portable:false},next:0,inputPortions:0,ruinedInputPortions:0,preparedPortions:0,eatenPortions:0,lostPortions:0,history:[],current:null};
 if(previous){k.history.push(previous);if(k.history.length>16)k.history.shift();}
 const id=a.id+'/broth/'+k.next++;
 p.localFood.stock[input.kind]--;p.localFood.cooked ||= {mushroom:0,fish:0};p.localFood.cooked[input.kind]++;h.inventory.herbs--;
 k.inputPortions+=input.portions;
 const b=k.current={id,recipe:BROTH_RECIPE,owner:p.id,area:a.id,hearth:hearth.id,started:s.tick,mode,status:'preparing',work:0,lastWork:-1,inputPortions:input.portions,ingredients:[{kind:input.kind,quantity:1,owner:p.id},{kind:'herbs',quantity:1,owner:p.id}],initialPortions:0,remaining:0,eaten:0,lost:0};
 q.pending={area:a.id,batch:id,hearth:hearth.id,mode};return b;
}
export function brothWork(s,h){
 if(!cookingEnabled(s))return{finished:false,paused:true};
 const p=s.people[h.lineage],pending=p?.foodCooking?.pending,a=s.areas[pending?.area],b=a&&kitchenBatch(s,a.id),fire=a&&actualHearth(s,a);
 if(!pending||!b||b.id!==pending.batch||b.owner!==p.id||b.status!=='preparing')return{finished:true};
 if(b.lastWork>=s.tick||p.foodCooking.lastAction>=s.tick)return{finished:false};p.foodCooking.lastAction=s.tick;
 if(!batchWorkMatches(s,h,b)||!fire||fire.id!==b.hearth||physicalDistance(a,h.x,fire.x)>1||!safeCooking(s,h)){finishKitchen(s,a,'ruined');return{finished:true,interrupted:true};}
 b.lastWork=s.tick;b.work++;h.energy=Math.max(0,h.energy-1);h.lastAction='work';
 if(b.work<BROTH_WORK)return{finished:false};
 b.status='ready';b.finished=s.tick;b.warmUntil=s.tick+BROTH_WARM;b.expires=s.tick+BROTH_LIFE;b.initialPortions=b.inputPortions;b.remaining=b.initialPortions;a.hearthKitchen.preparedPortions+=b.initialPortions;pending.completed=s.tick;p.foodCooking.pending=null;
 history(p,{id:b.id,tick:s.tick,area:a.id,outcome:'cooked',ingredients:b.ingredients,portions:b.initialPortions});return{finished:true,batch:b};
}
export function eatBroth(s,h,wanted=1){
 const b=edibleBroth(s,h),a=s.areas[h.area],fire=actualHearth(s,a);
 if(!b||physicalDistance(a,h.x,fire.x)>1||b.lastEat===s.tick||s.people[h.lineage].foodCooking.lastAction>=s.tick)return null;
 s.people[h.lineage].foodCooking.lastAction=s.tick;
 const portions=Math.min(b.remaining,Math.max(1,Math.min(4,wanted)));b.remaining-=portions;b.eaten+=portions;b.lastEat=s.tick;a.hearthKitchen.eatenPortions+=portions;
 const warm=s.tick<b.warmUntil;if(warm)culinary(s.people[h.lineage]).warmth={since:s.tick,until:s.tick+MEAL_WARMTH,source:b.id};
 h.hunger=Math.max(0,h.hunger-65);h.counters.meals++;h.lastAction='eat';if(!b.remaining){b.status='eaten';b.ended=s.tick;}return{batch:b.id,portions,warm};
}
export function brothBalance(k){const b=k?.current;return k?k.preparedPortions-k.eatenPortions-k.lostPortions-(b?.status==='ready'?b.remaining:0):0;}
export function brothInputBalance(k){return k?k.inputPortions-k.ruinedInputPortions-k.preparedPortions-(k.current?.status==='preparing'?k.current.inputPortions:0):0;}
export function mealWarmth(s,h=s.hero){const e=s.people[h.lineage]?.foodCooking?.warmth;return cookingEnabled(s)&&h.alive&&e?.until>s.tick?e:null;}
export function foodWalkingStride(s,h=s.hero,tick=s.tick){const frost=h.ruleFlags?.body!==false&&h.conditions.some(c=>c.id==='frost');if(!frost)return 6;const e=mealWarmth(s,h);return e&&tick<e.until?5:4;}
// Forecast only the remaining warm interval, never an entire distant journey.
export function foodWalkingTicks(s,distance,speed=1,start=s.tick){
 if(!cookingEnabled(s)||!mealWarmth(s))return Math.ceil(distance/(foodWalkingStride(s)*speed));
 const warm=Math.max(0,mealWarmth(s).until-start),stride=foodWalkingStride(s,s.hero,start),fast=Math.min(warm,Math.ceil(distance/(stride*speed)));
 return fast+Math.ceil(Math.max(0,distance-fast*stride*speed)/(foodWalkingStride(s,s.hero,Math.max(start,mealWarmth(s).until))*speed));
}
