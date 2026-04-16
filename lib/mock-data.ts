// ─────────────────────────────────────────────────────────────────────────────
// Brixgate Portal — Mock Data
// ALL mock data lives here. Never inline data in components.
// Uses only Brixgate's 7 real programs and Nigerian context.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  User,
  Program,
  Instructor,
  Cohort,
  Enrollment,
  Session,
  Resource,
  Certificate,
  Notification,
  DashboardStats,
  NotificationPreferences,
  CourseSyllabus,
} from '@/lib/types'

// ── Mock Student ─────────────────────────────────────────────────────────────
export const MOCK_STUDENT: User = {
  id: 'student-001',
  firstName: 'Adebayo',
  lastName: 'Okafor',
  email: 'adebayo.okafor@gmail.com',
  phone: '+234 801 234 5678',
  avatar: undefined,
  role: 'student',
  createdAt: '2026-01-15',
  lastActive: '2026-04-13',
}

// ── Mock Programs (all 7 Brixgate programmes) ─────────────────────────────────
export const MOCK_PROGRAMS: Program[] = [
  {
    id: 'prog-ai-software',
    title: 'AI in Software Engineering',
    subtitle: 'Build smarter, ship faster with AI-assisted development',
    category: 'professional',
    description:
      'Learn how to integrate AI tools into your engineering workflow — from AI-assisted code review and testing to deploying AI-powered APIs in production.',
    duration: '12 weeks',
    thumbnail: '',
    thumbnailColor: '#00435D',
    price: 250000,
    status: 'published',
  },
  {
    id: 'prog-ai-cyber',
    title: 'AI in Cyber Security & Intelligence',
    subtitle: 'Leverage AI to detect, respond and defend at scale',
    category: 'professional',
    description:
      'Explore how artificial intelligence is transforming threat detection, incident response and intelligence analysis in modern cybersecurity operations.',
    duration: '12 weeks',
    thumbnail: '',
    thumbnailColor: '#0F172A',
    price: 280000,
    status: 'published',
  },
  {
    id: 'prog-ai-data',
    title: 'AI in Data Analytics',
    subtitle: 'Transform raw data into strategic intelligence with AI',
    category: 'professional',
    description:
      'Master AI-powered data analysis techniques — from automated insights and predictive modelling to building data pipelines that scale.',
    duration: '10 weeks',
    thumbnail: '',
    thumbnailColor: '#1D4ED8',
    price: 240000,
    status: 'published',
  },
  {
    id: 'prog-ai-cloud',
    title: 'AI in Cloud & DevOps',
    subtitle: 'Automate and optimise cloud infrastructure with AI',
    category: 'professional',
    description:
      'Discover how AI enhances cloud architecture, automates DevOps pipelines, and enables intelligent resource management across AWS, GCP and Azure.',
    duration: '10 weeks',
    thumbnail: '',
    thumbnailColor: '#0369A1',
    price: 265000,
    status: 'published',
  },
  {
    id: 'prog-ai-product',
    title: 'AI in Product Management',
    subtitle: 'Build and ship AI-powered products users love',
    category: 'professional',
    description:
      'Learn to define, prioritise and ship AI products — from discovery and roadmapping to working with engineering teams on model integration.',
    duration: '8 weeks',
    thumbnail: '',
    thumbnailColor: '#7C3AED',
    price: 260000,
    status: 'published',
  },
  {
    id: 'prog-ai-design',
    title: 'AI in Product Design',
    subtitle: 'Design intuitive AI-driven user experiences',
    category: 'professional',
    description:
      'Understand how to design for AI — from crafting clear model outputs to building UX flows that handle uncertainty, errors and edge cases gracefully.',
    duration: '8 weeks',
    thumbnail: '',
    thumbnailColor: '#BE185D',
    price: 255000,
    status: 'published',
  },
  {
    id: 'prog-general-ai',
    title: 'General AI',
    subtitle: 'Your practical first step into the world of AI',
    category: 'beginner',
    description:
      'A beginner-friendly introduction to artificial intelligence — no prior technical knowledge required. Learn what AI is, how it works, and how to use it in your everyday life and work.',
    duration: '6 weeks',
    thumbnail: '',
    thumbnailColor: '#D97706',
    price: 180000,
    status: 'published',
  },
]

// ── Mock Instructor ───────────────────────────────────────────────────────────
export const MOCK_INSTRUCTOR_USER: User = {
  id: 'inst-001',
  firstName: 'Chukwuemeka',
  lastName: 'Eze',
  email: 'chukwuemeka.eze@brixgate.com',
  phone: '+234 802 345 6789',
  role: 'instructor',
  createdAt: '2025-06-01',
  lastActive: '2026-04-13',
}

export const MOCK_INSTRUCTOR: Instructor = {
  id: 'instructor-001',
  userId: 'inst-001',
  user: MOCK_INSTRUCTOR_USER,
  jobTitle: 'Senior AI Engineer',
  bio: 'Chukwuemeka has 8 years of experience in AI and software engineering, with a focus on production ML systems and developer tooling.',
  experience: 8,
  linkedIn: 'https://linkedin.com/in/chukwuemeka-eze',
  expertise: ['Machine Learning', 'Python', 'AI APIs', 'Software Architecture'],
  isVerified: true,
}

// ── Mock Cohorts ──────────────────────────────────────────────────────────────
export const MOCK_COHORTS: Cohort[] = [
  {
    id: 'cohort-se-1-2',
    name: 'AI in Software Engineering — Cohort 1.2',
    programId: 'prog-ai-software',
    program: MOCK_PROGRAMS[0],
    instructors: [MOCK_INSTRUCTOR],
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    admissionStart: '2026-01-15',
    admissionEnd: '2026-02-28',
    learningFormat: 'online-live',
    capacity: 100,
    enrolled: 47,
    status: 'active',
  },
  {
    id: 'cohort-cyber-1-1',
    name: 'AI in Cyber Security & Intelligence — Cohort 1.1',
    programId: 'prog-ai-cyber',
    program: MOCK_PROGRAMS[1],
    instructors: [MOCK_INSTRUCTOR],
    startDate: '2026-02-01',
    endDate: '2026-05-31',
    admissionStart: '2025-12-01',
    admissionEnd: '2026-01-31',
    learningFormat: 'online-live',
    capacity: 100,
    enrolled: 38,
    status: 'active',
  },
]

// ── Mock Enrollments ──────────────────────────────────────────────────────────
export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enroll-001',
    studentId: 'student-001',
    cohortId: 'cohort-se-1-2',
    cohort: MOCK_COHORTS[0],
    enrolledAt: '2026-03-01',
    paymentStatus: 'paid',
    enrollmentStatus: 'active',
    progress: 47,
  },
  {
    id: 'enroll-002',
    studentId: 'student-001',
    cohortId: 'cohort-cyber-1-1',
    cohort: MOCK_COHORTS[1],
    enrolledAt: '2026-02-01',
    paymentStatus: 'paid',
    enrollmentStatus: 'active',
    progress: 62,
  },
]

// ── Mock Sessions (AI in Software Engineering — Cohort 1.2) ──────────────────
export const MOCK_SESSIONS: Session[] = [
  {
    id: 'sess-001',
    cohortId: 'cohort-se-1-2',
    title: 'Introduction to AI Tools in Engineering',
    sessionNumber: 1,
    date: '2026-04-17',
    time: '7:00 PM WAT',
    duration: '2 hours',
    zoomLink: 'https://zoom.us/j/brixgate-se-01',
    status: 'upcoming',
  },
  {
    id: 'sess-002',
    cohortId: 'cohort-se-1-2',
    title: 'Prompt Engineering for Developers',
    sessionNumber: 2,
    date: '2026-04-10',
    time: '7:00 PM WAT',
    duration: '2 hours',
    zoomLink: 'https://zoom.us/j/brixgate-se-02',
    recordingLink: '#',
    status: 'completed',
  },
  {
    id: 'sess-003',
    cohortId: 'cohort-se-1-2',
    title: 'AI-Assisted Code Review',
    sessionNumber: 3,
    date: '2026-04-03',
    time: '7:00 PM WAT',
    duration: '2 hours',
    zoomLink: 'https://zoom.us/j/brixgate-se-03',
    recordingLink: '#',
    status: 'completed',
  },
  {
    id: 'sess-004',
    cohortId: 'cohort-se-1-2',
    title: 'Building AI-Powered APIs',
    sessionNumber: 4,
    date: '2026-04-24',
    time: '7:00 PM WAT',
    duration: '2 hours',
    zoomLink: 'https://zoom.us/j/brixgate-se-04',
    status: 'upcoming',
  },
  {
    id: 'sess-005',
    cohortId: 'cohort-se-1-2',
    title: 'Deploying AI Models to Production',
    sessionNumber: 5,
    date: '2026-05-01',
    time: '7:00 PM WAT',
    duration: '2 hours',
    zoomLink: 'https://zoom.us/j/brixgate-se-05',
    status: 'upcoming',
  },
]

// ── Mock Resources ────────────────────────────────────────────────────────────
export const MOCK_RESOURCES: Resource[] = [
  // Week 1
  {
    id: 'res-001',
    cohortId: 'cohort-se-1-2',
    title: 'Week 1 — Intro to AI Tools (PDF)',
    fileName: 'Week1_Intro_to_AI_Tools.pdf',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    weekNumber: 1,
    weekTitle: 'Introduction to AI Tools',
    uploadedAt: '2026-03-02',
    uploadedBy: 'Chukwuemeka Eze',
    downloadUrl: '#',
  },
  {
    id: 'res-002',
    cohortId: 'cohort-se-1-2',
    title: 'Session 1 Slides',
    fileName: 'Session1_Slides.pptx',
    fileType: 'pptx',
    fileSize: '8.1 MB',
    weekNumber: 1,
    weekTitle: 'Introduction to AI Tools',
    uploadedAt: '2026-03-02',
    uploadedBy: 'Chukwuemeka Eze',
    downloadUrl: '#',
  },
  // Week 2
  {
    id: 'res-003',
    cohortId: 'cohort-se-1-2',
    title: 'Prompt Engineering Guide',
    fileName: 'Week2_Prompt_Engineering_Guide.pdf',
    fileType: 'pdf',
    fileSize: '3.2 MB',
    weekNumber: 2,
    weekTitle: 'Prompt Engineering',
    uploadedAt: '2026-03-09',
    uploadedBy: 'Chukwuemeka Eze',
    downloadUrl: '#',
  },
  {
    id: 'res-004',
    cohortId: 'cohort-se-1-2',
    title: 'Session 2 Exercises',
    fileName: 'Session2_Exercises.zip',
    fileType: 'zip',
    fileSize: '14.6 MB',
    weekNumber: 2,
    weekTitle: 'Prompt Engineering',
    uploadedAt: '2026-03-09',
    uploadedBy: 'Chukwuemeka Eze',
    downloadUrl: '#',
  },
  // Week 3
  {
    id: 'res-005',
    cohortId: 'cohort-se-1-2',
    title: 'AI Code Review Notes',
    fileName: 'Week3_AI_Code_Review_Notes.pdf',
    fileType: 'pdf',
    fileSize: '1.8 MB',
    weekNumber: 3,
    weekTitle: 'AI-Assisted Code Review',
    uploadedAt: '2026-03-16',
    uploadedBy: 'Chukwuemeka Eze',
    downloadUrl: '#',
  },
  {
    id: 'res-006',
    cohortId: 'cohort-se-1-2',
    title: 'Session 3 Reference Material',
    fileName: 'Session3_Reference_Material.docx',
    fileType: 'docx',
    fileSize: '0.9 MB',
    weekNumber: 3,
    weekTitle: 'AI-Assisted Code Review',
    uploadedAt: '2026-03-16',
    uploadedBy: 'Chukwuemeka Eze',
    downloadUrl: '#',
  },
]

// ── Mock Notifications ────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    userId: 'student-001',
    title: 'New resource uploaded',
    body: 'Week 3 materials are now available — AI Code Review Notes and Reference Material.',
    type: 'resource',
    isRead: false,
    createdAt: '2026-04-13T10:30:00Z',
  },
  {
    id: 'notif-002',
    userId: 'student-001',
    title: 'Session reminder',
    body: 'Your next session is tomorrow at 7:00 PM WAT — "Introduction to AI Tools in Engineering".',
    type: 'session',
    isRead: false,
    createdAt: '2026-04-12T09:00:00Z',
  },
  {
    id: 'notif-003',
    userId: 'student-001',
    title: 'Welcome to Brixgate',
    body: 'Your enrollment in AI in Software Engineering — Cohort 1.2 is confirmed. Your first session starts March 1, 2026.',
    type: 'enrollment',
    isRead: true,
    createdAt: '2026-03-01T08:00:00Z',
  },
]

// ── Mock Dashboard Stats ──────────────────────────────────────────────────────
// ── Login Activity (days the student logged into the portal this week) ─────────
// Stored as ISO date strings "YYYY-MM-DD". In production this comes from the DB.
export const MOCK_LOGIN_DAYS: string[] = [
  '2026-04-07', // Tuesday last week
  '2026-04-08', // Wednesday
  '2026-04-10', // Friday
  '2026-04-13', // Monday this week (today)
]

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  programsEnrolled: 2,
  resourcesDownloaded: 8,
  certificatesEarned: 0,
}

// ── Mock Certificate (not yet issued) ─────────────────────────────────────────
// Certificate will be null until admin issues it
export const MOCK_CERTIFICATE: Certificate | null = null

// ── Mock Notification Preferences ─────────────────────────────────────────────
export const MOCK_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNewResource: true,
  emailSessionReminder: true,
  emailCertificate: true,
  emailAnnouncements: false,
  inAppAll: true,
  inAppSessionReminders: true,
}

// ── Helper: Get resources grouped by week ─────────────────────────────────────
export function getResourcesByWeek(
  resources: Resource[]
): Record<number, { title: string; items: Resource[] }> {
  return resources.reduce(
    (acc, resource) => {
      if (!acc[resource.weekNumber]) {
        acc[resource.weekNumber] = {
          title: resource.weekTitle,
          items: [],
        }
      }
      acc[resource.weekNumber].items.push(resource)
      return acc
    },
    {} as Record<number, { title: string; items: Resource[] }>
  )
}

// ── Helper: Get sessions split by status ──────────────────────────────────────
export function getSessionsByStatus(sessions: Session[]) {
  return {
    upcoming: sessions.filter((s) => s.status === 'upcoming' || s.status === 'live'),
    past: sessions.filter((s) => s.status === 'completed'),
  }
}

// ── Helper: Get unread notification count ─────────────────────────────────────
export function getUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.isRead).length
}

// ── Mock Course Syllabi ───────────────────────────────────────────────────────
export const MOCK_SYLLABI: CourseSyllabus[] = [
  {
    cohortId: 'cohort-se-1-2',
    rating: 4.8,
    reviewCount: 41,
    modules: [
      {
        id: 'mod-se-1',
        moduleNumber: 1,
        title: 'Introduction to AI in Engineering',
        topics: [
          {
            id: 'top-se-1-1',
            title: 'Introduction',
            type: 'Reading',
            status: 'completed',
            notes: `## Introduction to AI in Software Engineering\n\nArtificial Intelligence is no longer a future concept—it's already deeply embedded in modern engineering workflows. From auto-complete in IDEs to automated testing, AI tools are accelerating how developers write, review, and ship code.\n\n### Why This Matters\n\nEngineers who learn to collaborate with AI will ship faster, catch more bugs, and write cleaner code. This course teaches you to do exactly that—not by replacing your skills, but by amplifying them.\n\n### What You'll Learn\n\n- How to use AI-assisted tools effectively (GitHub Copilot, Claude, Cursor)\n- Prompt patterns that produce high-quality code\n- AI-assisted code review and refactoring\n- Building and deploying AI-powered APIs in production`,
            resources: [],
          },
          {
            id: 'top-se-1-2',
            title: 'Course Overview',
            type: 'Reading',
            status: 'completed',
            notes: `## Course Overview\n\nThis 12-week programme takes you from understanding AI fundamentals to deploying AI-powered applications in production.\n\n### Programme Structure\n\n**Weeks 1–3:** Foundations — AI tools, prompt engineering, IDE integration\n\n**Weeks 4–6:** Core Skills — Code review, testing, API design with AI\n\n**Weeks 7–9:** Advanced Topics — ML model integration, vector databases, RAG\n\n**Weeks 10–12:** Production — Deployment, monitoring, real-world projects\n\n### Assessment\n\nYou will be assessed through weekly assignments (40%), a mid-term project (20%), and a final capstone project (40%).`,
            resources: [
              {
                id: 'res-ov-1',
                cohortId: 'cohort-se-1-2',
                title: 'Course Outline PDF',
                fileName: 'SE_Course_Outline.pdf',
                fileType: 'pdf',
                fileSize: '1.2 MB',
                weekNumber: 1,
                weekTitle: 'Introduction',
                uploadedAt: '2026-03-01',
                uploadedBy: 'Chukwuemeka Eze',
                downloadUrl: '#',
              },
            ],
          },
          {
            id: 'top-se-1-3',
            title: 'AI Tools Landscape for Engineers',
            type: 'Reading',
            status: 'active',
            notes: `## AI Tools Landscape for Engineers\n\nThe AI tooling ecosystem is evolving rapidly. Here is a breakdown of the categories most relevant to software engineers in 2026.\n\n### Code Completion & Generation\n- **GitHub Copilot** — Deeply integrated into VS Code and JetBrains; best for inline suggestions\n- **Cursor** — AI-first editor built on VS Code with strong multi-file reasoning\n- **Claude (API)** — Best for complex reasoning tasks, refactoring large codebases\n\n### Code Review & Analysis\n- **CodeRabbit** — AI PR reviewer that gives contextual feedback on diffs\n- **Snyk** — Security-focused AI that scans for vulnerabilities\n\n### Testing\n- **Codium AI** — Generates unit tests from function signatures\n- **Testim** — AI-driven end-to-end testing that adapts to UI changes\n\n### Key Insight\n\nNo single tool does everything. A high-performing engineer in 2026 uses a **tool stack**, not a single AI assistant. We'll cover how to compose these tools effectively throughout the course.`,
            resources: [],
          },
          {
            id: 'top-se-1-4',
            title: 'Setting Up Your AI-Powered Dev Environment',
            type: 'Video & Resource',
            status: 'locked',
            notes: `## Setting Up Your AI-Powered Dev Environment\n\nIn this session we walk through setting up a complete AI-augmented development environment step by step.\n\n### Prerequisites\n- VS Code or Cursor installed\n- Node.js 20+ installed\n- GitHub account with Copilot access`,
            resources: [],
          },
        ],
      },
      {
        id: 'mod-se-2',
        moduleNumber: 2,
        title: 'Prompt Engineering for Developers',
        topics: [
          {
            id: 'top-se-2-1',
            title: 'Introduction to Prompt Engineering',
            type: 'Reading',
            status: 'locked',
            notes: `## Introduction to Prompt Engineering\n\nPrompt engineering is the practice of crafting inputs to AI models to reliably produce useful outputs. For software engineers, this skill is as important as knowing your data structures.`,
            resources: [],
          },
          {
            id: 'top-se-2-2',
            title: 'Prompt Patterns for Code',
            type: 'Reading',
            status: 'locked',
            notes: `## Prompt Patterns for Code\n\nLearn the most effective prompt patterns for software engineering tasks.`,
            resources: [],
          },
          {
            id: 'top-se-2-3',
            title: 'AI-Assisted Code Review',
            type: 'Video & Resource',
            status: 'locked',
            notes: '',
            resources: [],
          },
        ],
      },
      {
        id: 'mod-se-3',
        moduleNumber: 3,
        title: 'Building AI-Powered APIs',
        topics: [
          {
            id: 'top-se-3-1',
            title: 'API Design with AI',
            type: 'Reading',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-se-3-2',
            title: 'Integrating Claude API',
            type: 'Video & Resource',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-se-3-3',
            title: 'Assignment: Build a RAG API',
            type: 'Assignment',
            status: 'locked',
            notes: '',
            resources: [],
          },
        ],
      },
    ],
  },
  {
    cohortId: 'cohort-cyber-1-1',
    rating: 4.9,
    reviewCount: 35,
    modules: [
      {
        id: 'mod-cyber-1',
        moduleNumber: 1,
        title: 'Introduction to Cybersecurity',
        topics: [
          {
            id: 'top-cyber-1-1',
            title: 'Introduction',
            type: 'Reading',
            status: 'completed',
            notes: `## Introduction to AI in Cyber Security\n\nCybersecurity has entered a new era. The tools, tactics, and scale of attacks have changed fundamentally — and AI is at the centre of both the threat and the defence.\n\n### The New Threat Landscape\n\nModern attacks are faster, more targeted, and increasingly automated. State actors and cybercriminal organisations are already deploying AI to:\n- Generate convincing phishing emails at scale\n- Discover zero-day vulnerabilities automatically\n- Evade traditional signature-based detection\n\n### AI as a Defensive Tool\n\nThe same capabilities that power attacks also power the best defences. This course equips you to wield AI on the right side of this equation.`,
            resources: [],
          },
          {
            id: 'top-cyber-1-2',
            title: 'Course Overview',
            type: 'Reading',
            status: 'completed',
            notes: `## Course Overview\n\nA 12-week deep dive into AI-powered cybersecurity — from threat intelligence to automated incident response.\n\n### What You'll Build\n\nBy the end of this course, you will have built a real-time threat detection dashboard powered by machine learning, and an automated incident response playbook.`,
            resources: [
              {
                id: 'res-cyber-ov-1',
                cohortId: 'cohort-cyber-1-1',
                title: 'Course Outline — AI in Cyber Security',
                fileName: 'Cyber_Course_Outline.pdf',
                fileType: 'pdf',
                fileSize: '1.4 MB',
                weekNumber: 1,
                weekTitle: 'Introduction',
                uploadedAt: '2026-02-01',
                uploadedBy: 'Chukwuemeka Eze',
                downloadUrl: '#',
              },
            ],
          },
          {
            id: 'top-cyber-1-3',
            title: 'Growing Importance of AI in Cybersecurity',
            type: 'Reading',
            status: 'active',
            notes: `## Growing Importance of AI in Cybersecurity\n\nThe cybersecurity landscape has fundamentally shifted. We are no longer in an era where static firewalls and signature-based antivirus software are enough to protect digital infrastructure. As digital footprints expand and attack vectors become more sophisticated, the volume of security alerts has surpassed human capacity.\n\nArtificial Intelligence is transitioning from a cutting-edge advantage to a foundational necessity in security architectures. Here is a breakdown of why AI is becoming the core engine of modern cybersecurity.\n\n### 1. Machine-Speed Threat Detection\n\nTraditional cybersecurity relies on known threat databases (signatures). If a malware strain is new (a "zero-day exploit"), traditional systems often miss it. AI, specifically machine learning, processes millions of data points across networks in real-time, identifying malicious patterns and blocking threats in milliseconds — long before a human analyst could even open the alert.\n\n### 2. Shifting from Reactive to Predictive (Anomaly Detection)\n\nInstead of just looking for known bad files, AI establishes a baseline of "normal" behaviour for users, devices, and network traffic.\n\n- If a user suddenly downloads 50GB of data at 3:00 AM from a new location, the AI flags this behavioural anomaly.\n- This predictive capability is critical for catching insider threats and compromised credentials that bypass perimeter defences.\n\n### 3. Automated Incident Response\n\nWhen a threat is detected, every second counts. AI-powered SOAR (Security Orchestration, Automation and Response) platforms can:\n- Automatically isolate infected endpoints\n- Block suspicious IP addresses in real-time\n- Generate incident reports for compliance teams`,
            resources: [
              {
                id: 'res-cyber-1-3',
                cohortId: 'cohort-cyber-1-1',
                title: 'Growing Importance of AI in Cybersecurity',
                fileName: 'AI_Cybersecurity_Importance.pdf',
                fileType: 'pdf',
                fileSize: '2.1 MB',
                weekNumber: 1,
                weekTitle: 'Introduction to Cybersecurity',
                uploadedAt: '2026-02-08',
                uploadedBy: 'Chukwuemeka Eze',
                downloadUrl: '#',
              },
            ],
          },
          {
            id: 'top-cyber-1-4',
            title: 'The Role of an AI Cybersecurity Engineer',
            type: 'Reading',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-cyber-1-5',
            title: 'Cyber Security & Intelligence',
            type: 'Video & Resource',
            status: 'locked',
            notes: '',
            resources: [],
          },
        ],
      },
      {
        id: 'mod-cyber-2',
        moduleNumber: 2,
        title: 'Threat Intelligence & AI',
        topics: [
          {
            id: 'top-cyber-2-1',
            title: 'Introduction',
            type: 'Reading',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-cyber-2-2',
            title: 'Course Overview',
            type: 'Reading',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-cyber-2-3',
            title: 'AI-Powered Threat Hunting',
            type: 'Reading',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-cyber-2-4',
            title: 'The Role of an AI Cybersecurity Engineer',
            type: 'Reading',
            status: 'locked',
            notes: '',
            resources: [],
          },
          {
            id: 'top-cyber-2-5',
            title: 'Cyber Security & Intelligence',
            type: 'Video & Resource',
            status: 'locked',
            notes: '',
            resources: [],
          },
        ],
      },
    ],
  },
]

export function getSyllabus(cohortId: string): CourseSyllabus | undefined {
  return MOCK_SYLLABI.find((s) => s.cohortId === cohortId)
}
