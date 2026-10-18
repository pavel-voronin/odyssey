import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {receiveItem} from '../modules/inventory.js';
import {syncActiveActor} from '../actor-projection.js';
import {archiveLife} from '../modules/lifecycle.js';
const dir='artifacts/outfit-101';await mkdir(dir,{recursive:true});
const ctx={log(){},random(){throw new Error('existing item has no random draw');}},rows=[];
for(const species of ['human','myconid']){
 const base=createWorld(4);base.hero.race=species;base.hero.x=45;base.hero.lastAction='idle';base.hero.intent='В начале пути';base.hero.reason='Контроль одного человека: меняется только надетый экземпляр.';base.rules.animation=false;syncActiveActor(base);
 for(const stage of ['start','cloth','mail']){
  const s=restore(serialize(base));if(stage!=='start')receiveItem(s,ctx,null,{id:stage==='cloth'?'garment-a':'garment-b',base:stage==='cloth'?'coat':'mail',name:stage==='cloth'?'Красный дорожный плащ':'Кольчуга старого стража',slot:'armor',stat:'defense',power:stage==='cloth'?1:5,rarity:1,value:8,history:[]});syncActiveActor(s);
  const name=`${species}-${stage}`;await writeFile(`${dir}/${name}.json`,serialize(s));rows.push({name,species,stage});
  if(species==='human'&&stage==='mail'){archiveLife(s,'settled','Свой дом');await writeFile(`${dir}/archive.json`,serialize(s));}
 }
}
await writeFile(`${dir}/gallery.html`,`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Проверка одежды одного человека</title><style>body{background:#181b1f;color:#e4e4df;font:14px system-ui;margin:12px}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.scene{width:100%;height:190px;display:block}.portrait{width:32px;height:34px;display:inline-block;vertical-align:middle}h2{font-size:14px}p{font-size:12px;margin:5px 0}section{min-width:0}</style><h1 style="font-size:16px">Один человек · три комплекта</h1><div id="views"></div><script type="module">
import {Scene} from '/scene.js';import {restore,serialize} from '/engine.js';import {drawHeroPortrait} from '/portrait.js';
const rows=${JSON.stringify(rows)},root=document.querySelector('#views');let group;
for(const row of rows){if(row.stage==='start'){group=document.createElement('div');group.className='row';root.append(group);}const box=document.createElement('section');box.innerHTML='<h2>'+row.species+' · '+row.stage+'</h2><canvas class="portrait"></canvas><p></p><canvas class="scene"></canvas>';group.append(box);const s=restore(await(await fetch(row.name+'.json')).text()),before=serialize(s),scene=new Scene(box.querySelector('.scene'));scene.update(s);drawHeroPortrait(box.querySelector('.portrait'),s);box.querySelector('p').textContent=s.hero.name+' '+s.hero.family;box.dataset.readonly=String(before===serialize(s));}
</script>`);
console.log(dir);
