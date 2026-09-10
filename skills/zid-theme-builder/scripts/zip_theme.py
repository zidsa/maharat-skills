#!/usr/bin/env python3
r"""Cross-platform Zid theme packager — writes FORWARD-SLASH ZIP entries.

Why this exists: Zid looks for `templates/home.jinja` inside the ZIP. On Windows,
both PowerShell `Compress-Archive` and .NET `ZipFile.CreateFromDirectory`
(PowerShell 5.1 / .NET Framework) emit BACKSLASH entries (`templates\home.jinja`),
which Zid rejects with "Missing required templates: templates/home.jinja".
Python's zipfile lets us force `/` separators. Use this on Windows where `zip`
is unavailable; on Unix `zip -r` already uses `/`.

Usage:  python zip_theme.py <theme-dir> <output.zip>

It packages the theme dir contents at the ZIP ROOT (no parent wrapper) and skips
dev/forbidden files (node_modules, .git, .mo, package.json, Makefile, ...).
"""
import os
import sys
import zipfile

EXCLUDE_DIRS = {"node_modules", ".git", ".github", "docs", "build", ".vscode", ".idea"}
EXCLUDE_FILES = {
    "Makefile", "vite.config.js", "package.json", "package-lock.json",
    "README.md", ".gitignore", ".prettierrc", ".prettierignore", "msgfmt",
    ".DS_Store", "Thumbs.db",
}
EXCLUDE_EXT = {".mo", ".pot", ".zip"}


def main():
    if len(sys.argv) < 3:
        sys.exit("Usage: python zip_theme.py <theme-dir> <output.zip>")
    theme, out = sys.argv[1], sys.argv[2]
    if os.path.exists(out):
        os.remove(out)
    n = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, dirs, files in os.walk(theme):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for f in files:
                if f in EXCLUDE_FILES or os.path.splitext(f)[1] in EXCLUDE_EXT:
                    continue
                full = os.path.join(root, f)
                arc = os.path.relpath(full, theme).replace(os.sep, "/")  # <-- the fix
                z.write(full, arc)
                n += 1
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        assert all("\\" not in x for x in names), "backslash entry leaked!"
        assert "layout.jinja" in names, "layout.jinja not at root"
        assert "templates/home.jinja" in names, "templates/home.jinja missing"
    print(f"OK {out}  ({n} files, {os.path.getsize(out) / 1048576:.2f} MB, forward-slash, root-valid)")


if __name__ == "__main__":
    main()
