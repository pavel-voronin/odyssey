import {heroLevel,careerRank} from './progression-state.js';
import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {dateLabel} from '../calendar.js';
import {observedAge} from './age.js';
const relevant=new Set(['combat','heal','flee','plan','condition','travel','storm','choice','loss','artifact']);
const finite=value=>Number.isFinite(value)?value:null;
export function finalKnownEvents(s,events,tick,person,area){return (Array.isArray(events)?events:[]).filter(e=>e&&Number.isFinite(e.tick)&&typeof e.text==='string'&&e.tick<=tick&&!e.afterLife&&relevant.has(e.type)&&(!e.actor||e.actor===person)).slice(-12).map(e=>({tick:e.tick,text:e.text,type:e.type,area:e.area,date:dateLabel(s,e.tick,s.areas[e.area]||area||{type:'road',continent:'c0',era:0}),...(e.meaning?{meaning:JSON.parse(JSON.stringify(e.meaning))}:{})}));}
export function deathRecord(s,cause,{kind,damage,hpBefore}={}){
 if(!enabled(s,'death-records'))return undefined;
 const h=s.hero,a=s.areas[h.area],t=h.transit;
 const place={id:h.area,label:a?.name||null,date:dateLabel(s,s.tick,a),transit:t?{mode:t.mode,from:t.from,to:t.unknown?null:t.to,fromLabel:s.areas[t.from]?.name||null,toLabel:!t.unknown&&knownArea(s,t.to)?s.areas[t.to]?.name||null:null}:null};
 const events=finalKnownEvents(s,h.timeline||s.journal.slice().reverse(),s.tick,h.lineage,a);
 return {version:1,person:h.lineage,tick:s.tick,born:h.born,name:h.name,family:h.family||'',profession:h.profession,race:h.race,age:observedAge(h,s.tick),level:h.level,effectiveLevel:heroLevel(h),careerRank:careerRank(h),place,kind:kind||(cause?.kind==='enemy'?'battle':'other'),resources:{hpBefore:finite(hpBefore),maxHp:finite(h.maxHp),damage:finite(damage),energy:finite(h.energy),hunger:finite(h.hunger),potions:finite(h.inventory.potions),herbs:finite(h.inventory.herbs),rations:finite(h.inventory.rations),mana:enabled(s,'magic')&&h.magic.maxMana>0?finite(h.magic.mana):null},conditions:(h.conditions||[]).map(c=>c.id),plan:{intent:h.intent||'',reason:h.reason||''},events};
}
