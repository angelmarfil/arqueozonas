// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

import mdx from "@astrojs/mdx";
import icon from "astro-icon";

import react from "@astrojs/react";

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
          R2_PUBLIC_URL: envField.string({ context: "server", access: "public", url: true, default: "https://pub-943f8dc39de9413eb77121b2bed8a963.r2.dev" }),
          LIGHTGALLERY_LICENSE_KEY: envField.string({ context: "client", access: "public", optional: true }),
      }
  },

  image: {
      remotePatterns: [{ protocol: "https", hostname: "**.r2.dev" }],
  },

  vite: {
      plugins: [tailwindcss()],
  },

  integrations: [mdx(), icon(), react()]
});