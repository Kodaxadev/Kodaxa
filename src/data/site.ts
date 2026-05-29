export const domains = [
  {
    number: '01',
    slug: 'programmable-worlds',
    title: 'Programmable Worlds',
    description: 'Infrastructure for trust, intelligence, and coordination in persistent worlds.',
    projects: ['FrontierWarden', 'Signal Vault', 'EF-Atlas', 'Agency Terminal'],
    icon: 'nodes',
  },
  {
    number: '02',
    slug: 'agent-governance',
    title: 'Agent Governance',
    description: 'Controls, memory, and enforcement layers for reliable autonomous systems.',
    projects: ['Code-Warden', 'ChronosMCP', 'Task Anchor'],
    icon: 'shield',
  },
  {
    number: '03',
    slug: 'clarity-tools',
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
    title: 'Open and interoperable',
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
    copy: 'Local-first field intelligence for EVE Frontier with source and staleness context.',
    action: 'Open dossier',
    image: '/assets/projects/signal-vault-dossier.svg',
    mediaLabel: 'Product board',
  },
  {
    slug: 'code-warden',
    title: 'Code-Warden',
    copy: 'Scope, verification, and review evidence for assisted development work.',
    action: 'Open dossier',
    image: '/assets/projects/code-warden-plate.svg',
    mediaLabel: 'System plate',
  },
  {
    slug: 'ef-atlas',
    title: 'EF-Atlas',
    copy: 'Authority-tiered builder knowledge corpus and API for EVE Frontier agents.',
    action: 'Open dossier',
    image: '/assets/projects/ef-atlas-plate.svg',
    mediaLabel: 'System plate',
  },
  {
    slug: 'step',
    title: 'STEP',
    copy: 'Procedure-first GED math learning that makes missing reasoning steps visible.',
    action: 'Open dossier',
    image: '/assets/projects/step-dashboard-target.svg',
    mediaLabel: 'Design target',
  },
  {
    slug: 'rowdiff',
    title: 'RowDiFF',
    copy: 'Semantic CSV comparison and merge tooling with key-aware review output.',
    action: 'Open dossier',
    image: '/assets/projects/rowdiff-plate.svg',
    mediaLabel: 'System plate',
  },
] as const;
