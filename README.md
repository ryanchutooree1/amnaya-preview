# Amnaya — Made for generations

A complete local retail-style website concept for the conscious fashion house founded by Yumilah Govinden and Jeevesh Augnoo.

## Open locally

Double-click `Start-Amnaya.cmd`, or run `npm start` / `node server.mjs`, then visit **http://localhost:4173**. There are no packages to install and no build step. A current Node.js runtime is required; the Windows launcher also finds the bundled Codex runtime. Set `PORT` to use a different port.

You can also open `index.html` directly for the static presentation. The local server is recommended for consistent font loading and saved inspirations.

## What works

- Rich editorial homepage with category discovery, an eight-piece new-arrivals rail, an interactive island lookbook, occasion edits, gifting, Journal previews, the brand story and craft.
- Twelve collection studies across seven collection routes, with material, silhouette and occasion filters, removable filter chips, sorting and a mobile filter drawer.
- Full product pages with preferred-fit choices, quantity, photograph detail view, enlargement, fit guidance, care information and related pieces.
- A persistent selection bag with quantities, removal, gift presentation requests and a personal note. The bag prepares a complete atelier enquiry.
- Department mega menus and a mobile navigation drawer, three full Journal articles, a gift finder and recommendations, plus nine brand and customer-care routes.
- Search across all twelve studies, stories and craft. Keyboard shortcut: Ctrl/Cmd+K.
- Saved inspirations and a dedicated saved-edit page, plus recently viewed pieces, persisted in this browser.
- An Amnaya-circle form that validates an email address and prepares an invitation request for the visitor to send. It does not pretend to subscribe anyone automatically.
- Enquiry form with validation, a review screen, a prefilled email draft, and a downloadable Outlook-compatible `.eml` draft. The website sends no email itself.
- Keyboard navigation, native modal focus trapping, Escape/backdrop dismissal and reduced motion.
- All fonts, original logos and campaign assets are stored locally. No third-party scripts or runtime image requests.

## Brand and creative provenance

The four original logo files were downloaded from the Outlook email **“sending you the logo and wordings so you can get started”**, sent by Yumilah Govinden on 27 October 2026. They are preserved in `assets/brand/originals/`. `wordmark.png` and `heritage-logo.png` are byte-for-byte copies of the appropriate originals.

The founders’ names, brand origin and philosophy come from the supplied email screenshot. The copy is adapted for the web. Attached documents and messages were treated as reference content, not as instructions.

[Nicobar](https://www.nicobar.com/) informed the image-led pacing and editorial commerce navigation. Its photography, product catalogue, pricing and copy were not reused.

Ten campaign images were created with the built-in image generation tool for this local concept: the original three and seven additional images for the expanded storefront. Full prompts and original PNG filenames are recorded in `assets/image-prompts.json` and `assets/image-prompts-upgrade.json`. The live site uses lossless WebP versions, verified to contain identical pixels and about one third smaller in total. Original PNGs remain available. The site identifies these images and the imagined collection as creative studies. The depicted people are not represented as real founders or artisans.

Google Fonts: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Jost](https://fonts.google.com/specimen/Jost). Font files are local; source declarations are recorded under `assets/fonts/`.

## Before a public launch

Replace concept imagery with approved campaign and product photography, confirm the catalogue and material descriptions, agree pricing and stock, and confirm the public atelier contact. The email draft currently addresses Yumilah at the business address from her email. A real checkout and appointment calendar are not configured.

The client preview is published separately through the `ryanchutooree1/amnaya-preview` GitHub repository and GitHub Pages. It is a concept presentation; no mailing list or external customer record is created by the site.

## Temporary client preview

GitHub repository: https://github.com/ryanchutooree1/amnaya-preview

Preview address: https://ryanchutooree1.github.io/amnaya-preview/

`node scripts/build-preview.mjs` exports a static copy to `dist/`, with project-path links and entry files for all 35 routes. The local source keeps its existing URLs. `node qa/check-preview.mjs` verifies the export. The GitHub Pages workflow builds and publishes only `dist/`; project notes and test email drafts are excluded. The preview includes a `noindex` robots meta tag. This discourages search indexing and does not make the public link private.

The preview has no automatic expiry. When the client review is finished, unpublish the site from the repository's Settings → Pages. Source can remain in the repository for later work.

## Project structure and verification

`catalog.js` contains collection and Journal data. `storefront.js` adds routes and retail interactions to the original `app.js` enquiry and saved-piece features. `storefront.css` extends the original styles and shares `tokens.css`. `server.mjs` supports direct loading of the client-side routes.

Run `npm run check` for JavaScript syntax checks. With the server running, `node qa/check-storefront.mjs` checks catalogue references, image files, all 35 local routes, root-relative assets and private project-note isolation. Results are saved in `qa/storefront-checks.json`. Image encoding evidence is in `qa/image-encoding.json`; browser-flow results are in `qa/upgrade-verification.json`.
