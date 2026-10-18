import {withLimbLook} from './modules/limb-state.js';
import {heroAppearance} from './appearance.js';
import {race} from './content.js';
import {drawHead} from './actor-head.js';
import {drawGarment} from './outfit.js';
const painted=new WeakMap();
export function portraitModel(s){
  const h=s.hero,look=withLimbLook(s.people[h.lineage],s.rules?.appearance===false?h.appearance:heroAppearance(s));
  return {look:portraitLook(look),species:s.rules?.lineage===false?null:race(h.race),alive:h.alive};
}
const portraitLook=look=>Object.fromEntries(['skin','hair','hairStyle','hat','cloak','shoes','glasses','earring','scarf','scarfColor','capColor','coat','armored','trousers','garmentVersion','material','trim','plateColor','edgeColor','injuryMarks'].map(key=>[key,look?.[key]]));
export function drawHeroPortrait(canvas,s){
  const model=portraitModel(s);
  canvas.setAttribute('aria-label',`Портрет: ${s.hero.name}${model.alive?'':'. История завершена'}`);canvas.classList.toggle('deceased',!model.alive);
  paintPortrait(canvas,model);
}
export function drawArchivePortrait(canvas,life){
 const snapshot=life.portraitSnapshot,look=snapshot?.look||life.outfitSnapshot;if(!look)return;
 canvas.setAttribute('aria-label',`Сохранённый портрет: ${life.name}`);
 paintPortrait(canvas,{look:portraitLook(look),species:snapshot?(snapshot.race===null?null:race(snapshot.race)):race(life.race),alive:snapshot?snapshot.alive:life.outcome!=='dead'});
}
function paintPortrait(canvas,model){
  const dpr=Math.min(globalThis.devicePixelRatio||1,2),key=JSON.stringify([model,dpr]);
  if(painted.get(canvas)===key)return;
  canvas.width=32*dpr;canvas.height=34*dpr;const c=canvas.getContext('2d');
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,32,34);c.translate(16,68);c.scale(1.4,1.4);
  if(model.look.garmentVersion===1)drawGarment(c,model.look);
  else {c.fillStyle=model.look.cloak||'#a9c686';c.fillRect(-8,-30,16,10);}
  drawHead(c,model.look,model.species,model.look.cloak||'#a9c686',undefined,true);painted.set(canvas,key);
}
