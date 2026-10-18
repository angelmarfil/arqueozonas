import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const states = defineCollection({
    loader: file("./src/data/states.json"),
    schema: z.object({
        name: z.string(),
        cover: reference("galleries").optional(),
    })
})

const sites = defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/data/sites" }),
    schema: z.object({
        name: z.string(),
        state: z.string(),
        inahId: z.number().int().optional(),
        isOpen: z.boolean().optional(),
        hasMayaTrain: z.boolean().default(false),
        guide: z.string().optional(),
        lastReviewed: z.coerce.date().optional(),
    })
})

const galleries = defineCollection({
    loader: glob({ pattern: "*.json", base: "./src/data/galleries" }),
    schema: z.object({
        inahId: z.number(),
        cover: z.string().optional(),
        images: z.array(z.object({
            key: z.string(),
            title: z.string(),
            credit: z.string().optional(),
        })),
    }).refine(
        ({ cover, images }) => cover === undefined || images.some(({ key }) => key === cover),
        { path: ["cover"], message: "cover must be the key of one of the gallery images" },
    )
})

const tours = defineCollection({
    loader: glob({ pattern: "*.json", base: "./src/data/tours" }),
    schema: z.object({
        name: z.string(),
        type: z.enum(["site", "museum", "object", "exhibition", "other"]),
        url: z.url(),
        state: reference("states").optional(),
        sites: z.array(reference("sites")).default([]),
    })
})

export const collections = { states, sites, galleries, tours };
