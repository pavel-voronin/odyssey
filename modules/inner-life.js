import {enabled,moduleRandom} from '../rules.js';

export function initializeInnerLife(s,h){
  if(h.innerLife)return;
  const roll=()=>moduleRandom(s,'inner-life'),awake=roll()<.12,caution=2+Math.floor(roll()*7),loyalty=2+Math.floor(roll()*7);
  h.innerLife={facets:awake?[{id:'caution',name:'Осторожность',weight:caution},{id:'loyalty',name:'Верность слову',weight:loyalty}]:[],spokeAt:h.born-240,history:[],lastAssessment:null};
}
export function innerPerspective(s,q,promise,preparation){
  const h=s.hero,m=h.innerLife,p=h.commitments?.personal;
  const result={promise,preparation,dialogue:''};
  if(!enabled(s,'inner-life')||!m?.facets.some(f=>f.id==='caution')||!m.facets.some(f=>f.id==='loyalty')||q?.status!=='active'||!h.quests.some(v=>v.id===q.id&&v.status==='active')||p?.status!=='active'||Math.abs(promise-preparation)>14)return result;
  const memory=h.commitments.memories.find(v=>v.id===p.cause&&v.kind==='retreat');
  if(!memory)return result;
  // A side argues only from an accepted promise and a remembered retreat, never a future event.
  result.preparation+=m.facets.find(f=>f.id==='caution')?.weight||0;
  result.promise+=m.facets.find(f=>f.id==='loyalty')?.weight||0;
  const urgent=Boolean(q.deadline&&q.deadline-s.tick<180),key=memory.id+'/'+q.id+'/'+urgent;
  m.lastAssessment={tick:s.tick,cause:memory.id,quest:q.id,promise:result.promise,preparation:result.preparation,baseline:promise>=preparation?'promise':'prepare',choice:result.promise>=result.preparation?'promise':'prepare'};
  if(s.tick-m.spokeAt>=240&&!m.history.some(v=>v.key===key)){
    m.spokeAt=s.tick;
    result.dialogue=`Осторожность: «После отступления — сначала оружие». Верность слову: «Но обещано: ${q.title||'помочь'}».`;
    m.history.push({...m.lastAssessment,key,text:result.dialogue});if(m.history.length>12)m.history.shift();
  }
  return result;
}
