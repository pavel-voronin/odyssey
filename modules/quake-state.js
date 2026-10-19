export const quakeKey=(a,b)=>[a,b].sort().join('|');
export const quakeDamage=(s,a,b)=>s.edges?.[quakeKey(a,b)]?.rupture;
// A real broken road stays broken when future earthquakes are disabled.
export const quakeBlocked=(s,a,b)=>quakeDamage(s,a,b)?.state==='broken';
export function quakePassage(s,from,to){const d=quakeDamage(s,from,to);if(d?.state!=='broken')return null;return {kind:'rupture',key:quakeKey(from,to),cause:d.cause,x:Number(to.slice(1))>Number(from.slice(1))?100:0,arrival:Number(to.slice(1))>Number(from.slice(1))?5:95,allowed:false,reason:'Землетрясение разрушило участок. Нужен настоящий ремонт или доступный обход.'};}
export const knownQuakeBlocked=(p,from,to)=>p?.ruptureMemory?.known[quakeKey(from,to)]?.state==='broken';
export function quakeTravelLimit(s,t,next){const d=quakeDamage(s,t.from,t.to),m=t.metric;if(d?.state!=='broken'||!m||m.travelled>m.distance*d.position)return next;return Math.min(next,m.distance*d.position);}
