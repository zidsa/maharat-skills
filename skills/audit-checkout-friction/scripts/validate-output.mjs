#!/usr/bin/env node
import fs from "node:fs";
export function validate(markdown){const errors=[];const hs=["## النطاق وجودة القمع","## موضع التسرب","## أدلة اختبار الجوال","## العيوب والفرضيات وفجوات القياس","## أولويات الإصلاح","## التجربة والحراس","## المجهولات وما لم يُنفذ"];for(const h of hs)if(!markdown.includes(h))errors.push(`قسم مفقود: ${h}`);
if(!/(البسط|المقام|من .* إلى)/.test(markdown))errors.push("مقام انتقال القمع مفقود");
if(!/(مثبت|فرضية|فجوة قياس)/.test(markdown))errors.push("نوع الدليل غير مصنف");
if(!/(جوال|390|mobile)/i.test(markdown))errors.push("اختبار الجوال مفقود");
const unsafeText=markdown.split("\n").filter(line=>!/(لم تدخل|لم نستخدم|دون بيانات)/.test(line)).join("\n");
if(/(بيانات بطاقة|رقم البطاقة|الدفع يعمل|الدفع متعطل حتمًا|تم الإصلاح)/.test(unsafeText))errors.push("ادعاء أو بيانات حساسة غير مسموحة");return errors;}
if(process.argv[1]?.endsWith("validate-output.mjs")){const errors=validate(fs.readFileSync(process.argv[2],"utf8"));console.log(JSON.stringify({valid:!errors.length,errors},null,2));if(errors.length)process.exit(1);}
