import {weaponStylesOn,itemStyle,weaponKnowledge,readyWeapon,knownWeaponCycle} from './weapon-styles.js';
import {weaponDamageRange,incomingReply} from './combat-forecast.js';

export function weaponAlternatives(s,e){
 const h=s.hero;if(!weaponStylesOn(s)||!h.alive||!e.alive||h.combat!==e.id)return [];
 const id=itemStyle(h.equipment.weapon);if(!weaponKnowledge(s,id))return [];
 if(id==='quick'&&h.energy>=2)return [{id:'quick',energy:2,damage:weaponDamageRange(s,e,'quick')}];
 if(id==='heavy'&&readyWeapon(s,e))return [{id:'release',energy:3,damage:weaponDamageRange(s,e,'heavy')}];
 if(id==='heavy'&&h.energy>=5&&!h.weaponWindup)return [{id:'windup',energy:2,damage:{min:0,max:0},followUp:weaponDamageRange(s,e,'heavy')}];
 return [];
}
// Called only after existing medicine/magic/guard/escape choices. Preparation
// never claims a kill or skips the current enemy response. Next action is judged
// again from the actual new state, not a promised two-turn scripted sequence.
export function chooseWeaponStyle(s,e){
 const h=s.hero,options=weaponAlternatives(s,e),ordinary=weaponDamageRange(s,e),reply=incomingReply(s,e);
 const release=options.find(o=>o.id==='release');if(release)return {...release,reason:'Размах готов. Он снова проверяет раны и завершает удар.'};
 const quick=options.find(o=>o.id==='quick');
 if(quick){if(ordinary.min>=e.hp&&quick.damage.min<e.hp)return null;return {...quick,reason:'Он сокращает замах и бережёт силы коротким ударом.'};}
 const windup=options.find(o=>o.id==='windup');if(!windup||ordinary.max>=e.hp||h.hp<=reply.max*2+Math.max(6,h.maxHp*.15)||h.energy<12)return null;
 // A learned alternation is inferred solely from this person's real replies.
 // Unseen or stale phases are not projected by reading the enemy's tactic.
 const known=knownWeaponCycle(s,e),projected=known?{...e,battle:{...e.battle,intent:e.battle.intent==='guard'?'strike':'guard'}}:e;
 const next=weaponDamageRange(s,projected,'heavy');
 if(next.min<e.hp&&!known&&h.personality.courage<=.6)return null;
 if(known&&e.battle.intent!=='guard')return null;
 return {...windup,reason:known?'Он уже видел смену стоек: переждёт щит, чтобы вложиться в следующий удар.':'Сил и здоровья хватает на размах. Он принимает риск ещё одного ответа.'};
}
