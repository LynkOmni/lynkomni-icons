# Changing the brand

1. Create a branch and change or add SVGs under `src/logos/` (and list new assets in
   `brand/manifest.v1.json`).
2. Run `npm run verify`. If a gate fails, it says which file and why.
3. Open a pull request. CI runs the same gates and builds the PNG/ICO files.
4. A brand owner reviews it (see `.github/CODEOWNERS`) and merges.
5. The release workflow builds everything, picks the new version from your commit title, updates the
   changelog and publishes the package.

## Commit titles decide the version

| Title starts with | Version change | Example |
| --- | --- | --- |
| `fix:` | patch (1.0.1) | `fix: align emblem baseline` |
| `feat:` | minor (1.1.0) | `feat: add product marks` |
| `feat!:` or a `BREAKING CHANGE:` line | major (2.0.0) | `feat!: move to dist layout` |
| `docs:`, `chore:` | no release | `docs: clarify clear space` |

## Rules for artwork

- Light and dark files use the same shapes; only the colours differ.
- Only `path` and `g` elements. Groups may carry only `translate(x y)`.
- Use only the brand colours from `brand/themes.v1.json`.
- Product names are never part of an image.

## Naming

Repos, folders and files are lowercase with hyphens and start with `lynkomni` where they name a repo
(for example `lynkomni-icons`, `lynkomni-platform`). The gates check this.
