#!/usr/bin/env node
import fs from "node:fs"; const p=process.argv[2]; if(!p){console.error("الاستخدام: node scripts/diagnose-growth-funnel.mjs <funnel.json>");process.exit(2)}
const x=JSON.parse(fs.readFileSync(p,"utf8")); const keys=["sessions","product_views","add_to_carts","checkout_starts","purchases"]; const errors=[];
for(const period of ["current","previous"]){for(const k of keys)if(!Number.isFinite(Number(x[period]?.[k]))||Number(x[period][k])<0)errors.push(`${period}.${k} مفقود أو غير صالح`);for(let i=1;i<keys.length;i++)if(Number(x[period]?.[keys[i]])>Number(x[period]?.[keys[i-1]]))errors.push(`${period}: ${keys[i]} أكبر من المرحلة السابقة`)}
const rates=o=>keys.slice(1).map((k,i)=>({from:keys[i],to:k,count:Number(o[k]),rate:Number(o[keys[i]])?Number(o[k])/Number(o[keys[i]]):null})); const cur=rates(x.current||{}),prev=rates(x.previous||{});
const changes=cur.map((r,i)=>({...r,previous_rate:prev[i]?.rate??null,rate_change:r.rate===null||prev[i]?.rate===null?null:r.rate-prev[i].rate})); const candidate=changes.filter(r=>r.rate_change!==null).sort((a,b)=>a.rate_change-b.rate_change)[0]||null;
console.log(JSON.stringify({valid:!errors.length,errors,current:cur,previous:prev,largest_negative_rate_change:candidate,note:"المكان المرصود ليس سببًا مثبتًا؛ راجع الفرضيات وسجل التغييرات."},null,2));if(errors.length)process.exit(1);
