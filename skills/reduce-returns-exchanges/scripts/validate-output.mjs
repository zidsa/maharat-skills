#!/usr/bin/env node
import fs from "node:fs";
export function validate(markdown){
 const errors=[]; const hs=["## النطاق وجودة البيانات","## قاموس الأسباب","## خط الأساس والمقام","## السبب الأول ودليله","## الإصلاح الواحد","## القياس والحراس","## المجهولات وما لم يُنفذ"];
 for(const h of hs) if(!markdown.includes(h)) errors.push(`قسم مفقود: ${h}`);
 if(!/(الوحدات المسلمة|المقام)/.test(markdown)) errors.push("مقام المرتجع مفقود");
 if(!/(النص الخام|غير واضح)/.test(markdown)) errors.push("معالجة السبب الخام مفقودة");
 if(!/(إصلاح واحد|الإصلاح:)/.test(markdown)) errors.push("الإصلاح الواحد مفقود");
 if(/(غيّرنا السياسة|منعنا الإرجاع|العميل مخطئ|تم الإصلاح)/.test(markdown)) errors.push("حكم أو تنفيذ غير مسموح");
 return errors;
}
if(process.argv[1]?.endsWith("validate-output.mjs")){const errors=validate(fs.readFileSync(process.argv[2],"utf8"));console.log(JSON.stringify({valid:!errors.length,errors},null,2));if(errors.length)process.exit(1);}
