#!/usr/bin/env node
import fs from "node:fs";
export function validate(markdown){const errors=[];const hs=["## الهدف ونافذة العودة","## الشرائح والاستبعادات","## سبب العودة والعرض","## الرسالة والمتابعة","## التوقف ومنع التكرار","## الاختبار والقياس","## المجهولات وما لم يُنفذ"];for(const h of hs)if(!markdown.includes(h))errors.push(`قسم مفقود: ${h}`);
if(!/(دورة الشراء|الفاصل بين الطلبات|نافذة العودة)/.test(markdown))errors.push("منطق نافذة العودة مفقود");
if(!/(موافقة|opt-in)/.test(markdown))errors.push("موافقة القناة مفقودة");
if(!/(مجموعة مقارنة|holdout)/.test(markdown))errors.push("مجموعة المقارنة مفقودة");
if(!/(منع التكرار|توقف)/.test(markdown))errors.push("ضابط التوقف مفقود");
if(/(050\d{7}|تم الإرسال|خصم خاص لكل العملاء)/.test(markdown))errors.push("بيانات أو تنفيذ/عرض غير مسموح");return errors;}
if(process.argv[1]?.endsWith("validate-output.mjs")){const errors=validate(fs.readFileSync(process.argv[2],"utf8"));console.log(JSON.stringify({valid:!errors.length,errors},null,2));if(errors.length)process.exit(1);}
