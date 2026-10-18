import {WORLD_ROOT,ACTING_ACTOR,rootWorld} from './world-ref.js';
const views=new WeakMap();
export function actorJournal(s,h){
 if(!Array.isArray(h.actorJournal)){
  if(h!==s.hero)throw new Error('У персонажа отсутствует текущий журнал');
  h.actorJournal=s.journal;
 }
 return h.actorJournal;
}
export function bindObservedJournal(s){s.journal=actorJournal(s,s.hero);}
export function actorView(s,h){
 const root=rootWorld(s);let map=views.get(root);if(!map){map=new WeakMap();views.set(root,map);}let view=map.get(h);if(view)return view;
 view=new Proxy(root,{
  get(target,key,receiver){if(key===WORLD_ROOT)return root;if(key===ACTING_ACTOR)return h;if(key==='hero')return h;if(key==='generation')return h.actorGeneration||target.generation;if(key==='journal')return actorJournal(root,h);return Reflect.get(target,key,receiver);},
  set(target,key,value){if(key==='hero'||key==='generation'||key==='tick')throw new Error('An actor phase cannot change identity or world time');return Reflect.set(target,key,value);}
 });map.set(h,view);return view;
}
