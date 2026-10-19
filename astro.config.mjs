// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

import mdx from "@astrojs/mdx";
import icon from "astro-icon";

import react from "@astrojs/react";
import pagefind from "astro-pagefind";
import { satteri } from "@astrojs/markdown-satteri";
import siteSections from "./src/markdown/site-sections.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://arqueozonas.mx",

  i18n: {
    locales: ["es", "en"],
    defaultLocale: "es",
  },
  env: {
      schema: {
          SITE_TITLE: envField.string({ context: "client", access: "public", default: "Arqueozonas MX" }),
          TITLE_DELIMITER: envField.string({ context: "client", access: "public", default: "|" }),
          R2_PUBLIC_URL: envField.string({ context: "server", access: "public", url: true, default: "https://pub-943f8dc39de9413eb77121b2bed8a963.r2.dev" }),
          IMAGE_TRANSFORMS: envField.boolean({ context: "server", access: "public", default: false }),
          LIGHTGALLERY_LICENSE_KEY: envField.string({ context: "client", access: "public", optional: true }),
          GOOGLE_MAPS_API_KEY: envField.string({ context: "client", access: "public", optional: true }),
          GOOGLE_MAPS_GENERAL_MAP_ID: envField.string({ context: "client", access: "public", default: "DEMO_MAP_ID" }),
          GOOGLE_MAPS_ZONE_MAP_ID: envField.string({ context: "client", access: "public", default: "DEMO_MAP_ID" }),
      }
  },

  markdown: {
      processor: satteri({ hastPlugins: [siteSections], features: { headingAttributes: true } }),
  },

  vite: {
      plugins: [tailwindcss()],
      ssr: {
          noExternal: ["@googlemaps/markerclusterer"],
      },
  },

  integrations: [mdx(), icon(), react(), pagefind()]
});