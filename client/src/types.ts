export type Language = 'kn' | 'en' | 'hi';
export type Role = 'CITIZEN' | 'VILLAGE_FACILITATOR' | 'SCHEME_VERIFIER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  fullName: string;
  role: Role;
  preferredLanguage: Language;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Profile {
  id?: string;
  userId?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  state?: string | null;
  district?: string | null;
  taluk?: string | null;
  village?: string | null;
  gramPanchayat?: string | null;
  occupation?: string | null;
  annualIncome?: number | null;
  education?: string | null;
  landHoldingAcres?: number | null;
  familySize?: number | null;
  disabilityStatus?: boolean | null;
  socialCategory?: string | null;
  aadhaarLast4?: string | null;
  profileJson?: Record<string, unknown> | null;
  onboardingCompleted?: boolean;
}

export interface Preferences {
  inApp: boolean;
  webPush: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  categories: string[];
  districts: string[];
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

export interface Consent {
  id: string;
  consentType: string;
  granted: boolean;
  version: string;
  grantedAt: string | null;
  revokedAt: string | null;
}

export interface Category {
  slug: string;
  name: string;
  nameEn: string;
  nameKn: string;
  nameHi: string;
  description: string | null;
  icon: string | null;
  schemeCount: number;
}

export interface SchemeSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  benefits: string | null;
  eligibility: string | null;
  department: string;
  level: 'CENTRAL' | 'STATE';
  state: string | null;
  status: string;
  isDemoData: boolean;
  applicationDeadline: string | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  lastVerifiedAt: string | null;
  publishedAt: string | null;
  views: number;
  version: number;
  category: { slug: string; name: string; icon: string | null };
  language: Language;
  availableLanguages: Language[];
  fallbacks: string[];
}

export interface EligibilityRule {
  field: string;
  operator: string;
  value: unknown;
  description: string | null;
}

export interface SchemeDetail extends SchemeSummary {
  description: string | null;
  applicationProcess: string | null;
  requiredDocuments: string[];
  notificationNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  source: { name: string; baseUrl: string; sourceType: string; lastCheckedAt: string | null } | null;
  eligibilityRules: EligibilityRule[];
  documents: Array<{ id: string; title: string; fileType: string; fileUrl: string; sourceUrl: string | null; ocrStatus: string }>;
  translations: Array<{ language: Language; quality: string }>;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SchemeListResponse {
  schemes: SchemeSummary[];
  pagination: Pagination;
  filters: Record<string, unknown>;
}

export type Assessment = 'LIKELY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_INFORMATION' | 'NOT_ASSESSABLE';

export interface EligibilityResult {
  assessment: Assessment;
  label: string;
  likelyEligible: boolean;
  counts: {
    total: number;
    required: number;
    optional: number;
    met: number;
    notMet: number;
    unknown: number;
  };
  missingProfileFields: string[];
  disclaimer: string;
  language: Language;
  rules: Array<{
    field: string;
    operator: string;
    required: boolean;
    status: 'MET' | 'NOT_MET' | 'UNKNOWN';
    reason: string;
    expected: unknown;
    actual: unknown;
    description: string | null;
    sortOrder: number;
  }>;
}

export interface MatchesResponse {
  language: Language;
  filter: string;
  profile: { hasProfile: boolean; onboardingCompleted: boolean; missingFields: string[] };
  summary: { totalPublished: number; countsByAssessment: Record<Assessment, number> };
  schemes: Array<SchemeSummary & { eligibility: Pick<EligibilityResult, 'assessment' | 'label' | 'likelyEligible' | 'counts' | 'missingProfileFields'> }>;
  pagination: Pagination;
  disclaimer: string;
}

export interface SavedEntry {
  savedAt: string;
  isPublished: boolean;
  scheme: SchemeSummary;
}

export type ApplicationStatus = 'DRAFT' | 'ASSISTED' | 'SUBMITTED_OFFLINE' | 'TRACKING' | 'COMPLETED' | 'REJECTED';

export interface ApplicationRecord {
  id: string;
  status: ApplicationStatus;
  referenceNumber: string | null;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scheme: SchemeSummary;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  language: Language;
  type: string;
  channel: string;
  status: string;
  read: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
  scheme: { slug: string; titleEn: string; titleKn: string | null; isDemoData: boolean } | null;
  metadata: Record<string, unknown>;
}

export interface AssistanceCentre {
  id: string;
  name: string;
  type: string;
  address: string;
  district: string;
  taluk: string | null;
  village: string | null;
  phone: string | null;
  email: string | null;
  longitude: number | null;
  latitude: number | null;
  openingHours: string | null;
  verifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssistanceRequest {
  id: string;
  subject: string;
  description: string;
  status: string;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  centre: { id: string; name: string; phone?: string | null; district: string; address?: string } | null;
  user?: { id: string; fullName: string; email: string; phone?: string | null; preferredLanguage?: Language };
  assignedTo: { id: string; fullName: string; role: Role } | null;
}

export interface Feedback {
  id: string;
  rating: number | null;
  message: string;
  status: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
  scheme?: { id: string; slug: string; titleEn: string; titleKn: string | null } | null;
}

export interface AdminSchemeDetail extends SchemeDetail {
  admin: {
    createdBy: { id: string; fullName: string; email: string } | null;
    counts: { savedBy: number; applications: number; notifications: number };
    versions: Array<{ id: string; version: number; changeSummary: string; createdAt: string; createdBy: { fullName: string } | null }>;
    verifications: Array<{
      id: string;
      action: string;
      notes: string | null;
      sourceEvidenceUrl: string | null;
      createdAt: string;
      verifier: { fullName: string; role: Role } | null;
    }>;
    translationReviews: Array<{ language: string; quality: string; provider: string; reviewedAt: string | null }>;
  };
}

export interface AdminSchemeListResponse {
  schemes: SchemeSummary[];
  pagination: Pagination;
  countsByStatus: Record<string, number>;
}

export interface MonitoringSource {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  sourceType: string;
  isActive: boolean;
  monitoringIntervalMinutes: number;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  reliabilityScore: number | null;
  monitoring: { canRun: boolean; adapter: string | null; reason: string | null };
}

export interface MonitoringJob {
  id: string;
  status: string;
  attempt: number;
  itemsFound: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  source?: { id: string; slug: string; name: string; sourceType: string };
  counts?: { extractions: number };
}

export interface Extraction {
  id: string;
  schemeId: string | null;
  sourceUrl: string;
  rawDocumentId: string;
  confidence: number | null;
  model: string | null;
  needsReview: boolean;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: string; fullName: string; role: Role } | null;
  createdAt: string;
  fields: Record<string, unknown>;
  provenance: Record<string, unknown>;
  source: { id: string; name: string; sourceType: string } | null;
  scheme: { id: string; slug: string; titleEn: string; status: string; isDemoData: boolean } | null;
}

export interface Analytics {
  totals: {
    users: number;
    publishedSchemes: number;
    totalViews: number;
    unreadNotifications: number;
    pendingExtractions: number;
    monitoredSources: number;
  };
  usersByRole: Record<string, number>;
  schemesByStatus: Record<string, number>;
  publishedSchemesByCategory: Array<{ category: { slug: string; nameEn: string; nameKn: string }; count: number }>;
  applicationsByStatus: Record<string, number>;
  assistanceRequestsByStatus: Record<string, number>;
  feedbackByStatus: Record<string, number>;
  lastSevenDays: { newUsers: number; newApplications: number };
  generatedAt: string;
}

export interface AdminStats {
  totals: { users: number; schemes: number; notifications: number; savedSchemes: number; auditToday: number };
  usersByRole: Record<string, number>;
  schemesByStatus: Record<string, number>;
}
