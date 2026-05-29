export const domains = [
  {
    number: '01',
    title: 'Programmable Worlds',
    description: 'Infrastructure for trust, intelligence, and coordination in persistent worlds.',
    projects: ['FrontierWarden', 'Signal Vault', 'EF-Atlas', 'Agency Terminal'],
    icon: 'nodes',
  },
  {
    number: '02',
    title: 'Agent Governance',
    description: 'Controls, memory, and enforcement layers for reliable autonomous systems.',
    projects: ['Code-Warden', 'ChronosMCP', 'Task Anchor'],
    icon: 'shield',
  },
  {
    number: '03',
    title: 'Clarity Tools',
    description: 'Human-first instruments that make hidden steps and data change understandable.',
    projects: ['STEP', 'RowDiFF'],
    icon: 'triangle',
  },
] as const;

export const principles = [
  {
    title: 'Verifiable by design',
    copy: 'Trust signals and decisions remain traceable to evidence and declared policy.',
  },
  {
    title: 'Open & interoperable',
    copy: 'APIs, SDKs, export paths, and standards wherever the system permits.',
  },
  {
    title: 'Privacy respecting',
    copy: 'Local-first boundaries and minimum-necessary data handling by design.',
  },
  {
    title: 'Adversary aware',
    copy: 'Systems built for contested information, drift, and manipulation risk.',
  },
] as const;

export const projectCards = [
  {
    slug: 'signal-vault',
    title: 'Signal Vault',
    copy: 'Local-first field intelligence for EVE Frontier: capture, score, and reconfirm what matters.',
    action: 'Explore app',
    liveUrl: undefined,
    kind: 'map',
  },
  {
    slug: 'code-warden',
    title: 'Code-Warden',
    copy: 'Governance and enforcement for AI coding agents with scope gates and audit evidence.',
    action: 'View case study',
    liveUrl: undefined,
    kind: 'code',
  },
  {
    slug: 'ef-atlas',
    title: 'EF-Atlas',
    copy: 'Authority-tiered builder knowledge corpus and API for EVE Frontier agents.',
    action: 'Explore',
    liveUrl: 'https://atlas.kodaxa.dev',
    kind: 'radar',
  },
  {
    slug: 'step',
    title: 'STEP',
    copy: 'Procedure-first GED math learning that makes missing reasoning steps visible.',
    action: 'Launch app',
    liveUrl: 'https://step.kodaxa.dev',
    kind: 'graph',
  },
  {
    slug: 'rowdiff',
    title: 'RowDiFF',
    copy: 'Semantic CSV diff and merge tooling with readable, key-aware review output.',
    action: 'View project',
    liveUrl: undefined,
    kind: 'matrix',
  },
] as const;
