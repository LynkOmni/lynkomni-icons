# `@lynkomni/icons`

The LynkOmni brand system: logo, wordmark and emblem for web, React, Android, iOS and email, all generated
from one manifest. Nobody edits generated files, and every product gets updates automatically.

- Repository: `LynkOmni/lynkomni-icons` (private)
- Package: `@lynkomni/icons` on GitHub Packages
- Brand colours: ink `#18181B` / `#FFFFFF`, accent `#7C4DFF` (they follow the platform design tokens)

## What is in the package

| Output | Where | Used for |
| --- | --- | --- |
| React components | `dist/react/` | Web apps and the PWA |
| Clean SVG files | `dist/svg/` | Any `<img>`, emails, documents |
| Android drawables | `dist/android/res/drawable/` | Android apps |
| iOS asset catalogue | `dist/ios/LynkOmniBrand.xcassets/` | iOS apps |
| Favicon and PWA icons | `dist/web/` | Browser tabs, install icons, share image |
| Email images | `dist/email/` | Receipts, invoices, notifications (1x and 2x) |
| Typed index | `dist/brand/` and `dist/brand.json` | Code that needs ids, sizes and checksums |

Every asset (`emblem`, `logo`, `wordmark`) comes in five variants: `light`, `dark`, `contrast-light`,
`contrast-dark` and `mono` (one colour, follows the text colour). React also has an `Auto` version that
follows the platform theme by itself.

## Install

Route the `@lynkomni` scope to GitHub Packages in the consuming repo's `.npmrc`:

```ini
@lynkomni:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then `npm install @lynkomni/icons`. See `docs/usage.md` for React, Android, iOS, email and offline use.

## Rules

1. Draw only in `src/logos/`. Everything in `dist/` is generated and never committed.
2. Light and dark files must have identical shapes; only colours differ.
3. No text, images, scripts, fonts or external links inside an SVG.
4. Products never fetch brand files from the internet at run time; they bundle them.
5. Product names are never drawn into images. They are text beside the mark.
6. Names of repos, folders and files are lowercase, with hyphens, starting with `lynkomni`.

## Everyday commands

```bash
npm install          # once
npm run verify       # gates + build + output gates + tests
npm run verify:all   # the same, plus PNG/ICO files
```

`brand/usage-rules.md` holds the minimum sizes, clear space and "do not" rules (draft, pending designer
review). `docs/contributing.md` explains how a change becomes a release.

## Status

Phase A of the logos and icons plan. Product marks, status icons and the core UI icon set (phase C) will
be added under `src/products/`, `src/states/` and `src/ui/`.
