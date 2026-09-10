#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const validator = path.join(scriptDir, "validate-positioning-map.mjs");
const base = JSON.parse(fs.readFileSync(path.join(skillDir, "examples/example-market.json"), "utf8"));
// Keep the valid fixture current while the explicit past-due case still tests expiry.
base.next_test.due_date = new Date().toISOString().slice(0, 10);
const clone = () => structuredClone(base);

const cases = [
  { name: "valid example", mutate: () => {}, status: 0, includes: '"valid": true' },
  { name: "valid negated superlative", mutate: (data) => { data.positioning.statement = "لا ننافس على الأرخص؛ نخدم المشاريع المنزلية بدفعات صغيرة وموعد واضح"; }, status: 0, includes: '"valid": true' },
  { name: "valid advisory negation", mutate: (data) => { data.positioning.statement = "لا تبحث عن الأرخص؛ قارن الحد الأدنى ووضوح موعد الوصول"; }, status: 0, includes: '"valid": true' },
  { name: "valid quantitative more than", mutate: (data) => { data.positioning.statement = "عرض للمشاريع التي تطلب أكثر من 100 صندوق مع موعد وصول موثق"; }, status: 0, includes: '"valid": true' },
  { name: "valid do nothing alternative", mutate: (data) => { data.alternatives[1].type = "do_nothing"; data.alternatives[1].source_url = null; data.alternatives[1].proof_refs = ["notes/round-2#claim-3"]; }, status: 0, includes: '"valid": true' },
  { name: "valid internal store evidence", mutate: (data) => { data.comparisons[0].own_evidence_refs = ["store/catalog#minimum"]; data.positioning.proof_refs = ["store/policies#shipping"]; }, status: 0, includes: '"valid": true' },
  { name: "malformed root", make: () => [], mutate: () => {}, status: 1, includes: "الجذر" },
  { name: "absolute claim", mutate: (data) => { data.positioning.statement = "أفضل صناديق تغليف للمشاريع المنزلية"; }, status: 1, includes: "ادعاء تفوق" },
  { name: "subtle absolute claim", mutate: (data) => { data.positioning.reason_to_choose = "الخيار الأثبت والأوفر في السوق"; }, status: 1, includes: "ادعاء تفوق" },
  { name: "exclusive claim", mutate: (data) => { data.positioning.statement = "الخيار الأول بلا منافس ولا يضاهى في السوق"; }, status: 1, includes: "ادعاء تفوق" },
  { name: "absolute frame", mutate: (data) => { data.positioning.frame_of_reference = "أفضل وأرخص عرض تغليف"; }, status: 1, includes: "ادعاء تفوق" },
  { name: "direct alternatives only", mutate: (data) => { data.alternatives[1].type = "direct"; }, status: 1, includes: "بديلًا غير مباشر" },
  { name: "observed without own evidence", mutate: (data) => { data.comparisons[0].own_evidence_refs = []; }, status: 1, includes: "own_evidence_refs مطلوب" },
  { name: "observed without alternative evidence", mutate: (data) => { data.comparisons[0].alternative_evidence_refs = []; }, status: 1, includes: "alternative_evidence_refs مطلوب" },
  { name: "observed without values", mutate: (data) => { delete data.comparisons[0].own_value; }, status: 1, includes: "قيمتي المتجر والبديل" },
  { name: "unknown with invented values", mutate: (data) => { data.comparisons[1].own_value = "يوم واحد"; }, status: 1, includes: "status=unknown" },
  { name: "incomplete matrix", mutate: (data) => { data.comparisons.pop(); }, status: 1, includes: "مصفوفة المقارنة ناقصة" },
  { name: "duplicate matrix cell", mutate: (data) => { data.comparisons.push(structuredClone(data.comparisons[0])); }, status: 1, includes: "خلية مقارنة مكررة" },
  { name: "future observation", mutate: (data) => { data.alternatives[0].observed_at = "2099-01-01"; }, status: 1, includes: "المستقبل" },
  { name: "impossible date", mutate: (data) => { data.market_scope.observed_at = "2026-02-30"; }, status: 1, includes: "تقويميًا" },
  { name: "non HTTPS evidence", mutate: (data) => { data.criteria[0].evidence_ref = "http://research.example/claim"; }, status: 1, includes: "رابط HTTPS" },
  { name: "missing proof", mutate: (data) => { data.alternatives[0].proof_refs = []; }, status: 1, includes: "proof_refs" },
  { name: "invalid proof reference", mutate: (data) => { data.alternatives[0].proof_refs = ["not-a-url"]; }, status: 1, includes: "رابط HTTPS أو مرجعًا داخليًا" },
  { name: "fake internal reference", mutate: (data) => { data.alternatives[0].proof_refs = ["abc#def"]; }, status: 1, includes: "proof_refs[0]" },
  { name: "invalid comparison reference", mutate: (data) => { data.comparisons[0].own_evidence_refs = ["not-a-url"]; }, status: 1, includes: "own_evidence_refs[0]" },
  { name: "competitor cannot prove store value", mutate: (data) => { data.comparisons[0].own_evidence_refs = ["https://supplier.example/boxes#minimum"]; }, status: 1, includes: "ليس من نطاقات دليل المتجر" },
  { name: "competitor cannot prove positioning", mutate: (data) => { data.positioning.proof_refs = ["https://supplier.example/boxes#minimum"]; }, status: 1, includes: "ليس من نطاقات دليل المتجر" },
  { name: "invalid store evidence domains", mutate: (data) => { data.market_scope.store_evidence_domains = ["https://store.example"]; }, status: 1, includes: "دون https://" },
  { name: "currency mismatch", mutate: (data) => { data.alternatives[0].price.currency = "USD"; }, status: 1, includes: "وحّد العملة" },
  { name: "incomparable price basis", mutate: (data) => { data.alternatives[0].price.basis = "للكرتون قبل الضريبة"; }, status: 1, includes: "أساس السعر الموحّد" },
  { name: "segment drift", mutate: (data) => { data.positioning.target_segment = "شركات كبيرة تشتري بالجملة"; }, status: 1, includes: "يطابق شريحة نطاق السوق" },
  { name: "missing counterevidence", mutate: (data) => { data.positioning.counterevidence = "لا يوجد دليل مضاد"; }, status: 1, includes: "ظرفًا حقيقيًا" },
  { name: "unmeasurable decision rule", mutate: (data) => { data.next_test.decision_rule = "استمر إذا تحسن السلوك بشكل جيد"; }, status: 1, includes: "حدًا رقميًا" },
  { name: "zero decision rule", mutate: (data) => { data.next_test.decision_rule = "استمر عند 0% من الزوار"; }, status: 1, includes: "موجبًا" },
  { name: "missing owner", mutate: (data) => { data.next_test.owner = ""; }, status: 1, includes: "next_test.owner" },
  { name: "past due date", mutate: (data) => { data.next_test.due_date = "2026-01-01"; }, status: 1, includes: "منقضٍ" },
  { name: "criteria wrong container", mutate: (data) => { data.criteria = {}; }, status: 1, includes: "معيارين" },
  { name: "alternatives wrong container", mutate: (data) => { data.alternatives = {}; }, status: 1, includes: "بديلين" },
  { name: "comparisons wrong container", mutate: (data) => { data.comparisons = {}; }, status: 1, includes: "أضف مقارنات" },
  { name: "null alternative", mutate: (data) => { data.alternatives[0] = null; }, status: 1, includes: "يجب أن يكون كائنًا" },
  { name: "evidence refs wrong container", mutate: (data) => { data.comparisons[0].own_evidence_refs = "https://store.example/proof"; }, status: 1, includes: "own_evidence_refs مطلوب" },
];

for (const testCase of cases) {
  const data = testCase.make ? testCase.make() : clone();
  testCase.mutate(data);
  const result = spawnSync(process.execPath, [validator, "-"], {
    input: JSON.stringify(data),
    encoding: "utf8",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status !== testCase.status || !output.includes(testCase.includes)) {
    console.error(`FAIL ${testCase.name}\n${output}`);
    process.exit(1);
  }
  console.log(`PASS ${testCase.name}`);
}
