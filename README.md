<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.svg">
    <img src=".github/assets/logo-light.svg" alt="Arqueozonas" width="420">
  </picture>
</p>

<p align="center">
  A bilingual guide to the archaeological sites and museums of Mexico.<br>
  <a href="https://arqueozonas.mx">arqueozonas.mx</a>
</p>

## About

Arqueozonas is a static website, in Spanish and English, covering the archaeological sites and museums open to the public and managed by [INAH](https://www.inah.gob.mx). Each place has:

- Description, history, opening hours and admission fees
- An interactive map with location and site boundary
- A photo gallery with image credits
- 3D models from Sketchfab and links to virtual tours
- Visitor statistics from INAH's open data on [datos.gob.mx](https://www.datos.gob.mx)
- Downloadable PDF guides, when available

Every page also has a Markdown version (`index.md`), and the site publishes [`llms.txt`](https://arqueozonas.mx/llms.txt) for LLMs and AI agents.

## Tech stack

- [Astro](https://astro.build) with content collections and MDX
- [Tailwind CSS](https://tailwindcss.com) and [daisyUI](https://daisyui.com)
- [Preact](https://preactjs.com) for interactive islands
- [Leaflet](https://leafletjs.com) and [Supercluster](https://github.com/mapbox/supercluster) for maps
- [Chart.js](https://www.chartjs.org) for visitor statistics
- [LightGallery](https://www.lightgalleryjs.com) for photo galleries
- [Pagefind](https://pagefind.app) for search

## Getting started

Requires Node.js 22.22 or later and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev
```

The site runs at `http://localhost:4321`.

## Commands

| Command        | Action                                         |
| :------------- | :--------------------------------------------- |
| `pnpm dev`     | Start the dev server at `localhost:4321`       |
| `pnpm build`   | Build the site to `./dist/`                    |
| `pnpm preview` | Preview the build locally                      |
| `pnpm astro`   | Run Astro CLI commands, like `astro check`     |

Visitor statistics are downloaded from datos.gob.mx during the build, so it needs network access.

## Project structure

```text
src/
├── components/   Astro and Preact components
├── data/         Content collections
│   ├── sites/        Archaeological sites (MDX, es/ and en/)
│   ├── museums/      Museums (MDX, es/ and en/)
│   ├── galleries/    Photo galleries (JSON)
│   ├── models/       Sketchfab 3D models (JSON)
│   └── tours/        Virtual tours (JSON)
├── i18n/         UI strings and translation helpers
├── layouts/
├── lib/
├── loaders/      INAH visitor statistics loader
└── pages/        Spanish routes at the root, English under /en
public/
└── guides/       PDF guides (es/ and en/)
```

## Adding content

Sites and museums are MDX files in `src/data/sites` and `src/data/museums`, with one file per language using the same slug in `es/` and `en/`. The frontmatter is validated by the schemas in [`src/content.config.ts`](src/content.config.ts):

```mdx
---
name: "Palma Sola"
state: guerrero
inahId: 4352
lastReviewed: 2026-10-02
isOpen: true
position: { lat: 16.886667, lng: -99.90123 }
---

## Descripción {#description}
```

Galleries, 3D models and virtual tours are JSON files that reference sites and museums by slug.

## Credits

Content and images come from the [Instituto Nacional de Antropología e Historia (INAH)](https://www.inah.gob.mx). Image credits are shown with each photo.

Made by [Angel Marfil](https://angelmarfil.com).

## License

The source code is licensed under the [GNU Affero General Public License v3.0](LICENSE).
