// Physical products remain owned by a canonical person. Opening one product
// removes it before adding food portions; sealed legacy rations are untouched.
export const LOCAL_FOODS={
 mushroom:{name:'Съедобные грибы',unit:'связок',portions:2,turns:3,energy:1,tool:'knife',method:'identify-mushrooms'},
 fish:{name:'Мелкая рыба',unit:'рыбин',portions:4,turns:5,energy:1,tool:'line',method:'line-fishing'}
};
export function foodStores(p){
 return p.localFood ||= {owner:p.id,stock:{mushroom:0,fish:0},obtained:{mushroom:0,fish:0},converted:{mushroom:0,fish:0},delivered:{mushroom:0,fish:0},methods:{},tools:{},history:[]};
}
export function productFood(p){if(!p?.localFood||p.localFood.owner!==p.id)return 0;return Object.entries(LOCAL_FOODS).reduce((n,[id,d])=>n+Math.max(0,p.localFood.stock[id]||0)*d.portions,0);}
export function openProductFood(p,wanted){
 if(!(wanted>0)||!p?.localFood||p.localFood.owner!==p.id)return 0;
 const store=p.localFood;let portions=0;
 for(const [id,d]of Object.entries(LOCAL_FOODS)){const count=Math.min(store.stock[id]||0,Math.ceil(Math.max(0,wanted-portions)/d.portions));if(!count)continue;store.stock[id]-=count;store.converted[id]=(store.converted[id]||0)+count;portions+=count*d.portions;}
 if(portions){p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food=(p.roadSupplies.food||0)+portions;}return portions;
}
export function productBalance(p,id){const q=p?.localFood;if(!q)return 0;return(q.obtained[id]||0)-(q.stock[id]||0)-(q.converted[id]||0)-(q.delivered[id]||0)-(q.cooked?.[id]||0);}
