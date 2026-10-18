import {enabled,moduleRandom} from '../rules.js';
import {isTown,profile} from './common.js';

const root=(s,a)=>s.areas[a?.city]||a;
const liveTown=(s,a)=>a&&!a.interior&&!a.temporaryCamp&&isTown(a)&&a.era===0&&(a.danger||0)<=1&&a.civic?.food>0&&!a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved)&&(a.population||[]).some(id=>s.people[id]?.alive&&s.people[id].area===a.id&&s.people[id].status==='resident');
function connected(s,from){
 const seen=new Set(),todo=[from];while(todo.length){const id=todo.pop();if(seen.has(id)||!s.areas[id])continue;seen.add(id);for(const next of s.areas[id].links)if(s.areas[next]?.links.includes(id))todo.push(next);}return seen;
}
// Scenario creation only. These are world facts for choosing an adult's first
// observed location, not remote knowledge granted to the autonomous planner.
export function birthplaceOptions(s,h){
 const seen=connected(s,h.area),parents=(s.people[h.lineage]?.parents||[]).map(id=>s.people[id]).filter(p=>p?.alive&&s.areas[p.area]),skill=profile(h).skill;
 return Object.values(s.areas).filter(a=>seen.has(a.id)&&liveTown(s,a)).map(a=>{
  const town=root(s,a),kin=parents.filter(p=>root(s,s.areas[p.area])?.id===town.id),shops=a.objects.filter(o=>o.kind==='workshop');
  const craft=(a.services?.includes(skill)||skill==='sea'&&a.type==='port')&&(!['craft','time'].includes(skill)||!shops.length||shops.some(o=>o.state==='intact'&&s.people[o.owner]?.alive));
  const weight=2+(a.culture===h.culture?2:0)+(kin.length?3:0)+(craft?4:0)+(a.district==='Жилой посад'&&kin.length?2:0);
  return {area:a.id,city:town.id,weight,kin:kin.map(p=>p.id),craft:Boolean(craft),culture:a.culture};
 });
}
function pick(s,list){let n=moduleRandom(s,'birthplaces')*list.reduce((sum,c)=>sum+c.weight,0);return list.find(c=>(n-=c.weight)<0)||list.at(-1);}
export function prepareBirthplace(s,h,ctx){
 if(!enabled(s,'birthplaces')||!enabled(s,'origins')||h.birthOrigin||h.born!==s.tick||h.actorMode==='npc')return;
 let options=birthplaceOptions(s,h);if(!options.length)return;
 // First choose a genuine town, then its existing/generated distinct streets.
 // A large city is not more likely merely because it has more district screens.
 const towns=[...new Set(options.map(o=>o.city))].map(id=>{const entries=options.filter(o=>o.city===id);return {area:id,weight:Math.max(...entries.map(o=>o.weight))};});
 const selected=pick(s,towns),town=s.areas[selected.area];
 ctx.openSettlement(s,town,{...ctx,log:()=>{}});
 options=birthplaceOptions(s,h).filter(o=>o.city===town.id);
 const chosen=pick(s,options);if(!chosen)return;
 h.area=chosen.area;h.x=s.generation===1?15:22;
 const a=s.areas[h.area];h.birthOrigin={version:1,at:s.tick,area:a.id,city:town.id,culture:h.culture,profession:h.profession,kin:chosen.kin,basis:chosen.craft?'craft':chosen.kin.length?'family':'local-life'};
 h.memory.merchant=s.merchant?.area===a.id?s.merchant.area:null;
 h.intent='Осмотреться: '+a.name;
 h.reason=chosen.craft?'Здесь есть место для знакомого ремесла. Дальнейшие дела ещё предстоит выбрать.':chosen.kin.length?'В этом поселении живут близкие. Он начинает отсюда, сохраняя собственные планы.':'Здесь есть жители, еда и безопасный ночлег. Он ещё решит, чем заняться.';
 h.speech='Посмотрим, как здесь живут.';h.lastAction='idle';
}
