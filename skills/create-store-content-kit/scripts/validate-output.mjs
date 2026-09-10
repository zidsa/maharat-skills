#!/usr/bin/env node
import fs from "node:fs";
export function validate(markdown){const errors=[];const hs=["## الهدف والقنوات","## سجل الحقائق والممنوعات","## زوايا المحتوى","## قطع القنوات المطلوبة","## خريطة إعادة الاستخدام","## خطة الإنتاج","## فحص ما قبل النشر","## المجهولات وما لم يُنفذ"];for(const h of hs)if(!markdown.includes(h))errors.push(`قسم مفقود: ${h}`);
if(!/(المصدر|موثقة|متحقق)/.test(markdown))errors.push("سجل الحقائق بلا مصدر");
if(!/(الخطاف|الفكرة).*(CTA|الدعوة|اطلب|شاهد|اكتشف)/s.test(markdown))errors.push("بناء القطعة أو CTA مفقود");
if(!/(إعادة الاستخدام|ما يتغير)/.test(markdown))errors.push("خريطة إعادة الاستخدام مفقودة");
if(/(ترند الآن|تقييمات العملاء تقول|مضمون|تم النشر|تم التصوير)/.test(markdown))errors.push("ادعاء أو تنفيذ غير مسموح");return errors;}
if(process.argv[1]?.endsWith("validate-output.mjs")){const errors=validate(fs.readFileSync(process.argv[2],"utf8"));console.log(JSON.stringify({valid:!errors.length,errors},null,2));if(errors.length)process.exit(1);}
