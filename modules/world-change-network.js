// Canonical backbone, never the observer's atlas. District interiors/temporary
// camps do not become independent world centers by multiplying scene objects.
export function worldBackbone(s){
 const f=s.geographyFrame,ids=f?[...Object.values(f.regions).map(r=>f.sites[r.center]?.area),...Object.values(f.countries).map(c=>f.sites[c.capital]?.area)]:Object.values(s.areas).filter(a=>a.civic&&!a.interior&&!a.temporaryCamp&&(!a.city||a.city===a.id)&&a.era===0).map(a=>a.id);
 return [...new Set(ids.filter(id=>s.areas[id]))].sort();
}
export function worldNetwork(s){
 // Physical backbone only: a lever, missing lift charge or weather phase does
 // not destroy the world's geography. Concrete lasting-damage owners extend
 // their adapter when introducing their actual persistent access contract.
 const centers=worldBackbone(s),links=[];for(const [key,e]of Object.entries(s.edges||{})){const a=s.areas[e.a],b=s.areas[e.b];if(!a||!b||a.era!==0||b.era!==0||!a.links.includes(b.id)||!b.links.includes(a.id))continue;links.push([key,e.a,e.b]);}links.sort((a,b)=>a[0].localeCompare(b[0]));
 const adjacency=new Map();for(const [,a,b]of links){if(!adjacency.has(a))adjacency.set(a,[]);if(!adjacency.has(b))adjacency.set(b,[]);adjacency.get(a).push(b);adjacency.get(b).push(a);}
 const pairs=[];for(let n=0;n<centers.length;n++){const seen=new Set(),todo=[centers[n]];while(todo.length){const id=todo.pop();if(seen.has(id))continue;seen.add(id);todo.push(...(adjacency.get(id)||[]));}for(let k=n+1;k<centers.length;k++)pairs.push([centers[n],centers[k],seen.has(centers[k])]);}
 return {version:1,kind:'canonical-backbone',centers,pairs,links};
}
export function assessGeography(before,now,source){if(before.centers.length<2||JSON.stringify(before.centers)!==JSON.stringify(now.centers))return {world:false,reason:'Нет сопоставимой канонической мировой сети.'};const old=new Map(before.links.map(e=>[e[0],e])),current=new Map(now.links.map(e=>[e[0],e])),delta=[...new Set([...old.keys(),...current.keys()])].filter(k=>old.has(k)!==current.has(k));
 if(source&&delta.some(key=>!source.effects.some(e=>e.ref.root==='edges'&&e.ref.id===key||e.ref.root==='areas'&&e.ref.path[0]==='links'&&(old.get(key)||current.get(key)).slice(1).includes(e.ref.id))))return {world:false,reason:'Изменение сети не подтверждено последствиями этой причины.'};
 const changed=before.pairs.filter((p,i)=>p[2]!==now.pairs[i]?.[2]);return {world:changed.length>0,reason:changed.length?'Изменена связность опорной сети мира.':'Местное изменение не перестроило опорную сеть мира.',signature:JSON.stringify(now.pairs),changed};}
