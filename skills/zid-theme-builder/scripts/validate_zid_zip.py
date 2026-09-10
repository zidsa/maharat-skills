#!/usr/bin/env python3
r"""Validate a packaged Zid theme ZIP against Zid's upload rules.

Usage:  python validate_zid_zip.py <theme.zip>

Checks (references/zid-root-zip-rules.md):
  1. forward-slash separators (no backslash entries)
  2. root-valid, no parent-folder wrapper
  3. required files present (layout.jinja + vitrin tags, templates/home.jinja, header, footer)
  4. home.jinja is not empty (has a designed fallback, not only template_components)
  5. no forbidden files (.mo, node_modules, dev configs)
  6. Zid-only (reject Shopify / Salla / WooCommerce fingerprints)
  7. every *.schema.json parses
Exit 0 = pass, 1 = fail (prints every problem).
"""
import json
import os
import sys
import zipfile

REQUIRED = ["layout.jinja", "templates/home.jinja", "header.jinja", "footer.jinja"]
FORBIDDEN_EXT = {".mo", ".pot"}
FORBIDDEN_NAMES = {"package.json", "Makefile", "vite.config.js", ".gitignore"}
OTHER_PLATFORM = [
    (".liquid", "Shopify"), ("theme.liquid", "Shopify"),
    (".twig", "Salla"), ("twilight.json", "Salla"),
    ("woocommerce/", "WooCommerce"), ("single-product.php", "WooCommerce"),
    ("archive-product.php", "WooCommerce"),
]


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python validate_zid_zip.py <theme.zip>")
    path = sys.argv[1]
    if not os.path.isfile(path):
        sys.exit("ZIP not found: " + path)

    problems = []
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        norm = [n.replace("\\", "/") for n in names]

        # 1. separators
        if any("\\" in n for n in names):
            problems.append("Backslash ZIP entries — Zid needs '/'. Repack with scripts/zip_theme.py.")

        # 2. parent folder wrapper
        tops = {n.split("/", 1)[0] for n in norm if n}
        if "layout.jinja" not in norm and any(("/" + "layout.jinja") in ("/" + n) and n.count("/") == 1 for n in norm):
            problems.append("Parent-folder wrapper detected — layout.jinja must be at ZIP root.")

        # 3. required
        for req in REQUIRED:
            if req not in norm:
                problems.append("Missing required file: " + req)
        # vitrin tags in layout
        if "layout.jinja" in norm:
            body = z.read(names[norm.index("layout.jinja")]).decode("utf-8", "ignore")
            if "vitrin_head" not in body:
                problems.append("layout.jinja missing {% vitrin_head %}")
            if "vitrin_body" not in body:
                problems.append("layout.jinja missing {% vitrin_body %}")

        # 4. home not empty
        if "templates/home.jinja" in norm:
            home = z.read(names[norm.index("templates/home.jinja")]).decode("utf-8", "ignore")
            stripped = _strip_jinja_comments(home)
            has_components = "template_components" in stripped
            # designed content = real markup beyond just extends/block/template_components
            designed = any(tok in stripped for tok in ["mf-hero", "<section", "hero", "class="])
            if has_components and not designed:
                problems.append(
                    "home.jinja looks empty — only template_components, no designed fallback "
                    "(violates Home-Must-Not-Be-Empty)."
                )

        # 5. forbidden
        for n in norm:
            base = n.rsplit("/", 1)[-1]
            _, ext = os.path.splitext(base)
            if ext in FORBIDDEN_EXT:
                problems.append("Forbidden file: " + n)
            if base in FORBIDDEN_NAMES or n.startswith("node_modules/") or "/node_modules/" in n:
                problems.append("Dev/forbidden file should not be in the ZIP: " + n)

        # 6. other platforms
        low = "\n".join(norm).lower()
        for token, platform in OTHER_PLATFORM:
            if token in low:
                problems.append(
                    "This skill builds Zid/Vitrin themes only. Detected " + platform + " file: " + token
                )

        # 7. schema json parses
        for n in norm:
            if n.endswith(".schema.json"):
                try:
                    json.loads(z.read(names[norm.index(n)]).decode("utf-8", "ignore"))
                except Exception as e:  # noqa: BLE001
                    problems.append("Invalid schema JSON " + n + ": " + str(e))

    if problems:
        print("VALIDATION FAILED (" + str(len(problems)) + "):")
        for p in problems:
            print("  [FAIL] " + p)
        sys.exit(1)
    size_mb = round(os.path.getsize(path) / 1048576, 2)
    print("[OK] ZIP is Zid-valid: root-valid, forward-slash, required files present, home designed, "
          "no forbidden/other-platform files. (" + str(size_mb) + " MB)")


def _strip_jinja_comments(text):
    out, i = [], 0
    while i < len(text):
        j = text.find("{#", i)
        if j == -1:
            out.append(text[i:])
            break
        out.append(text[i:j])
        k = text.find("#}", j)
        i = len(text) if k == -1 else k + 2
    return "".join(out)


if __name__ == "__main__":
    main()
