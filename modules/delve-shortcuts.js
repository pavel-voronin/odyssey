import {enabled} from '../rules.js';
import {shortcutsOn,shortcutKey} from './shortcut-state.js';
import {createGrate} from './mechanisms.js';
export function createDelveShortcut(s,root,ctx){
 const l=root.dungeon?.layout;if(!shortcutsOn(s)||!l||l.built!==s.tick||root.visited||l.shortcut)return false;
 const far=s.areas[l.nodes.find(id=>s.areas[id].dungeon.layoutNode.role==='gallery')],bypass=l.nodes.find(id=>s.areas[id].dungeon.layoutNode.role==='junction');
 ctx.connect(s,root.id,far.id,{mode:'stairs',duration:2});const g=createGrate(s,far.id,root.id,bypass,{wood:enabled(s,'local-materials')&&root.depth%2===0});if(!g)throw Error('Shortcut requires its far-side grate');
 const key=shortcutKey(root.id,far.id),r={version:1,root:root.id,near:root.id,far:far.id,bypass,key,created:s.tick};s.edges[key].delveShortcut=r;l.shortcut={...r};l.links.push([root.id,far.id]);
 for(const [a,b]of [[root,far],[far,root]]){const door=a.objects.find(o=>o.kind==='gate'&&o.to===b.id);door.name='Короткая лестница: '+b.name;door.layoutDoor={version:1,root:root.id,label:door.name,kind:'shortcut'};}
 far.objects.find(o=>o.id===g.lever.id).name='Рычаг короткой лестницы';return r;
}
