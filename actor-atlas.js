// Knowledge belongs to a person. Area flags retain only the world's historical projection.
const roadKey=(a,b)=>[a,b].sort().join('|');
export function initializeActorAtlas(s,h){
 if(h.atlas?.version)return h.atlas;
 const visited=[...(h.memory?.places||[])];
 const known=new Set(visited);
 for(const id of visited)for(const next of s.areas[id]?.links||[])known.add(next);for(const place of s.people[h.lineage]?.navigation?.places||[])if(s.areas[place.area])known.add(place.area);
 const roads=new Set();for(const id of visited)for(const next of s.areas[id]?.links||[])if(known.has(next))roads.add(roadKey(id,next));
 for(const road of s.people[h.lineage]?.navigation?.roads||[])if(known.has(road.from)&&known.has(road.to))roads.add(roadKey(road.from,road.to));
 h.atlas={version:1,known:[...known],visited:[...new Set(visited)],roads:[...roads],visits:{}};return h.atlas;
}
export function knownArea(s,area){const a=typeof area==='string'?s.areas[area]:area;return Boolean(a&&s.hero.atlas.known.includes(a.id));}
export function visitedArea(s,area){const a=typeof area==='string'?s.areas[area]:area;return Boolean(a&&s.hero.atlas.visited.includes(a.id));}
export function knownRoad(s,a,b){return s.hero.atlas.roads.includes(roadKey(a,b));}
// A synchronous BFS gets its own read-only membership snapshot. It never outlives
// this query or becomes saved knowledge; hazards and live graph edges stay live.
export function routeMembership(s){
 const atlas=s.hero.atlas,areas=s.areas,known=new Set(atlas.known),roads=new Set(atlas.roads);
 return {area(id){const a=areas[id];return Boolean(a&&known.has(a.id));},road(a,b){return roads.has(roadKey(a,b));}};
}
export function revealRoad(s,a,b){const atlas=s.hero?.atlas;if(!atlas||!knownArea(s,a)||!knownArea(s,b)||!s.areas[a]?.links.includes(b))return;const key=roadKey(a,b);if(!atlas.roads.includes(key))atlas.roads.push(key);}
export function revealArea(s,area){const a=typeof area==='string'?s.areas[area]:area;if(!a)return;const atlas=s.hero.atlas;if(atlas&&!atlas.known.includes(a.id))atlas.known.push(a.id);a.discovered=true;if(s.areas[s.hero.area]?.links.includes(a.id))revealRoad(s,s.hero.area,a.id);}
export function hideNewArea(s,area){const a=typeof area==='string'?s.areas[area]:area;if(!a)return;const atlas=s.hero.atlas;if(atlas){atlas.known=atlas.known.filter(id=>id!==a.id);atlas.roads=atlas.roads.filter(key=>!key.split('|').includes(a.id));}a.discovered=false;}
export function recordAreaVisit(s,area){const a=typeof area==='string'?s.areas[area]:area;revealArea(s,a);a.visits++;a.visited=true;const atlas=s.hero.atlas;if(atlas){if(!atlas.visited.includes(a.id))atlas.visited.push(a.id);atlas.visits[a.id]=(atlas.visits[a.id]||0)+1;}}
export function knownDistances(s,from){const distances={[from]:0},queue=[from];for(let i=0;i<queue.length;i++)for(const id of s.areas[queue[i]]?.links||[])if(!(id in distances)&&knownArea(s,id)&&knownRoad(s,queue[i],id)){distances[id]=distances[queue[i]]+1;queue.push(id);}return distances;}
export function observeLocalRoutes(s){const h=s.hero;if(!h.atlas||!h.alive||h.life.ended||h.transit)return;for(const id of s.areas[h.area]?.links||[])if(!s.areas[id]?.temporaryCamp)revealArea(s,id);}
