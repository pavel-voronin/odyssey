import {assertSameSave} from './life-save-compare.mjs';
function withoutNewRule(text){
 const s=JSON.parse(text);if(s.rules)delete s.rules['combat-judgment'];
 for(const h of [s.hero,...Object.values(s.actorStates||{})])if(h?.ruleFlags)delete h.ruleFlags['combat-judgment'];
 return JSON.stringify(s);
}
export function compareCombatSaves(left,right,{legacyRule=false,label='combat state'}={}){
 if(legacyRule){left=withoutNewRule(left);right=withoutNewRule(right);}
 try{return assertSameSave(left,right,label);}catch{
  const differences=[];
  function walk(a,b,path=''){
   if(Object.is(a,b)||differences.length>=6)return;
   if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],path+'/'+key);
   else differences.push({path,left:a,right:b});
  }
  walk(JSON.parse(left),JSON.parse(right));throw Error(label+': '+JSON.stringify(differences.length?differences:'collection key order differs'));
 }
}
