# Sector identity matrix — Saudi e-commerce

Each sector has an established visual language customers subconsciously expect. Start here, then differentiate with ONE signature twist so the store doesn't look generic. Palettes are mapped to growth-theme tokens: bg=background, fg=foreground, pri=primary, acc=accent.

Arabic-capable Google Fonts to draw from: Cairo (modern default), Changa (bold/sporty), Tajawal (clean/neutral), Almarai (elegant/light), IBM Plex Sans Arabic (tech), Amiri (heritage/serif), Noto Kufi Arabic (geometric), Rubik (friendly rounded), Lalezar (loud display).

| Sector | Mood | bg | fg | pri | acc | Font | Layout notes |
|---|---|---|---|---|---|---|---|
| أزياء نسائية | soft luxury | #FAF7F4 | #2B2530 | #B76E79 | #D4AF37 | Almarai | huge imagery, thin type, generous whitespace, lookbook gallery |
| أزياء رجالية / streetwear | bold urban | #111114 | #F2F2F0 | #E8E4DC | #FF4D2E | Changa | dark, oversized type, grid-breaking hero, drops countdown |
| عطور وعود | opulent heritage | #14100C | #EDE4D3 | #C9A24B | #7B2D3E | Amiri + Tajawal | near-black + gold, serif headlines, cinematic product shots |
| عناية وبشرة | clean clinical-soft | #FDFBF8 | #3A3733 | #8AA88F | #E7C6B3 | Tajawal | airy, pastel, ingredient callouts, trust badges high |
| إلكترونيات وتقنية | precise modern | #FFFFFF | #0F1115 | #0E63F4 | #16C784 | IBM Plex Sans Arabic | dense product grid, spec tables, comparison-friendly cards |
| قيمنق وأنمي | dark energetic | #0E0E12 | #F5F1E8 | #E63946 | #FFC53D | Cairo (700) | dark base, neon/comic accents, tilted badges, drops countdown |
| أطفال وألعاب | playful safe | #FFFDF5 | #33415C | #FF8552 | #5AA9E6 | Rubik | rounded corners (radius 12+), big buttons, illustration-friendly |
| أغذية وقهوة | warm appetizing | #FBF6EF | #3B2B20 | #B4552D | #6B8E4E | Cairo | food photography full-bleed, warm tints, recipe/story sections |
| حلويات وهدايا | delightful | #FFF8FA | #4A2C3A | #D4537E | #F2C14E | Rubik | gift-wrap motifs, occasion sections (عيد، تخرج)، bundles |
| مجوهرات وساعات | quiet luxury | #FCFCFA | #1C1B1A | #1C1B1A | #C0A062 | Almarai | monochrome + gold accent only, max whitespace, minimal UI chrome |
| رياضة ولياقة | energetic | #F7F8F9 | #101418 | #101418 | #D9F53A | Changa | diagonal cuts, motion imagery, bold numerals for prices |
| أثاث وديكور | serene organic | #F6F3EE | #2E2A26 | #6E5F4E | #A3B18A | Tajawal | room-scene photography, muted earth tones, category tiles |
| عطارة ومنتجات طبيعية | earthy trust | #F4EFE6 | #2F3A2F | #4E6E52 | #C77B3F | Cairo | kraft/botanical feel, certification badges, ingredient stories |
| كتب وقرطاسية | calm intellectual | #FBFAF6 | #26241F | #35506B | #C2452D | Amiri | editorial layout, serif titles, list-friendly product cards |
| سيارات وقطع غيار | industrial | #15171A | #EAECEF | #F2B705 | #D64545 | Changa | dark + hazard accents, part-number-first cards, fitment filters |
| صحة ومكملات | credible clean | #FFFFFF | #1F2933 | #0E7C66 | #F4A259 | Tajawal | white + medical green, dosage/benefit icons, reviews prominent |

## Differentiation rule (avoid generic output)

Sector identity = the safe 80%. Always add ONE signature element unique to the store (the remaining 20%):
- A recognizable background pattern (halftone for anime, kraft texture for عطارة, blueprint grid for tools)
- A distinctive badge/label style (tilted comic badges, wax-seal stamps, neon tags)
- A typographic move (giant outlined numerals, mixed serif/sans headlines)
- A section behavior (drops countdown, occasion selector, ingredient spotlight)

Implement the signature as identity-level CSS/assets (hardcoded), never as merchant settings — it's the theme's DNA.

## Price-tier modifiers

- **Premium**: increase whitespace, reduce accent usage to ≤10% of surface, lighter font weights, larger imagery, radius 0–4px.
- **Budget/value**: denser grids, stronger accent presence, visible promo badges, radius 8px, prices bold.

## Dark-theme caution

Dark sectors (gaming, streetwear, perfume, automotive) require the dark-theme audit in `customization-recipes.md` Recipe 1 — growth-theme defaults assume light backgrounds in some component utilities.
