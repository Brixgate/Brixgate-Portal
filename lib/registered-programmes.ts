export interface BrixgateProgramme {
  slug: string
  title: string
  subtitle: string
  category: 'professionals' | 'foundations'
  websiteUrl: string    // relative path: e.g. '/programme-engineering'
  image: string         // local public image path
}

export const BRIXGATE_PROGRAMMES: BrixgateProgramme[] = [
  // ── AI for Professionals ──────────────────────────────────────────────────────
  {
    slug: 'programme-engineering',
    title: 'AI in Software Engineering',
    subtitle: 'Build smarter software with AI-assisted development, code generation, and intelligent debugging.',
    category: 'professionals',
    websiteUrl: '/programme-engineering',
    image: '/images/Development.jpeg',
  },
  {
    slug: 'programme-cybersecurity',
    title: 'AI in Cybersecurity',
    subtitle: 'Defend and detect threats at scale using AI-powered security tools and threat intelligence.',
    category: 'professionals',
    websiteUrl: '/programme-cybersecurity',
    image: '/images/Cybersecurity.jpeg',
  },
  {
    slug: 'programme-finance',
    title: 'AI in Financial Modelling',
    subtitle: 'Automate financial analysis, forecasting, and reporting with machine learning techniques.',
    category: 'professionals',
    websiteUrl: '/programme-finance',
    image: '/images/Data.jpeg',
  },
  {
    slug: 'programme-marketing',
    title: 'AI in Product Marketing',
    subtitle: 'Leverage AI for customer segmentation, campaign optimisation, and growth strategy.',
    category: 'professionals',
    websiteUrl: '/programme-marketing',
    image: '/images/Product%20Management.jpeg',
  },
  {
    slug: 'programme-education',
    title: 'Education & Training',
    subtitle: 'Transform how you teach and learn with AI tools for content creation and personalised instruction.',
    category: 'professionals',
    websiteUrl: '/programme-education',
    image: '/images/Development.jpeg',
  },
  {
    slug: 'programme-healthcare',
    title: 'Healthcare & Medicine',
    subtitle: 'Apply AI to diagnostics, clinical workflows, and patient care optimisation.',
    category: 'professionals',
    websiteUrl: '/programme-healthcare',
    image: '/images/Data.jpeg',
  },
  {
    slug: 'programme-hr',
    title: 'Human Resources',
    subtitle: 'Streamline recruitment, performance management, and HR operations with AI.',
    category: 'professionals',
    websiteUrl: '/programme-hr',
    image: '/images/Product%20Management.jpeg',
  },
  {
    slug: 'programme-legal',
    title: 'Legal & Compliance',
    subtitle: 'Accelerate contract review, research, and compliance monitoring with AI.',
    category: 'professionals',
    websiteUrl: '/programme-legal',
    image: '/images/Data.jpeg',
  },
  {
    slug: 'programme-manufacturing',
    title: 'Manufacturing',
    subtitle: 'Optimise production lines, quality control, and supply chain with AI-driven insights.',
    category: 'professionals',
    websiteUrl: '/programme-manufacturing',
    image: '/images/Cloud%20and%20DevOps.jpeg',
  },
  {
    slug: 'programme-operations',
    title: 'Operations & Supply Chain',
    subtitle: 'Use AI to forecast demand, reduce costs, and improve operational efficiency.',
    category: 'professionals',
    websiteUrl: '/programme-operations',
    image: '/images/Cloud%20and%20DevOps.jpeg',
  },
  {
    slug: 'programme-pm',
    title: 'Project Management',
    subtitle: 'Manage projects smarter with AI scheduling, risk assessment, and resource planning.',
    category: 'professionals',
    websiteUrl: '/programme-pm',
    image: '/images/Product%20Management.jpeg',
  },
  // ── AI Foundations (Beginner) ─────────────────────────────────────────────────
  {
    slug: 'foundations-software-engineering',
    title: 'AI in Software Engineering',
    subtitle: 'Beginner-friendly introduction to AI-assisted coding and software development.',
    category: 'foundations',
    websiteUrl: '/foundations-software-engineering',
    image: '/images/Development.jpeg',
  },
  {
    slug: 'foundations-ai-automation',
    title: 'AI Automation',
    subtitle: 'Learn to automate repetitive tasks and build AI-powered workflows from scratch.',
    category: 'foundations',
    websiteUrl: '/foundations-ai-automation',
    image: '/images/Data.jpeg',
  },
  {
    slug: 'foundations-data-analytics',
    title: 'Data Analytics',
    subtitle: 'Analyse data and generate business insights using AI and analytics tools.',
    category: 'foundations',
    websiteUrl: '/foundations-data-analytics',
    image: '/images/Data%20Analytics.jpeg',
  },
  {
    slug: 'foundations-data-science',
    title: 'Data Science',
    subtitle: 'Build predictive models and work with data science techniques at an accessible level.',
    category: 'foundations',
    websiteUrl: '/foundations-data-science',
    image: '/images/Data%20Analytics.jpeg',
  },
  {
    slug: 'foundations-cyber-security',
    title: 'Cyber Security',
    subtitle: 'Foundations of cybersecurity concepts enhanced with AI-powered tools and practices.',
    category: 'foundations',
    websiteUrl: '/foundations-cyber-security',
    image: '/images/Cybersecurity.jpeg',
  },
  {
    slug: 'foundations-bapm',
    title: 'Business Analysis & Project Management',
    subtitle: 'Master business analysis and project delivery with AI-driven insights and tools.',
    category: 'foundations',
    websiteUrl: '/foundations-bapm',
    image: '/images/Product%20Management.jpeg',
  },
  {
    slug: 'foundations-product-management',
    title: 'Product Management',
    subtitle: 'Build and launch AI-enhanced products with modern product management frameworks.',
    category: 'foundations',
    websiteUrl: '/foundations-product-management',
    image: '/images/Product%20Management.jpeg',
  },
]

export const BRIXGATE_WEBSITE = 'https://brixgate.com'

export function enrollUrl(programme: BrixgateProgramme): string {
  return `${BRIXGATE_WEBSITE}${programme.websiteUrl}`
}

/** Returns `n` programmes from the professionals category in a stable pseudo-random order. */
export function suggestedProgrammes(n: number): BrixgateProgramme[] {
  const pros = BRIXGATE_PROGRAMMES.filter(p => p.category === 'professionals')
  // Deterministic shuffle based on day of year — same set per day, no hydration mismatch
  const seed = Math.floor(Date.now() / 86_400_000)
  const sorted = [...pros].sort((a, b) => {
    const ha = hashString(a.slug + seed)
    const hb = hashString(b.slug + seed)
    return ha - hb
  })
  return sorted.slice(0, n)
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}
