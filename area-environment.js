// A field camp owns its objects and inhabitants, but shares its parent's living terrain.
// Resolve old saves by reference; never cache a snapshot that could undo world changes.
export function areaEnvironment(s,area={}){
  let a=area||{};const seen=new Set();
  while(a.temporaryCamp){
    if(seen.has(a.id)||!s.areas?.[a.temporaryCamp.parent])return {id:'camp-fallback:'+String(area?.id||''),name:'',type:'road',depth:area?.depth||0,continent:area?.continent,realm:area?.realm,era:area?.era,links:[],objects:[]};
    seen.add(a.id);a=s.areas[a.temporaryCamp.parent];
  }
  return a;
}
