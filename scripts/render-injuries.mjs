import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {injuryFixture} from './injury-scenarios.mjs';
import {heroAppearance} from '../appearance.js';
import {drawHead} from '../actor-head.js';
import {drawHeroPortrait} from '../portrait.js';
import {race} from '../content.js';

// Reusable component renderer for environments without an available browser.
const require=createRequire(path.resolve(process.env.ODYSSEY_NODE_MODULES||'node_modules','package.json'));
const {createCanvas}=require('@napi-rs/canvas'),output=process.argv[2]||'tmp/injuries.png',canvas=createCanvas(900,300),c=canvas.getContext('2d');c.fillStyle='#17201c';c.fillRect(0,0,900,300);c.fillStyle='#e5dfca';c.font='16px sans-serif';
let column=0;for(const [id,kind]of [['human','scar'],['myconid','burn'],['automaton','burn']]){
 const {s}=injuryFixture({race:id,kind}),look=heroAppearance(s),left=column++*300;c.fillStyle='#e5dfca';c.fillText(id+' / '+kind,left+20,24);c.fillText('before',left+25,48);c.fillText('after',left+160,48);
 for(const marked of [false,true]){c.save();c.translate(left+(marked?205:75),200);c.scale(3,3);drawHead(c,{...look,injuryMarks:marked?look.injuryMarks:[]},race(id));c.restore();}
 const portrait=createCanvas(32,34);drawHeroPortrait({getContext:()=>portrait.getContext('2d'),setAttribute(){},classList:{toggle(){}}},s);c.imageSmoothingEnabled=false;c.drawImage(portrait,left+116,214,64,68);
}
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,canvas.toBuffer('image/png'));console.log(path.resolve(output));
