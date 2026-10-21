import {restoreHealth} from './fresh-reply.js';
import {creditProtection} from './cover-retreat-state.js';
import {woundActivity} from './wound-state.js';
import {actorFact,companionKey} from '../actor-facts.js';
import {npcAction} from './npc-control.js';
import {consumeCarriedSupplies} from './stores.js';
import {enemyDamage} from './adversaries.js';
import {activePower} from './common.js';
import {partyCombatOn,planPartyCombat,presentCombatCompanions,localCombatCompanions,PARTY_COMBAT_POLICY as P} from './party-combat-state.js';
import {pairCombatTick} from './party-combination-state.js';

export function partyCombatTurn(s,e,ctx){
 if(!partyCombatOn(s)||!s.hero.alive||s.hero.hp<=0||!e?.alive||e.resolved)return null;
 const h=s.hero;pairCombatTick(s);
 if(h.partyCombat?.tick===s.tick&&h.partyCombat.enemy===e.id)return h.partyCombat;
 const choices=planPartyCombat(s,e,{skipResponse:Boolean(ctx.skipResponse)});if(!choices.length)return null;
 const round=h.partyCombat={version:1,tick:s.tick,enemy:e.id,people:[],guard:null,replied:false,absorbed:0};
 for(const choice of choices){
  if(!h.alive||h.hp<=0||e.hp<=0||!e.alive)break;
  const c=presentCombatCompanions(s).find(c=>c.person===choice.person),p=c&&s.people[c.person];
  if(!p||p.partyCombat?.tick===s.tick)continue;
  let target=null;
  if(choice.kind==='heal'){
   target=choice.target===h.lineage?h:localCombatCompanions(s).find(c=>c.person===choice.target);
   const injured=target===h?h.hp<h.maxHp:target&&s.people[target.person].health<(s.people[target.person].maxHealth||100);
   if(!injured||(p.roadSupplies?.medicine||0)<choice.medicine)continue;
  }
  if(!npcAction(s,p,'party','combat'))continue;
  const action=p.partyCombat={version:1,tick:s.tick,enemy:e.id,leader:h.lineage,action:choice.kind,target:choice.target,energy:choice.energy,medicine:0,healed:0,damage:0,intercepted:0,reason:choice.reason};
  if(choice.pair)action.pair={started:choice.pair.started,partner:p.id===choice.pair.guard?choice.pair.striker:choice.pair.guard,phase:choice.pair.phase};
  woundActivity(s,p,'arm');round.people.push(p.id);p.needs.energy=Math.max(0,p.needs.energy-choice.energy);
  if(choice.kind==='heal'){
   // The earlier check and claim are synchronous: no other body can spend this
   // finite stock between validation and this one actual operation.
   consumeCarriedSupplies(p,null,'medicine',choice.medicine);action.medicine=choice.medicine;
   if(target===h){const before=h.hp;restoreHealth(s,choice.amount);action.healed=h.hp-before;}
   else {const body=s.people[target.person],before=body.health;body.health=Math.min(body.maxHealth||100,body.health+choice.amount);target.hp=Math.max(1,Math.ceil(target.maxHp*body.health/(body.maxHealth||100)));action.healed=body.health-before;}
   actorFact(s,'heal',companionKey(c),choice.target===h.lineage?'hero':companionKey(target),action.healed);
   ctx.log(s,`${c.name} перевязывает ${target===h?h.name:target.name}: +${action.healed} здоровья, −${action.medicine} лекарства из своего запаса. Вместо удара.`, 'heal');
  }else if(choice.kind==='cover'){
   round.guard=p.id;ctx.log(s,`${c.name} прикрывает ${h.name} вместо своего удара. При попадании часть раны примет на себя.`, 'guard');
  }else if(choice.kind==='prepare'){
   // The guard and preparer both committed this same round before a windup
   // exists. A mere projection or a missing partner never starts one.
   const pair=choice.pair,g=s.people[pair.guard];
   if(g.partyCombat?.tick===s.tick&&g.partyCombat.action==='cover'&&g.partyCombat.pair?.partner===p.id){
    h.pairCombat={version:1,status:'preparing',enemy:e.id,area:h.area,guard:pair.guard,striker:p.id,started:s.tick,strikerHealth:p.health,reason:'Партнёры потратили ход на защищённую подготовку.'};round.protected=p.id;
   }
   ctx.log(s,`${c.name} готовит размах под прикрытием партнёра. В этот ход удара нет.`, 'combat');
  }else{
   let raw=choice.attack;if(activePower(s,e,'armored'))raw=Math.max(1,raw-3);
   const missed=activePower(s,e,'temporal')&&ctx.random(s)<.22;
   const damage=missed?0:enemyDamage(s,e,raw,'physical',ctx),before=e.hp;
   e.hp=Math.max(0,e.hp-damage);action.damage=Math.min(Math.max(0,before),damage);
   actorFact(s,'attack',companionKey(c),e.id);if(action.damage>0)actorFact(s,'hurt',e.id,companionKey(c),action.damage);
   ctx.log(s,`${c.name} наносит свой удар: ${action.damage} урона.`, 'combat');
   if(choice.kind==='paired-attack'){
    h.pairCombat.status='released';h.pairCombat.ended=s.tick;h.pairCombat.reason='Подготовленный размах завершён следующим собственным действием.';round.protected=p.id;
    ctx.log(s,`${c.name} завершает общий приём. Партнёр прикрывал подготовку вместо своих ударов.`, 'combat');
   }
   if(e.hp<=0){round.killer=p.id;break;}
  }
 }
 return round;
}

// One actual enemy reply, split between its primary target and one willing
// guard. The callback owns the existing injury/death/remains bookkeeping.
export function partyCoverDamage(s,e,received,ctx){
 const r=s.hero.partyCombat;
 if(!partyCombatOn(s)||!r||r.tick!==s.tick||r.enemy!==e.id||r.replied)return {received,excluded:[]};
 r.replied=true;const c=localCombatCompanions(s).find(c=>c.person===r.guard),p=c&&s.people[c.person];
 if(!p||p.partyCombat?.tick!==s.tick||p.partyCombat.action!=='cover'||p.partyCombat.enemy!==e.id)return {received,excluded:[]};
 const absorbed=Math.floor(Math.max(0,received)*P.coverShare);r.absorbed=absorbed;p.partyCombat.intercepted=absorbed;
 if(absorbed){const before=c.hp;ctx.hurtCompanion(s,c,absorbed,ctx,e.id);creditProtection(s,e,c,before,c.hp,before-c.hp);ctx.log(s,`${c.name} принимает ${absorbed} урона, прикрывая ${s.hero.name}. Это часть того же ответа противника.`, 'guard');}
 return {received:received-absorbed,excluded:[p.id,...(r.protected?[r.protected]:[])]};
}
