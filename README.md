# Kodaxa Innovations Website

Public portfolio and case-study site for **Kodaxa Innovations**.

> **Systems for uncertain worlds.**  
> Trust infrastructure, agent governance, and tools that make consequential decisions legible.

## Current implementation

This repository implements the first production-shaped pass of the approved **Evidence Engine** visual direction:

- cinematic editorial homepage based on the chosen mockup;
- Kodaxa Innovations branded header/footer treatment with a web-vectorized mark derived from the supplied logo;
- animated evidence-field hero built with Canvas, not a heavy background video;
- domain panels for Programmable Worlds, Agent Governance, and Clarity Tools;
- featured FrontierWarden system panel with trust-evaluation diagram;
- portfolio rail for Signal Vault, Code-Warden, EF-Atlas, STEP, and RowDiFF;
- concept/archive treatment for Agency Terminal;
- statically generated case-study routes for all nine reviewed repositories;
- mobile-responsive collapse matching the mobile concept direction;
- reduced-motion-safe animation behavior.

## Stack decision

| Layer | Selection | Reason |
| --- | --- | --- |
| Framework | Astro 6 + TypeScript | The site is a portfolio publication, not a dashboard or application. Static-first output keeps it fast and indexable. |
| Content | Astro Content Collections + MDX | Project claims, status, and case studies remain structured, auditable, and easy to expand. |
| Motion | GSAP + custom Canvas hero | Provides the precision motion needed for the mockup without turning the entire site into a JavaScript app. |
| Typography | Instrument Serif, Inter Variable, IBM Plex Mono | Recreates the editorial/technical contrast in the approved visual direction. |
| Deployment target | Vercel static deployment | Matches the existing Kodaxa deployment workflow while requiring no backend. |

Astro is intentionally used instead of a React/Vite SPA. The visual target needs a small number of carefully authored interactive elements; it does not require client hydration for the whole site.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Editorial portfolio homepage |
| `/work/frontierwarden` | Featured case study |
| `/work/signal-vault` | Product case study |
| `/work/ef-atlas` | Knowledge infrastructure case study |
| `/work/code-warden` | Agent governance case study |
| `/work/step` | Learning instrument case study |
| `/work/rowdiff` | Data instrument case study |
| `/work/chronosmcp` | Memory layer case study |
| `/work/task-anchor` | Focus governance case study |
| `/work/agency-terminal` | Concept study |

## Development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run check
```

The validation pipeline executes Astro type checking, the Kodaxa line-limit gate (`<=400` lines for authored TypeScript/Astro/CSS/script files), and a production static build.

## Content integrity

The site deliberately differentiates shipped, alpha, technical-tool, and concept work. Product status and claims should remain consistent with the corresponding project repository documentation. See [`docs/02-content-truth-register.md`](docs/02-content-truth-register.md).

## Next implementation passes

1. Replace the web-vectorized logo treatment with the production transparent brand master and replace schematic preview cards with art-directed real project imagery and architecture boards.
2. Complete the FrontierWarden case study composition to match the detailed mockup panel-by-panel.
3. Add Work archive filtering and project/domain navigation.
4. Add Vercel configuration, metadata images, sitemap, and deployment domain wiring.
5. Conduct accessibility, Lighthouse, responsive, and content-claim verification before public release.
