// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  i18n: {
    locales: ["es", "en"],
    defaultLocale: "es",
  },
  env: {
      schema: {
          SITE_TITLE: envField.string({ context: "client", access: "public", default: "Arqueozonas MX" }),
          TITLE_DELIMITER: envField.string({ context: "client", access: "public", default: "|" }),
      }
  },

  vite: {
      plugins: [tailwindcss()],
  },

  integrations: [mdx()]
});