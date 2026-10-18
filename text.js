import {elapsedLabel,dateLabel} from './calendar.js';
export const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function formatDurations(value,s){
  let text=String(value??'').replace(/(\d+)\s+тик(?:ов|а)?(?=\s|[.,;:!?)]|$)/g,(_,n)=>elapsedLabel(Number(n)));
  if(s)text=text.replace(/([Кк]) тику (\d+)/g,(_,capital,n)=>`${capital} дате «${dateLabel(s,Number(n),{type:'road',continent:'c0',era:0})}»`);
  return text;
}
export function semanticText(s,text){
  text=formatDurations(text,s);const tokens=[],names=new Map();
  const addName=(name,info)=>{if(!name)return;const old=names.get(name);if(names.has(name)&&(old===null||old.id!==info.id)){names.set(name,null);return;}names.set(name,info);};
  const ids=new Set([s.hero.lineage,...s.hero.memory.people,...s.hero.companions.map(c=>c.person),...(s.areas[s.hero.area].population||[])]);
  for(const id of ids){const p=s.people[id];if(!p)continue;const trust=s.hero.relations[id]?.trust||0;const color=id===s.hero.lineage?'#ffe0a1':trust>=10?'#c4eac1':trust<=-10?'#ffc2b1':'#d0e4ff';addName(p.name,{type:'person',id,color,status:'known'});}
  addName(s.hero.name,{type:'person',id:s.hero.lineage,color:'#ffe0a1',status:'hero'});
  for(const item of [...s.hero.bag,...Object.values(s.hero.equipment).filter(Boolean)])addName(item.name,{type:'item',id:item.id,color:item.rarity>=3?'#d3b477':item.rarity>=2?'#91bac6':'#b4bfa8',status:item.rarity});
  const word=c=>Boolean(c&&/[\p{L}\p{N}_]/u.test(c));
  for(const [name,info] of names){if(!name||!info)continue;let start=text.indexOf(name);while(start>=0){const end=start+name.length;if(!(word(name[0])&&word(text[start-1]))&&!(word(name.at(-1))&&word(text[end])))tokens.push({start,end,...info});start=text.indexOf(name,end);}}
  for(const match of text.matchAll(/◈\s?\d+|\d+\s+(?:зол\.?|монет(?:ы|а)?)/g))tokens.push({start:match.index,end:match.index+match[0].length,type:'money',amount:match[0].match(/\d+/)[0]});
  tokens.sort((a,b)=>a.start-b.start||b.end-a.end);let cursor=0,out='';
  for(const t of tokens){if(t.start<cursor)continue;out+=escapeText(text.slice(cursor,t.start));
    out+=t.type==='money'?`<span class="ref-money" aria-label="${t.amount} монет"><span aria-hidden="true">◈</span> ${t.amount}</span>`:`<span class="ref-${t.type}" data-entity="${escapeText(t.id)}" data-status="${escapeText(t.status)}" style="--reference-color:${t.color}">${escapeText(text.slice(t.start,t.end))}</span>`;
    cursor=t.end;
  }
  return out+escapeText(text.slice(cursor));
}
