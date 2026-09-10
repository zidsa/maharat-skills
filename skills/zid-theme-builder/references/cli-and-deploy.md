# Vitrin CLI & deployment

## Install
```bash
npm install -g @zidsa/vitrin-cli
```
Auth token stored at `~/.vitrin/config.json`. `vitrin` alone launches an interactive TUI.

## Commands

| Command | Purpose |
|---|---|
| `vitrin login` | OAuth via browser against Partner Dashboard (callback on localhost:4444) |
| `vitrin new <name>` | scaffold new theme from the official GitHub template |
| `vitrin build` | validate structure + package → `dist/theme.zip` |
| `vitrin preview <store-id> [--build]` | build, upload, install on a dev store for live preview |
| `vitrin push -s <store-email/id> [-a\|--activate]` | push entire theme dir, optionally activate |
| `vitrin list --stores` / `vitrin themes list` | list dev stores / server themes |
| `vitrin install <store> <theme> <version>` | install a specific version on a store |
| `vitrin activate ...` | activate an installed theme |
| `vitrin update <theme-id> --version X.Y.Z --changelog "..."` | push a new version |
| `vitrin link [theme-id] [--show] [--force]` | bind current dir to a server theme (multi-theme codebases) |
| `vitrin themes delete <id>` | delete server theme |

Always `npm run build` (theme's own pipeline) before `vitrin build`/`push` — the CLI packages files as-is.

## Validation
- Append `/validate` to any preview link → full validation report.
- `msgfmt --check locale/ar/LC_MESSAGES/messages.po -o /dev/null` for translations. Never upload `.mo`.
- Structure violations reject the upload ("لا يسمح برفع ملفات إضافية") — no stray files outside the allowed structure. Allowed asset types: .js .ts .css .scss .map .png .jpg .jpeg .gif .svg .woff .woff2 .otf .ttf .eot.

## Deployment path A — Merchant's own store (no partner account needed)
1. Store dashboard → سوق الثيمات → scroll to **الثيمات المخصصة** → **رفع ثيم جديد** → upload ZIP.
2. Activate from the same table (تفعيل الثيم). Works immediately.
3. Requirement: **Professional plan or higher**, OR purchase the "custom theme" service (valid 1 year, renew or the store reverts to the default theme).
4. Customize afterwards from the Theme Editor (colors, fonts, sections, images).

## Deployment path B — Partner Dashboard (dev + market publishing)
1. `vitrin login` → iterate with `vitrin preview <dev-store-id>`.
2. Private delivery or market publishing: Partner Dashboard → My Themes → Themes Management → Create New Theme → upload ZIP → details (pricing, screenshots: desktop 4:3 max 1600×1200, mobile 56.6:100 max 720×1280) → Save Draft or Submit to Publish (goes through review; emails from AppMarket@zid.sa).
3. Versioning: no breaking changes within a major version; use `vitrin update` with changelog.

## Troubleshooting
- Expired token → `vitrin login`
- Invalid store id → `vitrin list --stores`
- Theme name conflict → CLI auto-generates unique name
- Debug: `LOG_LEVEL=debug vitrin preview <id>`
- Issues: https://github.com/zidsa/vitrin-cli/issues · Dev community Slack linked from docs.zid.sa
