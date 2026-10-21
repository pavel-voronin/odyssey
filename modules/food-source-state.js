import {worldDate} from '../calendar.js';
import {weatherAt} from './weather.js';
import {LOCAL_FOODS} from './food-stores.js';
export function foodSourceState(s,a){
 const f=a?.forage,node=f?.localFood;if(!node)return null;
 const d=worldDate(s,s.tick,a),weather=weatherAt(s,a),closed=node.kind==='mushroom'?['winter','dry'].includes(d.season):d.season==='winter'||weather.id==='storm';
 return{...node,name:LOCAL_FOODS[node.kind].name,stock:f.stock,max:f.max,x:f.x,open:!closed,available:!closed&&f.stock>0,condition:closed?(node.kind==='mushroom'?'В этот сезон грибы не собирают.':'Ловля закрыта: лёд или гроза.'):f.stock<=0?'Источник истощён.':'Сейчас добыча доступна.'};
}
