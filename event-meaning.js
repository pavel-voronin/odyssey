import {enabled} from './rules.js';
import {profession,ENEMY_SPECIES} from './content.js';
// These are witnessed labels, never a second actor or a live-world resolver.
export function actorReference(h){return {kind:'person',id:h.lineage||null,label:h.name||'Неизвестный путник',role:profession(h.profession).name};}
export function enemyReference(enemy){
 const label=enemy?.name||'Неизвестный противник',species=ENEMY_SPECIES.find(e=>e.id===enemy?.species)?.name;
 return {kind:'enemy',id:enemy?.id||null,label,role:enemy?.boss?'главарь':species||'противник'};
}
export function eventMeaning(s,action,{actor=actorReference(s.hero),target=null,item=null,amount=null,result=null}={}){
 if(!enabled(s,'event-meaning'))return undefined;
 return {version:1,action,actor:{...actor},target:target?{...target}:null,item:item?{...item}:null,amount:Number.isFinite(amount)?amount:null,result:result?{...result}:null};
}
export function deathMeaning(s,cause){return eventMeaning(s,'death',{target:cause?.kind==='enemy'?enemyReference(cause):{kind:'danger',id:null,label:cause?.name||'Причина неизвестна',role:'причина гибели'}});}
export function purchaseMeaning(s,kind,label,price){return eventMeaning(s,'buy',{target:{kind:'person',id:'merchant',label:'Сава',role:'торговец'},item:{kind:'item',id:null,label,role:kind==='potion'?'зелье':'снаряжение'},amount:price,result:{kind,quantity:1}});}
