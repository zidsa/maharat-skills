# Theme Editor control matrix — what the merchant can edit

Everything important is merchant-editable from the Zid Theme Editor **where the platform allows**. Colors/fonts/radius flow through `layout.schema.json` → `layout.jinja` `:root` → Tailwind `@theme inline` (architecture.md). Home/section content lives in `layout.schema.json` groups + `sections/*.schema.json`. Never promise editability the platform can't deliver (checkout layout is SDK-rendered — tokens only).

Ship EVERY control below with a bilingual label + a sensible default so the theme looks finished before any edit.

## Brand (layout.schema.json → group `theme`)
primary · primary_foreground · secondary/surface · accent · background · foreground/text · muted · border · input · ring · (destructive/success/warning are fixed system tokens in tailwindcss.css — restyle for brand, not merchant-exposed).

## Typography (group `font`)
family (Arabic-subset Google Font) · optional heading_weight · body_weight · heading_scale · letter_spacing · line_height. Verify the font has an Arabic subset.

## Layout (group `theme`/`layout`)
radius · card border thickness · shadow style (select) · spacing density (compact/balanced/premium select) · container width. Product-card columns desktop/mobile + image aspect (group `product_card`).

## Header (header.schema.json)
logo (desktop/mobile) · sticky toggle · announcement text · search style · menu style · icon style · mobile-drawer style.

## Home (layout.schema.json → group `home`, read as `settings.home_*`)
hero_title · hero_subtitle · hero_image · hero_image_mobile (only if the design uses a distinct mobile crop) · hero_cta_text/url · hero_cta2_text/url · marquee_text · trust badges · featured/categories section titles · promo1/2 image+url · FAQ list · final CTA · whatsapp_number/text · splash toggle.

## Product card (shared component + layout group)
image ratio · badge style · price hierarchy · add-to-cart button style · hover animation · border style. (Card markup is the shared `components/products/product-card.jinja` fork — style once, applies everywhere.)

## Product page
gallery style · sticky buy box · trust strip · shipping note · details accordion · related products · reviews block · media placeholder (fallback image).

## Category / Categories page
category hero · filters style · sorting style · grid columns · empty-category state · category description style. Home shows only the top 4–6 categories (visual-decision-layer.md); the full set lives on the categories page.

## Cart
empty-cart image · coupon input style · trust message · checkout CTA · summary card.

## Checkout / Shipping (tokens + supported blocks ONLY)
Inherit colors/radius/fonts/borders via tokens. Add trust/reassurance copy on `shipping_payment` and supported blocks. NEVER promise a custom checkout layout.

## Footer (footer.schema.json + settings)
brand description · newsletter · social links · contact · payment/shipping badges · footer image (if the design uses one). App-download badges only render when the store actually has an app.

## Rule
If a control isn't exposable via schema, ship a strong on-identity default and say so — don't fake a Theme Editor field the platform doesn't support.
