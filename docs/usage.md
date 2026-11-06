# Using the brand files

## React

```jsx
import { LynkOmniLogoAuto, LynkOmniEmblemMono } from '@lynkomni/icons';

<LynkOmniLogoAuto style={{ height: 32 }} />
<LynkOmniEmblemMono style={{ height: 24, color: 'var(--text-secondary)' }} />
```

- Components are plain `svg` elements, so they work with server rendering and any bundler.
- `...Auto` reads `--brand-ink` (falling back to `--text-primary`) and `--brand-primary` from the platform tokens (light, dark and high
  contrast). Outside the platform, pick `Light` or `Dark` yourself.
- Size with CSS (`height` or `width`); the artwork keeps its proportions.
- Each one is announced as "LynkOmni". For a purely decorative copy, pass `aria-hidden="true"
  role="presentation"`.

## Plain SVG, email and documents

Use `@lynkomni/icons/svg/lynkomni-logo-light.svg` (or `dark`, `mono`...). For email and PDFs use the PNGs
in `email/` (`logo-light.png`, `logo-light@2x.png`, and the dark pair). Embed them; do not link to them.

## Web app and PWA

Copy from `web/`: `favicon.svg` (switches with the user's colour scheme), `favicon.ico`,
`favicon-32.png`, `apple-touch-icon-180.png`, `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`,
`og-1200x630.png`. `web/icons-snippet.json` has the `icons` list for a web app manifest.

## Android

Copy `android/res/drawable/*.xml` into `app/src/main/res/drawable/`. Names look like
`lynkomni_logo_dark`. The `mono` ones are black; tint them (`app:tint`). Needs `fillType="evenOdd"`
support (API 24+).

## iOS

Drag `ios/LynkOmniBrand.xcassets` into the Xcode project. Images are vector SVG; the `mono` ones render
as templates so they take the tint colour.

## Code that needs ids or checksums

```js
import { brand } from '@lynkomni/icons/brand';
brand.assets.logo.variants.dark.svg; // "svg/lynkomni-logo-dark.svg"
brand.assets.logo.minWidthPx; // 96
```

`@lynkomni/icons/brand.json` also lists a SHA-256 for every file. The platform repo copies this into
`brand.lock.json` and fails its build if a file does not match.

## Offline

Everything above is bundled at build time. No product may load a brand file over the network at run time.
