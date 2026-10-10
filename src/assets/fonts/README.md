# Homebase typography assets

The maintainer selected Newsreader (academic identity/h1) + Geist Sans (functional UI) for 2.6C. This replaces the historical Manrope/DM Sans pairing only. No audition code or third-party runtime font URLs are included.

Both files are **unmodified official variable WOFF2 distributions**, licensed under SIL Open Font License 1.1. Corresponding notices are shipped in `public/font-licenses/` (available at `/font-licenses/` in the build). Copyright: Newsreader Project Authors (2020); Geist Project Authors (2024). Font files are not sold by themselves and retain their names/notices.

| File             | Official pinned source                                                                                                                                                                 |      Size | SHA-256                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------ |
| Newsreader.woff2 | [productiontype/Newsreader cfcb4f7](https://github.com/productiontype/Newsreader/blob/cfcb4f7af0e52c25e8df2a2431814c8e5fe2e155/fonts/variable/woff2/Newsreader%5Bopsz%2Cwght%5D.woff2) | 214,880 B | `1faa3380ac0e87e057b180e03fd94bd708a612afb67d2590677be4508909fae9` |
| Geist.woff2      | [vercel/geist-font 10dc765](https://github.com/vercel/geist-font/blob/10dc7658f13c38a474cde201bb09a4617267545b/fonts/Geist/webfonts/Geist%5Bwght%5D.woff2)                             |  69,760 B | `2ffebe993e969069a9789d15164b7715d42491b5835516c5e3b935d5f81b05f1` |

Matching official variable TTF metadata inspected with fontTools (inspection files only, not shipped): Newsreader Version 1.003, wght 200–800 and opsz 6–72 (default 18), x-height 852/2000 units; Geist Version 1.800, wght 100–900, x-height 530/1000 units. CSS declares these weight ranges, `font-optical-sizing: auto`, normal style, `font-synthesis: none` and `font-display: swap`. No unused italics, Mono or static weight copies. No preload or font-loading JavaScript; Vite supplies content-hashed assets. First-paint appearance remains independent of font readiness.

Official notices (trailing whitespace normalized; copyright and license wording preserved): [Newsreader](../../../public/font-licenses/Newsreader-OFL.txt), SHA-256 `865f0949b59fab5925506f80102dff3d12e8666412daf52d212db969d40adc25`; [Geist](../../../public/font-licenses/Geist-OFL.txt), SHA-256 `942560b236adfa83745b2c64e5fc09ebaf91cb331751b1157eb92187e5d6e930`.
