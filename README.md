# Zid Skills

The official repository for Zid's Arabic ecommerce Agent Skills, published through [skills.zid.sa](https://skills.zid.sa/).

Each skill is a complete, self-contained package rather than a standalone `SKILL.md` file. A package may include execution instructions, output templates, references, examples, assets, agent configuration, and validation scripts.

## Browse available skills

```bash
npx skills add https://github.com/zidsa/maharat-skills --list
```

## Install one skill

```bash
npx skills add https://github.com/zidsa/maharat-skills --skill merchant-lead-01
```

Replace `merchant-lead-01` with any directory name under `skills/`.

## Package structure

```text
skills/<skill-name>/
├── SKILL.md
├── LICENSE.txt
├── agents/
├── assets/
├── examples/
├── references/
└── scripts/
```

Companion files vary by skill. `SKILL.md` is always the package entry point, and any referenced companion files must remain in their original relative locations.

## Validate an output

When a package includes an output validator, run it after saving the result:

```bash
node skills/<skill-name>/scripts/validate-output.mjs result.md
```

Some skills include additional tests or validation commands inside their own `scripts/` directory. Review the package before running it.

## Repository workflow

This repository is the source of truth for installable skill packages. The [zidsa/zid-skills](https://github.com/zidsa/zid-skills) website repository mirrors the reviewed packages it publishes.

When adding or updating a skill:

1. Commit the complete package under `skills/<skill-name>/`.
2. Review `SKILL.md` and every companion file.
3. Run the package's validators and tests.
4. Confirm that paths, examples, and install instructions work from a clean checkout.
5. Update the website repository only after the source package is ready.

Do not submit `SKILL.md` alone when the skill depends on references, examples, assets, agents, or scripts.

## Official links

- Website: [skills.zid.sa](https://skills.zid.sa/)
- Website repository: [zidsa/zid-skills](https://github.com/zidsa/zid-skills)
- Skill packages: [zidsa/maharat-skills](https://github.com/zidsa/maharat-skills)

## Ownership and license

This repository and its skill packages are maintained and published by **Zid**. See the root [`LICENSE`](LICENSE) and each package's `LICENSE.txt` for usage terms.
