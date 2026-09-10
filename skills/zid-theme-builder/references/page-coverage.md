# Full-coverage mandate — every page, every detail

A custom theme is judged as a COMPLETE STORE, not a homepage. Before delivering, every item below must carry the theme identity. Nothing ships half-styled.

## The leverage trick (do this FIRST)

growth-theme routes ~90% of its styling through semantic tokens (`bg-primary`, `text-foreground`, `border-border`...). Setting the palette + font + radius restyles ALL pages at once — including checkout, auth dialogs, and popups which are SDK-rendered but token-colored. Then identity work is targeted touches on top, not page rewrites.

Global identity multipliers (one edit → every page):
- `main > section:first-of-type` → identity background band on every page opening
- `main h1::after` → branded title mark on every page
- Overwrite the shipped placeholder SVGs in `assets/images/` (placeholder-image, product-img, placeholder-banner, placeholder-banner-mobile, placeholder-wide, placeholder-avatar) with brand-styled versions USING THE SAME FILENAMES — every fallback in the theme inherits the identity automatically
- Component classes on shared cards (product-card, category-card, gallery) → all listings/PDP/carousels

## Page-by-page checklist (all 14 templates)

| Page | Must have |
|---|---|
| home | Fully designed in-template (Recipe 8): hero + identity bands + `template_components` + benefits + CTA. Real art in every slot per images.md (placeholder only as final fallback) |
| products | Identity header band, styled filters/sort, panel product cards, styled pagination, branded empty state |
| product | Panel-framed gallery, badges, price emphasis (primary color), styled variants/options/quantity, reviews & questions blocks, sticky actions bar |
| category | Category hero, panel cards, subcategories carousel |
| categories | Grid of panel category cards + placeholder fallback for imageless categories |
| cart | Panel summary box, token-styled coupon/gift/loyalty blocks, primary CTA with identity button style, branded empty-cart state |
| page (static) | Typography pass: prose styles on token colors |
| blogs / blog | Card grid + article typography |
| faqs | Styled disclosure/accordion |
| reviews / questions | Card styling, avatar placeholder |
| shipping_payment | Method cards with token borders |
| 404 | Branded, playful, on-identity (big display number + accent shadow) |

## Beyond templates

- **header.jinja / footer.jinja** — nav hover states, cart icon, mobile menu, footer columns + payment icons area
- **Empty states** — cart, wishlist, search-no-results, imageless category: all branded, never default-gray
- **Dialogs/popups** — quick view, notify-me, region settings, auth: token-colored (verify on dark themes)
- **Forms** — inputs, selects, phone input, checkboxes: radius + border tokens
- **States** — hover, focus (ring token), disabled, loading skeletons

## Checkout reality (be honest with the user)

The checkout flow (`single_page_checkout`) and payment UI are rendered by Zid's SDK for security — themes CANNOT redesign them structurally. They inherit theme tokens (colors, font, radius), so a correct token setup is exactly how checkout "gets the theme". Never promise custom checkout layouts.

## Placeholder image kit (mandatory deliverable — the LAST layer, not the strategy)

Ship brand-styled SVG placeholders (cheap, crisp, tiny) for: product, category, banner desktop (1500×700), banner mobile (720×900), wide (1200×500), avatar. Original artwork only — patterns, shapes, brand marks. NEVER copyrighted characters/IP even for an anime/fan-merch store. Label them in Arabic ("ارفع صورتك من المحرر") so the merchant knows they're replaceable.

These placeholders are the safety net UNDER the real art: the actual banners/tiles/posters the theme ships with come from the mandatory image pipeline (`references/images.md` — harvest store media + generate on-identity art). A slot that shows the placeholder on first activation means the pipeline missed it.

## Definition of done

Walk the store as a customer: land on home → browse category → open product → add to cart → reach checkout → hit a 404. If ANY screen looks like default growth-theme or shows an unbranded gray box, the theme is not done.


## Shape language mandate — identity is SHAPES, not palette swaps

A recolored default theme is NOT a custom theme. The user must see different GEOMETRY on every page. Minimum shape kit (adapt shapes to the sector — these are the anime/manga example):

| Element | Default growth | Identity version |
|---|---|---|
| Section headings (h2) | plain text | skewed "chapter plate": colored bg, skewX(-8deg), hard offset shadow (counter-skew inner text!) |
| Buttons (.btn + custom) | rounded rect | skewX(-6deg) + hard offset shadow, hover translate(-2px,-2px) |
| Badges (.badge) | rect pill | rotated + clip-path tape/burst shape |
| Product/category image panels | rounded box | 3px ink border + cut corner clip-path + hover speed-lines overlay (repeating-linear-gradient ::before) + slight hover rotate |
| Breadcrumbs | text row | rotated colored "tape" strip |
| Header | flat | thick primary bottom border, tilted logo frame |
| Footer | flat | thick primary top border + identity pattern bg |
| Dialogs | rounded | 3px border + cut-corner clip-path |
| Skeletons | gray pulse | bordered cut-corner shimmer matching panels |

Implementation notes: skew containers need counter-skewed children (`> * { transform: skewX(+Ndeg) }`). Exclude prose content from heading plates (`:not(.prose *)`). Apply through shared component classes/global selectors so ALL pages inherit at once.

## Always-populated homepage (products & categories without editor setup)

`template_components` renders nothing until the merchant configures sections — and section data (`settings.products.results`) is ONLY injected for editor-added sections. To guarantee real products/categories on the homepage from second one:

1. In home.jinja add two sections with skeleton loaders and data attributes:
   `<div id="mf-home-products" data-src="{{ url_for('list_products') }}" data-max="8" class="grid ...">skeletons</div>`
2. Ship a JS feature (registered in main.js) that fetches the RENDERED `/products` and `/categories` pages, parses with DOMParser, clones the first N cards from `[data-grid-root] > *` / `[data-categories-grid] > *` into the homepage grids, then dispatches `content:loaded` so wishlist/quick-view/carousels re-init.
3. On fetch failure hide the section (`data-mf-home-section` wrapper) — graceful, never broken.
This reuses the theme's own server-rendered cards: zero API coupling, automatic identity styling, works on any store. Add a `data-categories-grid` attribute to the categories template grid to make the selector stable.


## Homepage anatomy — the Saudi-market standard (learned from real leader stores)

Analysis of leading Saudi stores in-sector (e.g. animeclubsa.com structure) shows this homepage rhythm — implement ALL slots, settings-driven, shipping real harvested/generated art per `references/images.md` so slots look FINISHED before the merchant uploads (branded placeholder = final fallback only):

1. Announcement/offers ticker (linkable)
2. **Banner slider** — list-type setting (image 1500×700 + link + alt); CSS scroll-snap + dots + 5s auto-advance (RTL-aware: negative scrollLeft); zero-dependency
3. Brand hero band (theme identity)
4. Latest products (hydrated)
5. Category tiles (franchise/occasion naming) — TOP 4–6 categories ONLY, scored by products/sales/identity (merchant-prompts.md design-first rule); the rest belong to the categories page, never a 12-tile wall
6. **Wide promo banner slot** (image+link setting, shipped real-art default per images.md)
7. Editor sections (`template_components`)
8. **Second wide banner slot**
9. **FAQ accordion on the homepage** — list setting (q/textarea a) with sector-appropriate defaults (authenticity, delivery time, payment methods, returns) — major Saudi trust pattern
10. Benefits/trust row → closing CTA
11. **WhatsApp float button** — `wa.me/<number>?text=...` setting, fixed inline-start, hidden when unset

## Splash preloader (with store logo) — requested-by-merchants pattern

Full-screen overlay first thing inside `<body>`: store logo (`store.logo`, styled to identity) + loading bar. Behavior: hide on `window.load` (+500ms) with a 2.6s hard timeout fallback; show once per session via `sessionStorage`; toggleable via a checkbox setting (`extras_splash_enabled`, default true). Never block interaction longer than ~2.5s.

## Editor sections mandate — all 11 must land styled

Merchants add sections from the Theme Editor at ANY time ("إضافة قسم جديد"). Every one of the 11 growth-theme sections must look fully on-identity the second it's added — never default:

| Section (editor name) | Identity requirements |
|---|---|
| البانر الرئيسي (hero) | overlay tuned to palette, title shadow/plate, skewed CTA |
| دوّار الصور (carousel) | dots/arrows restyled (skewed dashes, ink-border buttons) — restyle `.embla__dots`/`.embla__button` globally so ALL carousels inherit |
| قائمة المنتجات (products) | inherits card panels automatically; Arabic `more_text` default |
| التصنيفات (categories) | category-card panels + franchise-style default title |
| معرض الصور (gallery) | every img = ink panel (border + cut corner + hover) |
| فيديو (video) | overlay tint + identity play button |
| خصائص المتجر (benefits) | icon chips (bordered, tilted, hover-straighten) |
| شركاؤنا (partners) | framed logos, grayscale→color hover |
| آراء العملاء (testimonials) | slides become quote panels (cut corner + quote mark) |
| العد التنازلي (countdown) | digit boxes = skewed identity plates with offset shadow |
| الشعار والتواصل (logo-social) | playful icon hover |

Also set Arabic defaults in every section schema (title per-section, more_text="عرض الكل", badge/button texts) so sections speak the market's language on add. Style via the `.section-<name>` wrapper classes + shared carousel classes — CSS-only, no template edits needed, so it survives upstream template updates.

## Graceful degradation rule — sections must survive bad merchant input

Real-world lesson (countdown bug): growth-theme's countdown hides the ENTIRE content block (`countdown-content`) when `end_date` is invalid, empty, or past — merchants type things like "15612515" in the free-text date field and see only the background image, concluding the theme is broken. The rule for every section:

1. Invalid input hides ONLY the element that depends on it (the timer), never the whole section — badge/title/button remain as a normal banner.
2. Parse merchant text tolerantly (trim, accept `/` or `-` separators) before failing.
3. Free-text fields that expect a format (dates especially — there is NO `date` schema type) MUST have an `info` example AND state the fallback behavior: "لو التاريخ غير صحيح، يظهر القسم كبانر بدون عداد".
4. Audit every section's JS for `display = "none"` on wrappers — replace with element-level hiding.
