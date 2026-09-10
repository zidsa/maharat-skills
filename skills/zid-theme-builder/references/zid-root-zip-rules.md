# Zid ZIP rules — root-valid or rejected

Zid rejects a custom-theme upload unless ALL hold. `scripts/zip_theme.py` produces a compliant ZIP; `scripts/validate_zid_zip.py` audits any ZIP against these rules. Run the validator before handing the ZIP over.

## 1. Forward-slash `/` separators inside the ZIP
Zid looks for `templates/home.jinja`. A backslash entry (`templates\home.jinja`) fails with **"Missing required templates: templates/home.jinja"**. ⚠️ On Windows, BOTH PowerShell `Compress-Archive` AND .NET `ZipFile.CreateFromDirectory` (PowerShell 5.1 / .NET Framework) emit BACKSLASH entries → both are rejected. Use `scripts/zip_theme.py` (Python `zipfile` with `arcname.replace(os.sep,'/')`) or `zip -r` on Unix. Always assert no entry contains `\`.

## 2. Root-valid — no parent folder
`layout.jinja` and `templates/` MUST sit at the ZIP root, NOT nested under `my-theme/`. Zipping the folder itself (instead of its contents) is the classic mistake.

## 3. Required files present
`layout.jinja` (containing `{% vitrin_head %}` + `{% vitrin_body %}`), `templates/home.jinja`, `header.jinja`, `footer.jinja`.

## 4. Home must not be empty
`templates/home.jinja` must contain a DESIGNED fallback (hero + bands + CTA), not only `{% template_components %}`. A homepage that renders empty until the merchant adds sections is a rejected deliverable (page-coverage.md contract). The validator flags a home.jinja whose non-comment body is essentially just `template_components`.

## 5. No forbidden / extra files
No `.mo` (compiled translations). No `node_modules`, no dev configs (Makefile, vite.config.js, package.json, README, .gitignore), no `art/`/`handover/` working dirs. Extra files → "لا يسمح برفع ملفات إضافية".

## 6. Zid-only — reject other platforms
Fail if the tree contains Shopify (`*.liquid`, `theme.liquid`, `config/settings_schema.json` Shopify-style), Salla (`*.twig`, `twilight.json`), or WooCommerce (`woocommerce/`, `single-product.php`, `archive-product.php`) fingerprints. Message: "This skill builds Zid/Vitrin themes only. Detected files from another platform."

## 7. Compiled assets included
Ship `assets/styles.css` + `assets/dist/*.js` so the theme works on activation. growth-theme's `npm run build` JS step needs bash env-var syntax on Windows: `NODE_ENV=production ENTRY=main npx vite build` then `ENTRY=cart` (cmd `NODE_ENV=...` fails).

## 8. Valid schema JSON + locales
Every `*.schema.json` must parse. `locale/ar/LC_MESSAGES/messages.po` present and (when `msgfmt` is available) `--check`-clean; never ship `.mo`.

On any failure: fix, re-run, do NOT hand over. See memory: zid-packaging-constraints.
