# Zid Theme Builder import

This package was copied unchanged at the repository owner's request.

- Upstream repository: https://github.com/abdulrahmanx97/zid-ai-theme
- Upstream commit: `b7039a48b7645b81654c0f3d7f89fa076763177a`
- Upstream package root: repository root
- Local package root: `skills/zid-theme-builder/`
- Skill name: `zid-theme-builder`
- Package version from upstream metadata: `5.0.0-logical-visual-e2e`
- Import date: 2026-09-10
- Files: 37 (4 root files, 29 reference files, 4 scripts)
- Total file content: 175,162 bytes
- All upstream file modes: `100644`

## Preservation

Every tracked upstream file is included byte-for-byte, including the README,
metadata, ignore rules, references, and scripts. No skill instructions, companion
files, attribution, or license terms were changed or added inside the package.
This provenance record is intentionally outside the imported skill directory.

The upstream repository does not contain a license file or declare a license in
its skill metadata. This import does not assign a new license to those files.
Do not infer that repository-wide licensing applies to the imported package.

The upstream README references standalone installation scripts that are absent
from the pinned source revision. The README remains unchanged. Install the
complete package using the catalog's package command:

```sh
npx skills add https://github.com/zidsa/maharat-skills --skill zid-theme-builder
```

Import verification checks file names, file bytes, and file modes only. It does
not execute the skill's scripts or assert that a generated theme has been built,
installed, or activated on a store.

## SHA-256 manifest

Paths are relative to `skills/zid-theme-builder/`. Verify from that directory
using the manifest below with `shasum -a 256 -c`. Also check that exactly these
37 regular files exist so that unexpected extra files are not overlooked.

```text
c2ca6fee5aca79af6659860c41bdb381e2b4cc3d7d1e9690854e315065b79007  .gitignore
71e23887eb9b1bb2b97d5313265327170c8497f7231776190904d96463d8624c  README.md
acefeea03cdaed7f14ca03ef4577ffe222b7c5f857e204e099ac116bda641755  SKILL.md
f04f0eb98f81a2764d58d822b28fcec22769fd056ffe1123115052d2806fdd88  metadata.json
af3bd4615acb35835a0ca92d2a86906498b23f7d5cc77dd3870d2b7e7bd39eea  references/architecture.md
cb534ca39bcc01bd74b276f4546c7a5ee61809a8914b9ea52e7318386277cc42  references/cli-and-deploy.md
9d411878a128782077e186fe01b6a54d61a2101d89ff328564c55e9d926d9cef  references/customization-recipes.md
5654217df42e5f7790b6fde58db4c814085291eb4f541669f1acf5a1b375b328  references/delivery-package.md
c502c5bdf2157ed8eef3bc6ccbd2257926bf27c696631616eb65f456ffac0237  references/design-research.md
25ace2213cd26bd82885d50167c65c7727ca73ca6ed956f2b7c3c7954fc53912  references/images.md
936de44cbb255c5b153fdb6f4090e3c30f860f5b93b6a9e63767df53a96a0ae2  references/jinja-extensions.md
634da74004a80d825828786c17bd26318286d5312a3436b1d1b74fd6ad55066e  references/merchant-prompts.md
45bb6594c73666adaf28a85123887b43e0b4ef818b921dc8631df8cb2b091ca1  references/page-coverage.md
599aba16d6a1620f7a45d3e15b920f8ab62ddbb7c6378e32c27b9977671d903e  references/platform-adapter.md
9747424f0be3cdd5d76e95958bc2ccd84f63eb72c8bea895c93a697c4063e75c  references/prompt-packs.md
5964564b89c1fbeb2de63722207a6f3959539f6a1f23d2c464efcb1e14bb0ec5  references/schemas.md
9e54d573e1e48100f38af29094a35ef4ccfaa8447d065ca9b8409fbe35488de3  references/sections/benefits.md
32bff7364e6f7cdb249350d8561bf6fafa2ef062a8e1a8b2d336e08fe9ee8e89  references/sections/carousel.md
83ce1e8d53f1c1b0ce00a010aeaf6822b024ce1302a609ebf64b26759b2e83f4  references/sections/categories.md
6273e4f20d2b2ef4abe0e6f504561a8f3f60a4ce3c5cc750cdd12684e7d42e8d  references/sections/countdown.md
4e4e6feb2935d6cce442bcf0b3e64cfa6eae7023a669c047f56016f71eed4114  references/sections/custom-sections.md
091a7a0d945cf07db52da70e0f9d7f0b4a6571357e82f6f2c6604b4cb6f3dfdd  references/sections/gallery.md
53586d105740dfa3122d789efb27246946a6024eab3867c444cd82015144b5bb  references/sections/hero.md
f836d5670ce275c3ccc5780110eeaf1f86a6add07ea0668709a58b332eba9da1  references/sections/logo-social.md
3ff30d3f1056ebb3467e442f5958d4005d9fa7be6b6df0ec0c661e2136bd779e  references/sections/partners.md
e7c7457e91566b9375094e1453d0bce7fdcd0e629bb194d1f69d8ae650b3666f  references/sections/products.md
e230f176e23a1478e7fe36330c9a529812c520c94746786fde35b83b55931ad9  references/sections/testimonials.md
eb446e91cc2d6f0d9ddf7406e545313454a196a831b8a6f0e331757e65309635  references/sections/video.md
78aa9eb48101cd27df2012e381ac265a883b0f2be51b8f466065a2ccf9bd502a  references/sector-identities.md
2af1c011a67135c7429e29aec5e3fa8a63f9e1dbacd634b3ab57875f541109da  references/store-analysis.md
ff8914c4c901fda6543a1d86b5cc3201e2d3e8a4aa99e8fc60cb056296529fe9  references/theme-editor-matrix.md
ff05c46ebee7aa5cf470fbdc18d1424704ad768b8788f160d482945a223c9505  references/visual-decision-layer.md
08823fcdd7f7ec4980eae7cb056da7980fbce76c909bf650c462551dc4f4196d  references/zid-root-zip-rules.md
21a68b408fb682b5741f99f7fcd3892aeb20a8c7b70e4e911ec3dd77e03ffb52  scripts/audit_full_store.py
ef835d23dababa8e188b5c264be2eb963537b5ea546cbfc96be0b92fc45dba05  scripts/package_theme.sh
5b72429584f6a2539973d3cc5bc9b7c0fae01c15a544f986f60acef7ccf75ffb  scripts/validate_zid_zip.py
00d8e4d9ca349e169495dfd2e9fb1aba6bcea066504c0cdd3ed434e2091ecea1  scripts/zip_theme.py
```

