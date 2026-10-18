import {enabled} from '../rules.js';
export function innerAssistanceAwake(s){const m=s.hero.innerLife;return enabled(s,'inner-life')&&m?.facets.some(f=>f.id==='caution')&&m.facets.some(f=>f.id==='loyalty');}
// This assessment receives only a witnessed wound/telegraph and actually available helpers.
// Unknown enemy HP, attack, defenses and the future reply are deliberately absent.
export function innerAssistance(s,event,{care,guards,windup,blocked}={}){
 const h=s.hero;if(!innerAssistanceAwake(s)||!h.memory.people.includes(event.person))return null;
 const caution=h.innerLife.facets.find(f=>f.id==='caution').weight,loyalty=h.innerLife.facets.find(f=>f.id==='loyalty').weight;
 const need=event.wound==='critical'?4:event.wound==='wounded'?2:0,help=care*10+loyalty+need;
 const exposure=(h.hp<h.maxHp*.8?4:0)+(h.energy<50?3:0)+(windup?8:0),fight=help+h.personality.courage*8+Math.min(12,h.weapon*2)-caution*1.5-8-exposure,guard=guards[0];
 const scores=[{method:'leave',value:caution+4+exposure},{method:'fight',value:fight},...(guard?[{method:'guard',value:help+caution*.8-2,guard:guard.id}]:[])];
 const choice=blocked?{method:'leave'}:[...scores].sort((a,b)=>b.value-a.value||a.method.localeCompare(b.method))[0];
 const name=s.people[event.person].name,reason=blocked|| (choice.method==='fight'?'Он готов сам вступиться, хотя не знает всей силы противника.':choice.method==='guard'?'Можно попросить знакомого свободного стража. Это помощь другим телом, а не лишний удар героя.':'Не видит посильного вмешательства и не обещает невозможного.');
 const dialogue=`Верность: «${name} сейчас нужна помощь». Осторожность: «${windup?'Виден опасный замах. ':''}${guard?'Рядом есть знакомый страж.':'Надёжного помощника рядом нет.'} Силы противника до конца неизвестны».`;
 return {method:choice.method,...(choice.guard?{guard:choice.guard}:{}),reason:dialogue+' '+reason,inner:{version:1,id:event.id,tick:s.tick,area:event.area,person:event.person,enemy:event.enemy,wound:event.wound,windup:Boolean(windup),caution,loyalty,guards:guards.map(g=>g.id),scores,choice:choice.method,guard:choice.guard||null,blocked:blocked||null,dialogue}};
}
export function rememberInnerAssistance(s,assessment){
 if(!assessment.inner)return;const m=s.hero.innerLife;m.assistance ||= [];if(m.assistance.some(e=>e.id===assessment.inner.id))return;m.assistance.push(structuredClone(assessment.inner));if(m.assistance.length>8)m.assistance.shift();
}
