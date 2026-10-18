import {enabled} from '../rules.js';
export const guardiansOn=s=>enabled(s,'guardian-nodes')&&enabled(s,'delve-layouts')&&enabled(s,'delves');
export const guardianNode=(s,e)=>e?.guardianWard&&s.areas[e.guardianWard.area]?.objects.find(o=>o.id===e.guardianWard.node&&o.kind==='guardianNode'&&o.guardianSupply?.enemy===e.id);
export const wardPowered=(s,e)=>guardiansOn(s)&&guardianNode(s,e)?.guardianSupply.state==='on';
export function wardDamage(s,e,amount,type,known=false){
 const on=known?guardiansOn(s)&&s.hero.guardianNotes?.enemies[e.id]?.shield==='on':wardPowered(s,e);
 return type==='physical'&&on&&amount>0?Math.max(1,Math.floor(amount*.25)):amount;
}
export function createGuardianNode(s,root,room,enemy){
 if(!guardiansOn(s)||root.dungeon?.layout?.built!==s.tick||root.visited||root.dungeon.layout.guardian||enemy.guardianWard)return false;
 const node={id:room.id+'/guardian-supply',kind:'guardianNode',name:'Питающий камень',x:36,guardianSupply:{version:1,root:root.id,enemy:enemy.id,state:'on',created:s.tick,cut:null}};
 room.objects.push(node);enemy.guardianWard={version:1,area:room.id,node:node.id};root.dungeon.layout.guardian={version:1,area:room.id,node:node.id,enemy:enemy.id,created:s.tick};return node;
}
