import {periodAt,historicalDate} from './historical-calendar.js';
export function periodDate(s,at){const p=periodAt(s,at);return {version:1,at,period:p?.id??null,name:p?.name??null,year:historicalDate(s,at).civilYear};}
// Only new document/first-observation constructors call this. Copies never date the old work again.
export function dateNewDocument(s,document){if(s.rules['historical-calendar']!==false)document.dating=periodDate(s,document.written);return document;}
export function validatePeriodDate(s,d,at,fail,key){
 if(!d||d.version!==1||!Number.isSafeInteger(at)||at<0||at>s.tick||d.at!==at||!Number.isSafeInteger(d.year)||Object.keys(d).length!==5){fail(key);return;}
 const p=periodAt(s,at),expected=periodDate(s,at);
 if(d.period===null?d.name!==null||d.year!==expected.year||p?.kind==='historical':d.period!==expected.period||d.name!==expected.name||d.year!==expected.year)fail(key);
}
export function documentDateLabel(s,document,label){return label+(document.dating?.name?' · '+document.dating.name:'');}
