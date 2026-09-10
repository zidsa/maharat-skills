#!/usr/bin/env node

import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("الاستخدام: node scripts/validate-assortment.mjs <assortment.json>");
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(path, "utf8"));
const errors = [];
const allowed = new Set(["core", "test", "defer", "exclude"]);

if (!data.customer_job) errors.push("customer_job مفقود");
if (!Array.isArray(data.products) || data.products.length === 0) {
  errors.push("products يجب أن يحتوي منتجًا واحدًا على الأقل");
} else {
  data.products.forEach((product, index) => {
    for (const key of ["id", "name", "customer_role", "decision", "reason", "evidence", "supplier_risk", "next_test"]) {
      if (!product[key]) errors.push(`المنتج ${index + 1}: ${key} مفقود`);
    }
    if (product.decision && !allowed.has(product.decision)) {
      errors.push(`المنتج ${index + 1}: decision يجب أن يكون core أو test أو defer أو exclude`);
    }
    if (product.variants && !Number.isInteger(product.variants.combinations)) {
      errors.push(`المنتج ${index + 1}: variants.combinations يجب أن يكون عددًا صحيحًا`);
    }
  });
}

if (!Array.isArray(data.data_gaps)) errors.push("data_gaps يجب أن تكون قائمة، حتى لو فارغة بعد التحقق");
if (!data.review_gate) errors.push("review_gate مفقود");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("خطة التشكيلة صالحة بنيويًا. راجع الأدلة والكميات والمخاطر بشريًا.");
