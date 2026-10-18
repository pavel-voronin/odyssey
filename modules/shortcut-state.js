import {enabled} from '../rules.js';
export const shortcutsOn=s=>enabled(s,'delve-shortcuts')&&enabled(s,'delve-layouts')&&enabled(s,'mechanisms')&&enabled(s,'delves');
export const shortcutKey=(a,b)=>[a,b].sort().join('|');
export const isShortcut=(s,a,b)=>Boolean(s.edges?.[shortcutKey(a,b)]?.delveShortcut);
export function knownShortcutBlocked(s,p,a,b){
 if(!isShortcut(s,a,b))return false;
 const key=shortcutKey(a,b),n=p?.mechanisms?.known.find(n=>n.key===key);
 return n?.state!=='open';
}
export function layoutStair(s,a,b){return s.edges?.[shortcutKey(a,b)]?.mode==='stairs'&&Boolean(s.areas[a]?.objects.some(o=>o.kind==='gate'&&o.to===b&&o.layoutDoor)||s.areas[b]?.objects.some(o=>o.kind==='gate'&&o.to===a&&o.layoutDoor));}
