import {stackRoom} from './container-state.js';
// The caller owns this finite source. Unaccepted units stay there until an
// explicit spill at the same physical place; no copy is made on a read.
export function loadPackCargo(s,cargo,id=s.hero.lineage){
 const p=s.people[id],h=s.hero?.lineage===id?s.hero:s.actorStates?.[id];if(!p)return {food:0,medicine:0,tools:0};const accepted={food:0,medicine:0,tools:0};
 for(const kind of Object.keys(accepted)){const key=kind==='medicine'&&h?'herbs':kind,n=stackRoom(s,id,key,cargo[kind]||0);if(!n)continue;if(kind==='food'){p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food+=n;}else if(kind==='medicine'){if(h)h.inventory.herbs+=n;else {p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.medicine+=n;}}else{p.marketCargo ||= {tools:0};p.marketCargo.tools+=n;}cargo[kind]-=n;accepted[kind]=n;}
 return accepted;
}
export function spillPackCargo(s,cargo,{owner=s.hero.lineage,area=s.hero.area,x=s.hero.x,name='Припасы у поклажи'}={}){
 if(!['food','medicine','tools'].some(k=>cargo[k]>0)||!s.areas[area]||!s.people[owner])return null;const p=s.people[owner];p.nextCargoCache=(p.nextCargoCache||0)+1;
 const o={id:'pack-cargo/'+owner+'/'+p.nextCargoCache,kind:'supplyCache',name,x,food:cargo.food||0,medicine:cargo.medicine||0,tools:cargo.tools||0,taken:false,leftBy:owner};s.areas[area].objects.push(o);for(const k of ['food','medicine','tools'])if(k in cargo)cargo[k]=0;return o;
}

export function canLoadPackCargo(s,cargo,id=s.hero.lineage){const h=s.hero?.lineage===id?s.hero:s.actorStates?.[id];return ['food','medicine','tools'].some(kind=>cargo[kind]>0&&stackRoom(s,id,kind==='medicine'&&h?'herbs':kind,1)>0);}
