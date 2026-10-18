import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const states = defineCollection({
    loader: file("./src/data/states.json"),
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
