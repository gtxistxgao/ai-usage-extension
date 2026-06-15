# Promotional Materials

Chrome Web Store requires a specific set of images for the listing. Drop the
final renders here using exactly the filenames below — the `store:check` tests
will fail the release if any required file is missing or has the wrong
format.

## Required files

| File                       | Purpose                        | Required size  |
| -------------------------- | ------------------------------ | -------------- |
| `icon-128.png`             | Store tile icon                | 128 × 128 px   |
| `screenshot-1.jpg`         | Primary screenshot             | 1280 × 800 px  |
| `screenshot-2.jpg`         | Secondary screenshot           | 1280 × 800 px  |
| `marquee.png`              | Marquee promo tile (optional)  | 1400 × 560 px  |
| `small-tile.png`           | Small promo tile (optional)    | 440 × 280 px   |

Optional files are not yet enforced by the tests; required files are.

## Source files

If you have editable sources (Figma, Sketch, .psd, .pen), keep them in
`promo/sources/` so the rendered PNGs above can be re-exported later. Anything
inside `sources/` is ignored by the release checker.

## Conventions

- All screenshots should show the extension in dark mode (the host pages
  already use a dark theme).
- Do not use real account data in screenshots — mock the percentages and the
  reset times so the listing does not leak personal usage.
- Use PNG for icons and promo tiles. Use high-quality JPEGs for screenshots to
  keep repository size reasonable.
