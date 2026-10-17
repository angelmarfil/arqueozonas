import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const states = defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/data/states" }),
    schema: z.object({
        name: z.string(),
    })
})

const sites = defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/data/sites" }),
    schema: z.object({
        name: z.string(),
        state: z.string(),
        guide: z.string().optional(),
    })
})
export const collections = { states, sites };
