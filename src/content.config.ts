import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
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
        state: reference("states"),
    })
})
export const collections = { states, sites };
