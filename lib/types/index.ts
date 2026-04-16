// ─────────────────────────────────────────────────────────────────────────────
// Brixgate Portal — TypeScript Interfaces
// Single source of truth for all data shapes used across the portal
// ─────────────────────────────────────────────────────────────────────────────

// ── Core User ────────────────────────────────────────────────────────────────
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar?: string
  role: 'student' | 'instructor' | 'admin'
  createdAt: string
  lastActive: string
}

// ── Program ──────────────────────────────────────────────────────────────────
export type ProgramCategory = 'beginner' | 'professional'
export type ProgramStatus   = 'published' | 'draft'

export interface Program {
  id: string
  title: string
  subtitle: string
  category: ProgramCategory
  description: string
  duration: string          // e.g. "12 weeks"
  thumbnail: string         // URL or gradient placeholder key
  price: number             // in Naira (₦)
  discountedPrice?: number
  status: ProgramStatus
  thumbnailColor?: string   // gradient/colour for placeholder card
}

// ── Instructor ───────────────────────────────────────────────────────────────
export interface Instructor {
  id: string
  userId: string
  user: User
  jobTitle: string
  bio: string
  experience: number        // years
  linkedIn: string
  expertise: string[]
  isVerified: boolean
}

// ── Cohort ───────────────────────────────────────────────────────────────────
export type CohortStatus        = 'upcoming' | 'active' | 'completed'
export type CohortLearningFormat = 'online-live' | 'self-paced' | 'hybrid'

export interface Cohort {
  id: string
  name: string              // e.g. "AI in Software Engineering — Cohort 1.2"
  programId: string
  program: Program
  instructors: Instructor[]
  startDate: string         // ISO date string
  endDate: string
  admissionStart: string
  admissionEnd: string
  learningFormat: CohortLearningFormat
  capacity: number
  enrolled: number
  status: CohortStatus
}

// ── Enrollment ───────────────────────────────────────────────────────────────
export type PaymentStatus    = 'paid' | 'pending' | 'failed'
export type EnrollmentStatus = 'active' | 'completed' | 'suspended'

export interface Enrollment {
  id: string
  studentId: string
  cohortId: string
  cohort: Cohort
  enrolledAt: string
  paymentStatus: PaymentStatus
  enrollmentStatus: EnrollmentStatus
  progress: number          // 0–100 (percentage)
}

// ── Session ──────────────────────────────────────────────────────────────────
export type SessionStatus = 'upcoming' | 'live' | 'completed'

export interface Session {
  id: string
  cohortId: string
  title: string
  sessionNumber: number
  date: string              // ISO date string — "2026-04-17"
  time: string              // "7:00 PM WAT"
  duration: string          // "2 hours"
  zoomLink: string
  recordingLink?: string
  status: SessionStatus
}

// ── Resource ─────────────────────────────────────────────────────────────────
export type ResourceFileType = 'pdf' | 'pptx' | 'docx' | 'zip' | 'mp4'

export interface Resource {
  id: string
  cohortId: string
  title: string
  fileName: string
  fileType: ResourceFileType
  fileSize: string          // human-readable: "2.4 MB"
  weekNumber: number
  weekTitle: string         // "Introduction to AI Tools"
  uploadedAt: string        // ISO date string
  uploadedBy: string        // Instructor name
  downloadUrl: string
}

// ── Certificate ──────────────────────────────────────────────────────────────
export interface Certificate {
  id: string
  studentId: string
  student: User
  programId: string
  program: Program
  cohortId: string
  cohort: Cohort
  issuedAt: string
  verificationId: string    // e.g. "BXG-2026-SE-0047"
  downloadUrl: string
}

// ── Notification ─────────────────────────────────────────────────────────────
export type NotificationType =
  | 'resource'
  | 'session'
  | 'certificate'
  | 'announcement'
  | 'enrollment'

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: NotificationType
  isRead: boolean
  createdAt: string         // ISO datetime string
}

// ── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  programsEnrolled: number
  resourcesDownloaded: number
  certificatesEarned: number
}

// ── Profile Settings ─────────────────────────────────────────────────────────
export interface NotificationPreferences {
  emailNewResource: boolean
  emailSessionReminder: boolean
  emailCertificate: boolean
  emailAnnouncements: boolean
  inAppAll: boolean
  inAppSessionReminders: boolean
}

export interface ProfileSettingsForm {
  firstName: string
  lastName: string
  phone: string
}

export interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ── Course Syllabus Types ─────────────────────────────────────────────────────
export type TopicStatus = 'completed' | 'active' | 'locked'
export type TopicType   = 'Reading' | 'Video & Resource' | 'Assignment' | 'Quiz'

export interface SyllabusTopic {
  id: string
  title: string
  type: TopicType
  status: TopicStatus
  notes?: string
  resources?: Resource[]
}

export interface SyllabusModule {
  id: string
  title: string
  moduleNumber: number
  topics: SyllabusTopic[]
}

export interface CourseSyllabus {
  cohortId: string
  modules: SyllabusModule[]
  rating: number
  reviewCount: number
}

// ── UI Utility Types ─────────────────────────────────────────────────────────
export type TabValue = string

export interface SelectOption {
  label: string
  value: string
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

// ── API Response Wrappers ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
