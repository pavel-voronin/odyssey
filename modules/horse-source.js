import {ridingOn} from './horse-state.js';
import {takeGoods} from './goods.js';
// Called only by actual world/new-area construction; no action or restore reader calls this.
export function createStableHorse(s,newArea=null){
 if(!ridingOn(s)||s.horses||!newArea&&(s.hero||s.tick!==0)||s.rules.people===false||s.rules.supply===false)return;
 const choices=(newArea?[newArea]:Object.values(s.areas)).filter(a=>a.civic&&a.realm==='surface'&&!a.interior&&(!a.city||a.city===a.id)&&a.civic.food>=2).sort((a,b)=>(a.type==='village'?-1:0)-(b.type==='village'?-1:0)||a.id.localeCompare(b.id));
 for(const a of choices){const p=(a.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.role!=='ребёнок'&&p.agenda?.job==='merchant');if(!p)continue;
  const before=a.civic.food;if(takeGoods(s,a,'food',2,{flow:'consumed',reason:'initial-horse-fodder',actor:p.id})!==2)return;
  const id='horse/'+a.id+'/0',x=Math.max(5,Math.min(95,p.x+2));s.horses={version:1,byId:{[id]:{version:1,id,species:'horse',name:'Гнедая Дорога',owner:p.id,keeper:p.id,previousOwner:null,leader:null,rider:null,offset:0,body:{kind:'area',area:a.id,x},hp:45,maxHp:45,energy:100,hunger:10,fodder:2,fearUntil:0,after:0,lastUpkeep:s.tick,lastMove:-1,lastAction:-1,ageOrigin:{at:s.tick,years:4},source:{kind:'stable-constructor',person:p.id,area:a.id,at:s.tick,foodBefore:before,foodAfter:a.civic.food,food:2},history:[]}}};a.objects.push({id:'stable/'+id,kind:'stable',name:'Лошадь у коновязи',x,horse:id,owner:p.id});return;
 }
}
