# Platform adapter — same skill, honest behavior everywhere

This skill's logic is platform-neutral; only the CAPABILITIES differ. At the start of every theme task, probe what the current platform can actually do, then follow the matching row. NEVER fake a capability (claiming an upload/generation that didn't happen breaks the delivery contract).

## Capability probe (run mentally at Step 0)

1. **Zid MCP** connected? → Path A harvesting + store profiling (store-analysis.md).
2. **Shell/filesystem** available? → git clone, npm build, magick compositing, package_theme.sh, ZIP assembly.
3. **Image generation** available natively? → run Path C prompts yourself, save with exact filenames.
4. **Video generation** available? → same for VIDEO_PROMPTS entries.
5. **vitrin CLI** authenticated? → automated deploy.

## Behavior matrix

| Platform | Typical capabilities | Behavior |
|---|---|---|
| **Claude Code** (terminal/desktop) | shell + MCP + vitrin CLI possible; no native image gen | Full pipeline: harvest via MCP, composite via magick/SVG, build, package, `vitrin push`. Missing art → prompt pack + SVG placeholders; user round-trips generated files back. |
| **claude.ai** (web, no shell) | MCP connectors possible; no shell, no image gen | Build theme files in-conversation, ship SVG placeholders + full prompt packs, assemble ZIP, deliver with UPLOAD_INSTRUCTIONS.md. NEVER claim to have uploaded or generated raster images. |
| **ChatGPT** | image generation + code interpreter (zip); no Zid MCP, no vitrin | Generate Path C images DIRECTLY with exact filenames, place into `assets/images/`, zip via code interpreter. Store data comes from the live storefront URL only. |
| **Gemini** | image + video generation; no Zid MCP, no vitrin | Generate images AND hero-loop videos directly per the packs, honor ≤10MB video limit, assemble ZIP if the environment allows — else deliver assets + instructions. |
| **Any other/unknown** | assume nothing | Follow the probe; degrade to: theme files + placeholders + prompt packs + manual instructions. |

## Universal rules (every platform)

- The deliverables contract (delivery-package.md) is identical everywhere — only WHO executes each lane changes.
- Direct generation replaces the user round-trip, not the naming contract: generated files still use the exact `ASSET_REQUIREMENTS.md` filenames.
- Platforms without MCP still do Step 0: fetch the live storefront URL and profile from it.
- Zid-only guard applies everywhere: refuse Shopify/Salla/WooCommerce adaptations (SKILL.md platform scope).
- Golden rules (SKILL.md) are platform-independent — growth-theme base, url_for, settings-driven, bilingual schemas, `.po` locale files. No platform "simplification" may violate them.

## Porting the skill itself

The skill is this folder: `SKILL.md` (master instructions) + `references/` + `scripts/`. To use outside Claude:
- **ChatGPT:** create a Custom GPT (or a project) — paste SKILL.md as instructions, attach the `references/*.md` files as knowledge.
- **Gemini:** create a Gem with SKILL.md as instructions and the references attached.
- On both, tell the model: "اتبع SKILL.md حرفياً، والملفات المرجعية في references هي المصدر" — and expect the matrix row above to govern what it can execute.
- ⚠️ `references/store-analysis.md` contains the store's private MCP URL — share the folder only into your OWN accounts, never publicly.
