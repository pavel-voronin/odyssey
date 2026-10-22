// Lossless transport for large JSON saves; the domain schema and exported JSON stay unchanged.
const PREFIX='odyssey-json-lzw1:',RESET=256,LIMIT=0xd7ff;
function wellFormed(raw){
 if(raw.isWellFormed)return raw.isWellFormed();
 for(let i=0;i<raw.length;i++){
  const c=raw.charCodeAt(i);if(c>=0xdc00&&c<=0xdfff)return false;
  if(c>=0xd800&&c<=0xdbff){const next=raw.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false;}
 }
 return true;
}
export function packJSON(raw){
 if(raw.length<65536||!['{','['].includes(raw[0])||!wellFormed(raw))return raw;
 const bytes=new TextEncoder().encode(raw),dictionary=new Map(),codes=[];let next=257,previous=bytes[0];
 for(let i=1;i<bytes.length;i++){
  const byte=bytes[i],key=previous*256+byte,found=dictionary.get(key);
  if(found!==undefined){previous=found;continue;}
  codes.push(previous);
  if(next<LIMIT)dictionary.set(key,next++);else{codes.push(RESET);dictionary.clear();next=257;}
  previous=byte;
 }
 codes.push(previous);let packed=PREFIX;
 for(let i=0;i<codes.length;i+=8192)packed+=String.fromCharCode(...codes.slice(i,i+8192));
 return packed.length<raw.length?packed:raw;
}
export function unpackJSON(raw){
 if(raw===null||!raw.startsWith(PREFIX))return raw;
 const input=raw.slice(PREFIX.length);if(!input.length)throw Error('Empty compressed save');
 const prefix=new Uint16Array(LIMIT),suffix=new Uint8Array(LIMIT),stack=new Uint8Array(LIMIT);let bytes=new Uint8Array(input.length*4),length=0;
 let next=257,previous=-1,first=0;
 for(let i=0;i<input.length;i++){
  const code=input.charCodeAt(i);if(code>=LIMIT)throw Error('Invalid compressed save code');
  if(code===RESET){next=257;previous=-1;continue;}
  let current=code,n=0;
  if(code===next&&previous>=0){stack[n++]=first;current=previous;}
  else if(code>=next)throw Error('Invalid compressed save');
  while(current>=257){stack[n++]=suffix[current];current=prefix[current];if(n>=LIMIT)throw Error('Invalid compressed save chain');}
  if(current>255)throw Error('Invalid compressed save literal');
  first=current;stack[n++]=first;if(length+n>bytes.length){const grown=new Uint8Array(Math.max(bytes.length*2,length+n));grown.set(bytes);bytes=grown;}while(n)bytes[length++]=stack[--n];
  if(previous>=0&&next<LIMIT){prefix[next]=previous;suffix[next]=first;next++;}
  previous=code;
 }
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,length));
}
export function jsonStorage(storage){return {getItem:key=>unpackJSON(storage.getItem(key)),setItem:(key,value)=>storage.setItem(key,packJSON(value)),removeItem:key=>storage.removeItem(key)};}
// Lazy access also allows importing generation helpers in CPU tests without browser globals.
export const saveStorage={getItem:key=>unpackJSON(localStorage.getItem(key)),setItem:(key,value)=>localStorage.setItem(key,packJSON(value)),removeItem:key=>localStorage.removeItem(key)};
