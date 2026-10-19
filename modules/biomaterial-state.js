import {enabled} from '../rules.js';
export const BIO_MATERIAL={kind:'wolf-fang',name:'Пригодный волчий клык',price:4,work:3,lifetime:720};
export const biomaterialOn=s=>enabled(s,'animal-materials')&&enabled(s,'remains')&&enabled(s,'equipment');
// Called only by the constructor of a genuinely new canonical body. Neither
// visiting an old corpse nor turning this module on can grant another fang.
export function initializeBodyMaterial(s,b,subject){
 if(!biomaterialOn(s)||b.material||b.source.kind!=='enemy'||subject.alive!==false||subject.hp>0||subject.species!=='wolf'||b.death.shape!=='wolf'||subject.tags?.includes('human')||!['fresh','bones'].includes(b.stage))return;
 b.material={version:1,id:b.id+'/fang',kind:BIO_MATERIAL.kind,created:b.death.tick,expires:b.death.tick+BIO_MATERIAL.lifetime,initial:1,remaining:1,lost:0,state:'available',extracted:null,work:null};
}
export function bodyMaterialAvailable(s,b){return Boolean(b?.material?.state==='available'&&b.material.remaining===1&&['fresh','bones'].includes(b.stage)&&(!b.substance||b.substance.structure.remaining>0)&&!b.carrier&&b.position.kind==='area'&&s.tick<=b.material.expires);}
export function biomaterialTick(s){
 for(const b of Object.values(s.remains?.byId||{})){const m=b.material;if(m?.state==='available'&&(s.tick>m.expires||!['fresh','bones'].includes(b.stage))){m.state='spoiled';m.remaining=0;m.lost=1;m.spoiledAt=s.tick;m.work=null;}}
}
export const isFang=item=>item?.kind==='bioMaterial'&&item.base===BIO_MATERIAL.kind&&item.bioMaterial?.species==='wolf';
