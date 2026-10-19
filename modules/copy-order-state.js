// Orders reference physical sheets in a real local desk, never archival copies.
export const copyOrders=p=>Object.values(p?.copyWork?.orders||{});
export const copyOrder=(s,id)=>Object.values(s.people).flatMap(copyOrders).find(o=>o.id===id)||null;
export const copyDesk=(s,o)=>s.areas[o?.area]?.objects.find(d=>d.id===o.desk&&d.copyOrder===o.id)||null;
export const copySheets=(s,o)=>copyDesk(s,o)?.items||[];
export function draftContent(parent){return {kind:'scribal-draft',area:parent.content.area,name:parent.content.name,observed:parent.content.observed,text:'Неполная рукопись. Содержание источника ещё не проверено; пользоваться сведениями нельзя.'};}

export function copyRevision(s,g){if(!['textOrderRequest','textOrderWork','textOrderCollect'].includes(g.kind))return null;const p=s.people[s.hero.lineage],o=copyOrder(s,g.order);return [s.rules.texts,s.hero.energy>=30,p.copyWork,o&&[o.status,o.progress,o.collected,copySheets(s,o).map(i=>[i.id,i.textCopy?.content,i.textCopy?.condition])]];}
