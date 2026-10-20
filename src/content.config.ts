import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { inahVisitorsLoader } from './loaders/visitors';

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
        draft: z.boolean().default(false),
        inahId: z.number().int().optional(),
        isOpen: z.boolean().optional(),
        hasMayaTrain: z.boolean().default(false),
        guide: z.enum(["es", "en"]).optional(),
        lastReviewed: z.coerce.date().optional(),
        position: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
        }).optional(),
        boundary: z.array(z.string().min(1)).min(1).optional(),
    })
})

const museums = defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/data/museums" }),
    schema: z.object({
        name: z.string(),
        state: z.string(),
        draft: z.boolean().default(false),
        inahId: z.number().int(),
        type: z.enum(["site", "local", "regional", "national", "metropolitan", "exhibitionHall", "communityCenter"]).optional(),
        guide: z.enum(["es", "en"]).optional(),
        lastReviewed: z.coerce.date().optional(),
        sites: z.array(reference("sites")).default([]),
        position: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
        }).optional(),
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

const tourProviders = defineCollection({
    loader: file("./src/data/tour-providers.json"),
    schema: z.object({
        name: z.string(),
        url: z.url(),
        color: z.enum(["primary", "secondary", "accent", "info", "success", "warning"]),
    })
})

const tours = defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/data/tours" }),
    schema: z.object({
        name: z.string(),
        provider: reference("tourProviders"),
        type: z.enum(["site", "museum", "object", "exhibition", "other"]),
        url: z.url(),
        state: reference("states").optional(),
        sites: z.array(reference("sites")).default([]),
        museums: z.array(reference("museums")).default([]),
    })
})

const models = defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/data/models" }),
    schema: z.object({
        name: z.object({
            es: z.string(),
            en: z.string(),
        }),
        type: z.enum(["structure", "object"]),
        sketchfabId: z.string().regex(/^[0-9a-f]{32}$/),
        thumbnail: z.url(),
        author: z.object({
            name: z.string(),
            url: z.url(),
        }),
        license: z.object({
            name: z.string(),
            url: z.url(),
        }).optional(),
        sites: z.array(reference("sites")).min(1),
    })
})

const monthlyCounts =z.array(z.number().int().nonnegative()).length(12);

const visitorRecord = z.object({
    name: z.string(),
    state: z.string(),
    years: z.array(z.object({
        year: z.number().int(),
        national: monthlyCounts,
        foreign: monthlyCounts,
    })),
});

const siteVisitors = defineCollection({
    loader: inahVisitorsLoader("visitantes_zonas_arqueologicas"),
    schema: visitorRecord,
});

const museumVisitors = defineCollection({
    loader: inahVisitorsLoader("visitantes_museos_abiertos_publico"),
    schema: visitorRecord,
});

export const collections = { states, sites, museums, galleries, tourProviders, tours, models, siteVisitors, museumVisitors };
