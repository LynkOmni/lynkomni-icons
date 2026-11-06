# LynkOmni brand usage rules

**Status: draft.** Written from the artwork and the platform's accessibility rules. A designer must
confirm these before they are published outside the team. The numbers marked (measured) are checked
automatically on every pull request.

## Variants

| Variant | Use it for |
| --- | --- |
| `light` | Light backgrounds |
| `dark` | Dark backgrounds |
| `contrast-light`, `contrast-dark` | When the user turns on high contrast. The accent changes to `#4C1D95` / `#C4B5FD` so it stays easy to see |
| `mono` | Print, stamps, watermarks, receipts, anything in one colour. It takes the surrounding text colour |
| `Auto` (React) | Anywhere the platform design tokens are loaded. It follows light, dark and both high-contrast themes with no code |

## Sizes and space

- Minimum width: emblem 24 px, wordmark 80 px, logo 96 px.
- Clear space: keep at least a quarter of the asset's height free on every side.
- Never stretch, rotate, recolour, outline, add shadows, or place on photos or busy patterns.
- Never draw a product name inside the image. The name is always text beside the mark.

## Which asset to use where

Three assets, each in every theme: **logo** (emblem plus wordmark), **emblem** (symbol only), **wordmark** (the word "LynkOmni" only).

1. **Logo** is the default whenever the brand introduces itself and there is room.
2. **Emblem** is for small, square or crowded spaces, and anywhere the name is already written next to it.
3. **Wordmark** is for places that need the name read, not recognised, or where the symbol is already shown close by.

| Where | Asset |
| --- | --- |
| Website and dashboard header | Logo; emblem when under 96 px wide |
| Footer, login, onboarding, hero, status page, docs header | Logo |
| Side menu | Logo; emblem when collapsed |
| App icon, splash screen, favicon, browser tab, install icon, profile picture | Emblem |
| Top bar inside a product app | Emblem plus the product name as text |
| Loading and empty screens, chat launcher | Emblem |
| Notification icon, stamps, watermarks | Emblem, one colour |
| Invoice header (LynkOmni branding tier) | Logo, one colour in print |
| Printed receipts (58 and 80 mm) | Wordmark, one colour |
| Email header | Logo (embedded image) |
| Email footer, "Powered by LynkOmni", partner lockups | Wordmark |
| Share image for links | Logo |

Never place the emblem and the wordmark side by side to rebuild the logo: use the logo. Never draw a product
name inside the image. The platform repo holds the machine-readable version (`brand/surfaces.v1.json`) and
checks it on every pull request.

## Contrast (measured)

The brand must have at least 3:1 contrast against the background (WCAG 2.2 AA for graphics).

| Theme | Ink on background | Accent on background |
| --- | --- | --- |
| light | 16.1 to 17.7 : 1 | 4.4 to 4.8 : 1 |
| dark | 14.9 to 19.9 : 1 | 3.1 to 4.1 : 1 |
| contrast-light | 21 : 1 | 10.9 : 1 |
| contrast-dark | 21 : 1 | 11.4 : 1 |

Watch out: in the dark theme the accent on `bg-subtle` is only 3.09 : 1, barely above the limit. Prefer
`bg-base` or `bg-surface` for the logo in dark mode.

## Offline and security

- Bundle the files with the app. Never load a logo from a web address at run time.
- Merchant-uploaded logos are PNG, JPEG or WebP only. SVG uploads are rejected.

## Not yet done

- The LynkOmni name and these marks are not trademark-checked.
- Favicon, share image and email images are generated automatically, but no designer has reviewed them
  at small sizes.
