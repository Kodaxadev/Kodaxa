import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string(),
    summary: z.string(),
    domain: z.enum(['Programmable Worlds', 'Agent Governance', 'Clarity Tools', 'Concepts']),
    status: z.string(),
    featured: z.boolean().default(false),
    order: z.number(),
    repository: z.url(),
    liveUrl: z.url().optional(),
    stack: z.array(z.string()),
    media: z.object({
      src: z.string(),
      label: z.enum(['Product board', 'Design target', 'System plate', 'Concept plate']),
      alt: z.string(),
      note: z.string(),
    }).optional(),
  }),
});

export const collections = { projects };
