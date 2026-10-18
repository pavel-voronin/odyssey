// One atomic world step at a time. A slow individual step is never split or skipped.
export function runTickBatch(advance,{limit=250,shouldYield=()=>false,finished=()=>false,now=()=>performance.now()}={}){
 const cap=Math.min(250,Math.max(0,Math.floor(limit))),started=now();let ticks=0;
 while(ticks<cap&&!finished()){
  advance();ticks++;
  if(now()-started>=20||shouldYield())break;
 }
 return ticks;
}
