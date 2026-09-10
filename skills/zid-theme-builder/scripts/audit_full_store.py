#!/usr/bin/env python3
r"""Audit a built Zid theme DIRECTORY for E2E completeness before packaging.

Usage:  python audit_full_store.py <theme-dir>

Checks (references/page-coverage.md + images.md + zid-root-zip-rules.md):
  A) required files present
  B) home.jinja has a designed fallback (not only template_components)
  C) no broken/placeholder-only image strategy: every images/... referenced in
     templates exists in assets/images
  D) no other-platform fingerprints
Warnings don't fail; errors do. Exit 0 = pass, 1 = errors found.
"""
import os
import re
import sys

REQUIRED = ["layout.jinja", "header.jinja", "footer.jinja", "templates/home.jinja"]
RECOMMENDED = ["templates/product.jinja", "templates/products.jinja", "templates/category.jinja",
               "templates/categories.jinja", "templates/cart.jinja", "templates/404_not_found.jinja"]
OTHER_PLATFORM = [".liquid", "twilight.json", ".twig", "single-product.php", "archive-product.php"]


def read(p):
    with open(p, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python audit_full_store.py <theme-dir>")
    root = sys.argv[1]
    if not os.path.isdir(root):
        sys.exit("Not a directory: " + root)

    errors, warnings, oks = [], [], []

    # A) required
    for r in REQUIRED:
        (oks if os.path.isfile(os.path.join(root, r)) else errors).append("required: " + r)
    for r in RECOMMENDED:
        if not os.path.isfile(os.path.join(root, r)):
            warnings.append("recommended page missing (falls back to Zid default): " + r)

    # B) home not empty
    home_p = os.path.join(root, "templates", "home.jinja")
    if os.path.isfile(home_p):
        home = _strip_comments(read(home_p))
        designed = any(t in home for t in ["mf-hero", "<section", "hero", "class="])
        if "template_components" in home and not designed:
            errors.append("home.jinja is empty (only template_components) — Home-Must-Not-Be-Empty")
        else:
            oks.append("home.jinja has a designed fallback")

    # C) referenced images exist
    img_dir = os.path.join(root, "assets", "images")
    ref = set()
    for dirpath, _dirs, files in os.walk(root):
        if "node_modules" in dirpath or os.sep + ".git" in dirpath:
            continue
        for f in files:
            if f.endswith(".jinja"):
                for m in re.findall(r"['\"]images/([^'\"]+\.(?:jpg|jpeg|png|svg|webp))['\"]", read(os.path.join(dirpath, f))):
                    ref.add(m)
    missing = [r for r in sorted(ref) if not os.path.isfile(os.path.join(img_dir, r.split("~")[0].strip()))]
    # dynamic paths (with ~) can't be statically resolved — report as info
    dynamic = [r for r in missing if "~" in r or "{" in r]
    truly_missing = [r for r in missing if r not in dynamic]
    if truly_missing:
        errors.append("template references missing image files: " + ", ".join(truly_missing[:8]))
    else:
        oks.append("all statically-referenced images/ exist (" + str(len(ref)) + " refs)")
    if dynamic:
        warnings.append("dynamic image paths (verify per-id tiles exist): " + ", ".join(dynamic[:4]))

    # D) other-platform
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            low = f.lower()
            for tok in OTHER_PLATFORM:
                if tok in low:
                    errors.append("other-platform file present: " + os.path.join(dirpath, f))

    for o in oks:
        print("  [OK] " + o)
    for w in warnings:
        print("  [WARN] " + w)
    for e in errors:
        print("  [FAIL] " + e)
    if errors:
        print("AUDIT FAILED (" + str(len(errors)) + " errors)")
        sys.exit(1)
    print("[OK] Store audit passed (" + str(len(warnings)) + " warnings).")


def _strip_comments(text):
    return re.sub(r"\{#.*?#\}", "", text, flags=re.S)


if __name__ == "__main__":
    main()
