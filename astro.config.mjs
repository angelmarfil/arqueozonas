// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    env: {
        schema: {
            SITE_TITLE: envField.string({ context: "client", access: "public" }),
        }
    },
    vite: {
        plugins: [tailwindcss()],
    }
});
