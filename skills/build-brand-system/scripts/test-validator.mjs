#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const base = JSON.parse(fs.readFileSync(new URL("../examples/example-brand-system.json", import.meta.url), "utf8"));
const clone = () => structuredClone(base);
const validatorPath = fileURLToPath(new URL("./validate-brand-system.mjs", import.meta.url));
const cases = [
  ["valid", true, x=>x],
  ["missing positioning source", false, x=>{x.positioning.source_refs=[];return x}],
  ["unsupported claim ref", false, x=>{x.brand_promise.claim_refs=["missing"];return x}],
  ["claim without evidence", false, x=>{x.approved_claims[0].evidence_refs=[];return x}],
  ["absolute claim", false, x=>{x.message_hierarchy[0].text="الأفضل بلا منافس";return x}],
  ["absolute claim in application", false, x=>{x.applications[0].copy="الأفضل في السعودية";return x}],
  ["absolute claim via weak overlapping claim", false, x=>{x.approved_claims.push({id:"claim-country",text:"السعودية",evidence_refs:["src-catalog"]});x.applications[0].copy="الأفضل في السعودية";x.applications[0].claim_refs=["claim-country"];return x}],
  ["zid palette on independent brand", false, x=>{x.visual_system.colors=[{"role":"text-primary","value":"#1F0433","source_ref":"src-brand-assets"},{"role":"accent","value":"#AE72FF","source_ref":"src-brand-assets"}];return x}],
  ["visual owner mismatch", false, x=>{x.visual_system.identity_owner="زد";return x}],
  ["missing owner authorization", false, x=>{x.brand_owner.authorization_ref="missing";return x}],
  ["missing proof role", false, x=>{x.message_hierarchy=x.message_hierarchy.filter(m=>m.role!=="proof");return x}],
  ["proof without claim", false, x=>{x.message_hierarchy.find(m=>m.role==="proof").claim_refs=[];return x}],
  ["two voice traits", false, x=>{x.voice_traits=x.voice_traits.slice(0,2);return x}],
  ["missing voice example", false, x=>{x.voice_traits[0].approved_example="";return x}],
  ["bad color", false, x=>{x.visual_system.colors[0].value="purple";return x}],
  ["unknown color source", false, x=>{x.visual_system.colors[0].source_ref="missing";return x}],
  ["contrast fails", false, x=>{x.visual_system.contrast_checks[0]={foreground:"#777777",background:"#888888",context:"normal_text"};return x}],
  ["missing contrast", false, x=>{x.visual_system.contrast_checks=[];return x}],
  ["missing application", false, x=>{x.applications=x.applications.filter(a=>a.surface!=="product");return x}],
  ["unknown voice trait", false, x=>{x.applications[0].voice_traits=["خيالية"];return x}],
  ["review has unknown", false, x=>{x.unknowns=["لون ثانوي"];return x}],
  ["bad source path", false, x=>{x.source_register[0].url_or_path="positioning.json";return x}],
  ["proposed with basis is valid", true, x=>{x.visual_system.mode="proposed";return x}]
];
let failed=0;
for (const [name, expected, mutate] of cases) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"brand-validator-")); const file=path.join(dir,"input.json");
  fs.writeFileSync(file,JSON.stringify(mutate(clone()),null,2));
  const r=spawnSync(process.execPath,[validatorPath,file],{encoding:"utf8"});
  const actual=r.status===0; fs.rmSync(dir,{recursive:true,force:true});
  if(actual!==expected){failed++;console.error(`FAIL ${name}\n${r.stdout}${r.stderr}`)} else console.log(`PASS ${name}`);
}
if(failed) process.exit(1);
console.log(`PASS ${cases.length}/${cases.length}`);
