const key=(a,b)=>[a,b].sort().join('|');
export const routePointKey=(edge,distance,position,point)=>edge+'/'+distance+'/'+Math.round(position*1e6)+'/'+Math.round(point.x*1e6)+','+Math.round(point.y*1e6);
export function metricMap(s,from,to,arrivalX){
 const a=s.areas[from]?.spatial,b=s.areas[to]?.spatial,e=s.edges?.[key(from,to)]?.spatial,end=e?.ends.find(p=>p.area===from),entry=e?.ends.find(p=>p.area===to);
 if(!a?.anchor||!b?.anchor||a.layer!==b.layer||!Number.isFinite(end?.departureX)||!Number.isFinite(entry?.departureX))return null;
 const point=(p,x)=>({x:p.anchor.x+(x-50)*(p.anchor.sceneScale??1.2),y:p.anchor.y});
 return {version:1,layer:a.layer,from:point(a,end.departureX),to:point(b,entry.departureX)};
}
export function metricMapPoint(s,t,travelled=t?.metric?.travelled){
 const m=t?.metric;if(!m)return null;const e=s.edges?.[key(t.from,t.to)],map=m.map||(e?.spatial?.revision===m.departureVersion?metricMap(s,t.from,t.to,t.arrivalX):null);if(!map)return null;
 const progress=Math.max(0,Math.min(1,travelled/m.distance));return {point:{x:map.from.x+(map.to.x-map.from.x)*progress,y:map.from.y+(map.to.y-map.from.y)*progress,unit:'diagram'},layer:map.layer,precision:'edge',geometryBasis:m.map?'departure-snapshot':'version-matched-edge'};
}
export function routeSiteAnchor(a){const q=a.routeSite;return q?{id:'route-stop/'+q.key,x:q.point.x,y:q.point.y,unit:'diagram',sceneScale:.04,source:'route-stop'}:null;}
