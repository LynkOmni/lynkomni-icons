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
