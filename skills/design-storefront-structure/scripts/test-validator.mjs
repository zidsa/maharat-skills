#!/usr/bin/env node
import fs from"node:fs";import os from"node:os";import path from"node:path";import{spawnSync}from"node:child_process";import{fileURLToPath}from"node:url";
const base=JSON.parse(fs.readFileSync(new URL("../examples/example-structure.json",import.meta.url),"utf8")),clone=()=>structuredClone(base),validator=fileURLToPath(new URL("./validate-store-structure.mjs",import.meta.url));
const ready=x=>{x.language="ar";x.direction="rtl";x.customer="عميل يبحث عن المنتج بالمهمة";x.shopping_occasion="شراء مقصود بعد مقارنة البدائل";x.store_promise="وعد معتمد";x.shipping_policy="store/policies/shipping#sa";x.return_policy="store/policies/return#default";x.product_record.status="ready_for_storefront";x.design_status="ready_for_build";x.decision="ready_for_build";x.missing_inputs=[];return x};
const cases=[
 ["valid draft",true,x=>x],
 ["draft product status must be listed",false,x=>{x.missing_inputs=x.missing_inputs.filter(v=>v!=="product_record");return x}],
 ["reorganize cannot hide draft product",false,x=>{x.design_status="needs_reorganization";x.decision="reorganize";x.missing_inputs=[];return x}],
 ["valid ready",true,x=>ready(x)],
 ["draft missing list",false,x=>{x.missing_inputs=[];return x}],
 ["ready draft product",false,x=>{ready(x);x.product_record.status="draft";return x}],
 ["bad artifact ref",false,x=>{x.product_record.artifact_ref="product.json";return x}],
 ["missing page",false,x=>{x.pages=x.pages.filter(p=>p.id!=="cart");return x}],
 ["duplicate page",false,x=>{x.pages.push(structuredClone(x.pages[0]));return x}],
 ["unknown nav target",false,x=>{x.navigation[0].target="missing";return x}],
 ["missing scenario",false,x=>{x.acceptance_scenarios=x.acceptance_scenarios.filter(s=>s.id!=="find-product");return x}],
 ["required scenario NA",false,x=>{x.acceptance_scenarios[0]={id:"find-product",status:"not_applicable",reason:"لا يوجد"};return x}],
 ["compare NA one product",true,x=>x],
 ["compare NA two products",false,x=>{x.products[1].included_in_launch=true;return x}],
 ["single product no exception",false,x=>{delete x.products[0].primary_category_reason;return x}],
 ["category target valid",true,x=>{x.categories=[{id:"care"}];x.products[0].primary_category="care";delete x.products[0].primary_category_reason;x.navigation[0].target="care";return x}],
 ["unknown category",false,x=>{x.products[0].primary_category="missing";return x}],
 ["no launch product",false,x=>{x.products.forEach(p=>p.included_in_launch=false);return x}]
];
let failed=0;for(const[name,expected,mutate]of cases){const d=fs.mkdtempSync(path.join(os.tmpdir(),"structure-")),f=path.join(d,"in.json");fs.writeFileSync(f,JSON.stringify(mutate(clone()),null,2));const r=spawnSync(process.execPath,[validator,f],{encoding:"utf8"}),actual=r.status===0;fs.rmSync(d,{recursive:true,force:true});if(actual!==expected){failed++;console.error(`FAIL ${name}\n${r.stdout}${r.stderr}`)}else console.log(`PASS ${name}`)}if(failed)process.exit(1);console.log(`PASS ${cases.length}/${cases.length}`);
