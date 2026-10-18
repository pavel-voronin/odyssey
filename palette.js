import {visualRandom} from './visual-random.js';
// These v2 ranges and hash keys define canonical colors; future source palettes need a new version.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const materials={cloth:[.18,.5,.35,.64],clothDark:[.2,.5,.18,.34],accent:[.34,.72,.32,.7],skin:[.22,.48,.46,.78],hair:[.05,.5,.13,.7],leather:[.18,.45,.14,.34],plaster:[.06,.22,.56,.77],roof:[.1,.28,.24,.44],wood:[.18,.44,.2,.4],stone:[.04,.16,.52,.74],straw:[.2,.42,.42,.65],glass:[.1,.3,.42,.64],biome:[.05,.56,.08,.87]};
const cache=new Map(),CACHE_LIMIT=2048;
export function swatch(material,h,s,l){
  const bounds=materials[material]||materials.cloth;h=(h%360+360)%360;s=clamp(s,bounds[0],bounds[1]);l=clamp(l,bounds[2],bounds[3]);
  h=Math.round(h*100)/100%360;s=Math.round(s*1000)/1000;l=Math.round(l*1000)/1000;
  const key=`${material}/${h.toFixed(2)}/${s.toFixed(3)}/${l.toFixed(3)}`;if(cache.has(key))return cache.get(key);
  const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
  const color='#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
  if(cache.size>=CACHE_LIMIT)cache.delete(cache.keys().next().value);cache.set(key,color);return color;
}
export function paletteCacheSize(){return cache.size;}
export function luminance(hex){const [r,g,b]=[1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;}
export function colorContrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function family(seed,culture){return visualRandom(seed,'dyes:'+String(culture||'travellers'))()*360;}
export function actorPalette(seed,id,culture){
  const rnd=visualRandom(seed,'actor-colors-v2:'+id),base=family(seed,culture),hue=base-55+rnd()*110,light=.38+rnd()*.23,skinHue=18+rnd()*20;
  const look={paletteVersion:2,skin:swatch('skin',skinHue,.25+rnd()*.2,.47+rnd()*.3),hair:swatch('hair',14+rnd()*36,.08+rnd()*.4,.14+rnd()*.54),cloak:swatch('cloth',hue,.22+rnd()*.25,light),trousers:swatch('clothDark',hue+20,.25+rnd()*.15,.2+rnd()*.12),shoes:swatch('leather',20+rnd()*20,.22+rnd()*.2,.16+rnd()*.12),scarfColor:swatch('accent',hue+145+rnd()*50,.4+rnd()*.25,light>.5?.35:.65),capeColor:swatch('cloth',hue-30,.3+rnd()*.18,light>.5?.38:.58),packColor:swatch('leather',22+rnd()*18,.2+rnd()*.2,.23+rnd()*.1)};
  const accentHue=hue+165,dark=swatch('accent',accentHue,.5,.32),bright=swatch('accent',accentHue,.5,.7);
  look.scarfColor=colorContrast(look.cloak,dark)>colorContrast(look.cloak,bright)?dark:bright;
  return look;
}
export function buildingPalette(seed,area,index){
  const rnd=visualRandom(seed,`building-colors-v2:${area.id}:${index}`),hue=family(seed,area.culture)-35+rnd()*70;
  return {plaster:swatch('plaster',hue,.08+rnd()*.14,.6+rnd()*.15),roofColor:swatch('roof',hue+15+rnd()*30,.12+rnd()*.14,.25+rnd()*.16),woodColor:swatch('wood',22+rnd()*18,.2+rnd()*.2,.2+rnd()*.1),doorColor:swatch('wood',25+rnd()*16,.23+rnd()*.16,.2),shutterColor:swatch('cloth',hue-25,.3+rnd()*.2,.37+rnd()*.1),windowColor:swatch('glass',175+rnd()*35,.12+rnd()*.16,.48+rnd()*.12),stoneColor:swatch('stone',hue,.05+rnd()*.09,.58+rnd()*.12),strawColor:swatch('straw',35+rnd()*20,.22+rnd()*.16,.46+rnd()*.13)};
}
export function biomePalette(seed,area,base){
  const rnd=visualRandom(seed,'biome-colors-v2:'+area.id),shift=(rnd()-.5)*24,light=(rnd()-.5)*.08;
  return base.map(hex=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min,l=(max+min)/2;
    const s=d?d/(1-Math.abs(2*l-1)):0,[r,g,b]=rgb;
    const h=!d?0:max===r?60*((g-b)/d%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);
    return swatch('biome',h+shift,s,l+light);
  });
}
