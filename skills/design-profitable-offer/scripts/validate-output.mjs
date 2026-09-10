#!/usr/bin/env node
import fs from "node:fs";
export function validate(markdown){const errors=[];const hs=["## الهدف والمدخلات","## خط الأساس","## السيناريوهات المحسوبة","## نقطة التعادل والحساسية","## قرار العرض وشروطه","## الاختبار والحراس","## المجهولات وما لم يُنفذ"];for(const h of hs)if(!markdown.includes(h))errors.push(`قسم مفقود: ${h}`);
if(!/(تكلفة البضاعة|دعم الشحن|رسوم الدفع)/.test(markdown))errors.push("عناصر التكلفة مفقودة");
if(!/(هامش المساهمة).*(ر\.س|ريال|غير متحقق)/s.test(markdown))errors.push("هامش المساهمة غير واضح");
if(!/(نقطة التعادل|الزيادة المطلوبة)/.test(markdown))errors.push("نقطة التعادل مفقودة");
if(/(مضمون|سيضاعف|تم إطلاق|تكلفة مفترضة)/.test(markdown))errors.push("ضمان أو تنفيذ/تكلفة مختلقة");return errors;}
if(process.argv[1]?.endsWith("validate-output.mjs")){const errors=validate(fs.readFileSync(process.argv[2],"utf8"));console.log(JSON.stringify({valid:!errors.length,errors},null,2));if(errors.length)process.exit(1);}
