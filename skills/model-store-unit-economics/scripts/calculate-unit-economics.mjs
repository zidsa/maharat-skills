#!/usr/bin/env node

import fs from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("الاستخدام: node scripts/calculate-unit-economics.mjs <input.json>");
  process.exit(2);
}

const input = JSON.parse(fs.readFileSync(path, "utf8"));
const requiredNumbers = [
  "orders", "gross_item_revenue", "discounts", "refunds", "shipping_revenue",
  "taxes_collected", "cogs", "packaging", "payment_fees", "shipping_cost",
  "fulfillment_cost", "other_variable_costs", "attributed_marketing_spend"
];
const missingNumbers = requiredNumbers.filter((key) => !Number.isFinite(Number(input[key])));
const missingContext = ["currency", "period", "tax_included_in_gross_revenue"]
  .filter((key) => input[key] === undefined || input[key] === null || input[key] === "");

if (missingNumbers.length || missingContext.length) {
  console.error([
    missingNumbers.length ? `حقول رقمية مفقودة: ${missingNumbers.join(", ")}` : "",
    missingContext.length ? `حقول سياق مفقودة: ${missingContext.join(", ")}` : "",
  ].filter(Boolean).join("\n"));
  process.exit(1);
}

if (typeof input.tax_included_in_gross_revenue !== "boolean") {
  console.error("tax_included_in_gross_revenue يجب أن يكون true أو false");
  process.exit(1);
}

const orders = Number(input.orders);
if (orders <= 0) {
  console.error("orders يجب أن يكون أكبر من صفر");
  process.exit(1);
}

const attributedPaidOrders = input.attributed_paid_orders === undefined || input.attributed_paid_orders === null
  ? null
  : Number(input.attributed_paid_orders);
if (attributedPaidOrders !== null && (!Number.isFinite(attributedPaidOrders) || attributedPaidOrders <= 0 || attributedPaidOrders > orders)) {
  console.error("attributed_paid_orders يجب أن يكون أكبر من صفر ولا يتجاوز إجمالي الطلبات");
  process.exit(1);
}

const n = (key) => Number(input[key]);
const taxDeduction = input.tax_included_in_gross_revenue ? n("taxes_collected") : 0;
const netRevenue = n("gross_item_revenue") - n("discounts") - n("refunds") + n("shipping_revenue") - taxDeduction;
const variableBeforeAcquisition = n("cogs") + n("packaging") + n("payment_fees") + n("shipping_cost") + n("fulfillment_cost") + n("other_variable_costs");
const contributionBeforeAcquisition = netRevenue - variableBeforeAcquisition;
const contributionAfterAcquisition = contributionBeforeAcquisition - n("attributed_marketing_spend");
const perOrder = (value) => Math.round((value / orders) * 100) / 100;
const pct = netRevenue === 0 ? null : Math.round((contributionBeforeAcquisition / netRevenue) * 10000) / 100;
const contributionBeforePerOrder = perOrder(contributionBeforeAcquisition);
const actualCac = attributedPaidOrders === null
  ? null
  : Math.round((n("attributed_marketing_spend") / attributedPaidOrders) * 100) / 100;
const minimumPaidOrdersToCoverSpend = contributionBeforePerOrder > 0
  ? Math.ceil(n("attributed_marketing_spend") / contributionBeforePerOrder)
  : null;

console.log(JSON.stringify({
  currency: input.currency,
  period: input.period,
  orders,
  tax_included_in_gross_revenue: input.tax_included_in_gross_revenue,
  tax_deducted_from_revenue: taxDeduction,
  net_revenue_total: netRevenue,
  net_revenue_per_order: perOrder(netRevenue),
  variable_cost_before_acquisition_total: variableBeforeAcquisition,
  variable_cost_before_acquisition_per_order: perOrder(variableBeforeAcquisition),
  contribution_before_acquisition_total: contributionBeforeAcquisition,
  contribution_before_acquisition_per_order: contributionBeforePerOrder,
  contribution_margin_percent: pct,
  attributed_paid_orders: attributedPaidOrders,
  actual_cac_per_attributed_order: actualCac,
  blended_marketing_spend_per_total_order: perOrder(n("attributed_marketing_spend")),
  break_even_cac_per_attributed_order_assuming_same_unit_economics: contributionBeforePerOrder,
  minimum_attributed_orders_to_cover_current_spend_assuming_same_unit_economics: minimumPaidOrdersToCoverSpend,
  contribution_after_acquisition_total: contributionAfterAcquisition,
  contribution_after_acquisition_per_total_order: perOrder(contributionAfterAcquisition),
  break_even_additional_refunds: Math.max(0, contributionAfterAcquisition),
  break_even_additional_variable_costs: Math.max(0, contributionAfterAcquisition),
  warnings: [
    "هذا هامش مساهمة، وليس ربحًا صافيًا. راجع الضرائب والتكاليف الثابتة منفصلة.",
    attributedPaidOrders === null
      ? "تعذر حساب CAC لغياب attributed_paid_orders؛ الإنفاق لكل إجمالي الطلبات ليس CAC."
      : "تحقق أن attributed_paid_orders ناتجة عن منهج إسناد متسق ولنفس الفترة.",
    "refunds تمثل خفض الإيراد فقط؛ أضف الشحن العكسي وإعادة التخزين وعكس الرسوم ضمن التكاليف المتغيرة عند انطباقها."
  ]
}, null, 2));
