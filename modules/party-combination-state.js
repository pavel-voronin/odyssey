import {npcController} from './npc-control.js';
import {physicalDistance} from '../geometry.js';
import {combinationsOn,pairConsent,learnedPair,PAIR_POLICY as P} from './party-combination-policy.js';

function pairBodies(s,r){
 const members=s.hero.companions,guard=members.find(c=>c.person===r.guard),striker=members.find(c=>c.person===r.striker);
 if(!guard||!striker||guard.attack<=0||striker.attack<2||!pairConsent(s,guard,striker)||!learnedPair(s,r.guard,r.striker))return null;
 for(const c of [guard,striker]){
  const p=s.people[c.person];
  if(!p?.alive||p.health<(p.maxHealth||100)*.65||c.hp<c.maxHp*.65||p.needs.sleeping||p.needs.energy<30||p.needs.hunger>=65||p.area!==s.hero.area||!Number.isFinite(p.x)||physicalDistance(s.areas[p.area],p.x,s.hero.x)>24||npcController(s,p)!=='party')return null;
 }
 if(s.people[r.striker].health<r.strikerHealth)return null;
 return {guard,striker};
}
export function readyPairPreparation(s,e){
 const h=s.hero,r=h.pairCombat;
 if(!combinationsOn(s)||!h.alive||h.hp<=0||h.transit||!r||r.status!=='preparing'||r.area!==h.area||h.combat!==r.enemy||!e?.alive||e.resolved||e.id!==r.enemy||s.tick>r.started+1||s.tick<r.started)return null;
 return pairBodies(s,r);
}
export function pairCombatTick(s){
 const h=s.hero,r=h.pairCombat;if(r?.status!=='preparing')return;
 const e=s.areas[h.area]?.objects.find(o=>o.id===h.combat);
 if(!readyPairPreparation(s,e)){r.status='cancelled';r.ended=s.tick;r.reason='Подготовка прервана: прежний противник, готовый партнёр или безопасное состояние больше недоступны.';}
}
// No reservations, state mutation, RNG or knowledge of a future enemy reply.
export function planPairCombat(s,e,members,{skipResponse=false,coverRisk=0}={}){
 if(!combinationsOn(s)||skipResponse)return [];
 const h=s.hero,r=h.pairCombat;
 let guard,striker,release=false;
 if(r?.status==='preparing'){
  const ready=readyPairPreparation(s,e);
  if(!ready||r.started+1!==s.tick)return [];
  ({guard,striker}=ready);release=true;
 }else{
  if(r?.enemy===e.id)return [];
  for(const g of members){
   const p=s.people[g.person];if(g.attack<=0||g.job!=='Страж'&&p.agenda.job!=='guard'||p.health<(p.maxHealth||100)*.8||p.needs.energy<50||p.needs.hunger>=55||coverRisk>=g.hp*.65)continue;
   const f=members.find(c=>{const q=s.people[c.person];return c!==g&&c.attack>=2&&q.health>=(q.maxHealth||100)*.8&&q.needs.energy>=45&&q.needs.hunger<55&&pairConsent(s,g,c)&&learnedPair(s,g.person,c.person)&&e.hp>4*(g.attack+c.attack);});
   if(f){guard=g;striker=f;break;}
  }
 }
 if(!guard||!striker||![guard,striker].every(c=>members.some(m=>m.person===c.person))||coverRisk>=guard.hp*.65)return [];
 const pair={started:release?r.started:s.tick,guard:guard.person,striker:striker.person,phase:release?'release':'preparation'};
 return [
  {person:guard.person,kind:'cover',target:h.lineage,energy:P.guardEnergy,pair,reason:'Прикрывает общий строй, пока знакомый партнёр готовит размах. Сам не атакует.'},
  {person:striker.person,kind:release?'paired-attack':'prepare',target:e.id,energy:release?P.strikeEnergy:P.prepareEnergy,...(release?{attack:P.multiplier*striker.attack}:{}),pair,reason:release?'Завершает размах, подготовленный своим предыдущим действием под защитой этого партнёра.':'Тратит свой ход на подготовку под защитой знакомого партнёра. Удара в этот тик нет.'}
 ];
}
