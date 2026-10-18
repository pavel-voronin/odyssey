import {createRequire} from 'node:module';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld,connectAreas} from '../engine.js';
import {createGrate,operateGrate} from '../modules/mechanisms.js';
import {drawMechanisms,drawLifts} from '../mechanism-view.js';
import {createLift,workLift} from '../modules/lifts.js';
const require=createRequire(path.resolve(process.env.ODYSSEY_NODE_MODULES||'node_modules','package.json'));
const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(900,460),c=canvas.getContext('2d'),s=createWorld(4);
for(const [a,b]of [['a1','a2'],['a1','a3'],['a2','a3']])connectAreas(s,a,b,{mode:'stairs',duration:2});
const g=createGrate(s,'a1','a2','a3');s.hero.area='a1';s.hero.x=g.lever.x;
for(let i=0;i<2;i++){c.save();c.translate(i*450,0);c.fillStyle='#17201c';c.fillRect(0,0,448,230);c.fillStyle='#d8decb';c.font='16px sans-serif';c.fillText(i?'Открытая решётка':'Закрытая решётка',20,30);c.strokeStyle='#57624c';c.beginPath();c.moveTo(10,190);c.lineTo(440,190);c.stroke();drawMechanisms(c,s,s.areas.a1,x=>15+x*4,190);c.restore();operateGrate(s,s.people[s.hero.lineage],'a1|a2','open');}
const lift=createLift(s,'a2','a3','a1');s.hero.area='a2';s.hero.x=lift.console.x;s.hero.inventory.relics=1;
for(let i=0;i<3;i++){if(i===1){for(let k=0;k<3;k++){s.tick++;workLift(s,s.people[s.hero.lineage],'a2|a3','repair');}s.tick++;workLift(s,s.people[s.hero.lineage],'a2|a3','fuel');}if(i===2){s.tick++;workLift(s,s.people[s.hero.lineage],'a2|a3','dismantle');}c.save();c.translate(i*300,230);c.fillStyle='#17201c';c.fillRect(0,0,298,230);c.fillStyle='#d8decb';c.font='16px sans-serif';c.fillText(['Сломанный подъёмник','Три заряда','После разбора'][i],15,30);drawLifts(c,s,s.areas.a2,x=>10+x*2.6,190);c.restore();}
const output=process.argv[2]||'tmp/mechanisms.png';await mkdir(path.dirname(output),{recursive:true});await writeFile(output,canvas.toBuffer('image/png'));console.log(output);
