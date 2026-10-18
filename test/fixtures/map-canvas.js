export function mapCanvas(){
 const text=[],ctx=new Proxy({text,measureText:s=>({width:String(s).length*6}),fillText(s,x,y){text.push({s,x,y});}},{get:(o,k)=>k in o?o[k]:()=>{}});
 return {ctx,createCanvas:()=>({width:0,height:0,getContext:()=>ctx})};
}
