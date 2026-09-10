# Vitrin Jinja extensions & context objects

Vitrin = standard Jinja + platform tags/filters/macros. Official pages: Jinja Basics, Vitrin's Jinja Extensions, Templates Library (per-template docs at docs.zid.sa, see llms.txt).

## Platform tags/filters

| Helper | Kind | Use |
|---|---|---|
| `url_for('operation', **params)` | macro | canonical route URLs — NEVER hardcode paths |
| `'path' \| asset_url` | filter | versioned CDN URL for theme assets |
| `image_url(...)` | macro | resized/optimized CDN images — use for ALL product/content images (perf requirement) |
| `'path' \| localized_url` | filter | locale-aware links |
| `{% vitrin_head %}` / `{% vitrin_body %}` | tags | mandatory platform injection points in layout.jinja |
| `{% include "vitrin:shared/..." %}` | include | platform-provided shared partials (e.g. region_settings_dialog.jinja) |
| `safeget` | helper | safe access to possibly-undefined nested values |

Translations use gettext-style `{% trans %}` / `_("...")` backed by `locale/<lang>/LC_MESSAGES/messages.po`.

## url_for operation names (complete table from docs)

home · list_products · product_details · product_reviews · add_product_review · product_questions · add_question · list_categories · category_details · cart_page · single_page_checkout · choose_shipping · choose_payment · order_invoice · order_completed · transaction_slip_upload · profile · update_profile_page · update_email_page · orders · addresses · add_address · edit_address · wishlist · loyalty_program · register_page · login_page · verification_page · change_locale · pages · blogs · faqs · shipping_payment · landing_page · affiliate_reports · sitemap_xml · products_feed · products_reviews_feed

Route gotchas already enforced: `/products` (not `/p`), `/categories` (not `/c`). `url_for` shields you from future changes.

## Per-template context (key objects)

| Template | Context |
|---|---|
| `product` | `product` (+ `.attributes`, `.images`, `.variants`) |
| `products` | `products` (paginated), `filters`, `sort_options` |
| `cart` | `cart` (+ `.products`, `.totals`, `.coupon`) |
| `category` | `category` (+ `.products`) |
| `page` | `page.title`, `page.content` (HTML → `| safe`) |

Global everywhere: `settings`, `store`, `session` (`session.template` = page id like `product_details`), `request`. Inside sections: `section.settings`.

Per-template deep docs (fields of each object) live in the Templates Library pages, e.g. https://docs.zid.sa/product-jinja-1914519m0 — fetch when you need exact field names.

## Commonly used standard Jinja filters in growth-theme
`default` (everywhere — mandatory habit), `length`, `trim`, `safe`, `tojson` (Jinja→JS data), `upper/lower`, `round`, `int`, `truncate`, `striptags`, `urlencode`, `random`, `selectattr/map`.

## Storefront JS APIs

The platform exposes JS integration for cart/products/wishlist etc. (add to cart, apply coupon, wishlist add/remove...). growth-theme wraps these in `assets/js/` modules with globals `VitrinTheme` and `CartController`, plus `window.*` config set from layout.jinja. Event system + response/error contracts: docs "JS Integration" section (Responses & Errors, Cart, Products, Categories, Store, Account, Events).

## Feature requirements (from changelog — verify before shipping)
- Apple Pay Quick Checkout template: mandatory support.
- Checkout popup, login popup, gift card popup, addresses popup: supported patterns — follow "SDK Popups – Integration Guidelines".
- Preorder support and progressive discounts have dedicated guides.
