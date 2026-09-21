export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// === 用户与认证 ===
export interface SiteUser {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: SiteUser;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
  email: string;
  verifyCode: string;
}

export interface RegisterApplication {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  applicationReason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface SendVerifyCodeRequest {
  email: string;
  purpose?: 'register' | 'reset-password';
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateAvatarRequest {
  avatarUrl: string;
}

export interface UpdateDisplayNameRequest {
  displayName: string;
}

export interface AdminResetPasswordRequest {
  newPassword: string;
}

// === 日记/今日记录 ===
export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  weather: string;
  entryDate: string;
  illustrationUrl?: string;
  status: 'published' | 'draft' | 'offline' | 'pending' | 'rejected';
  sortOrder: number;
  author: string;
  sourcePlatform?: string;
  completionStatus: 'completed' | 'ongoing';
  contentWarnings: string[];
  characterBackground?: string;
  recommendationReason?: string;
  rejectReason?: string;
  submitterId?: string;
  submitterName?: string;
  submitterAvatarUrl?: string;
  sourceUrl?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

// === 日历 ===
export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  description?: string;
  hasCrown: boolean;
  eventType: string;
  status: 'published' | 'pending' | 'rejected';
  uploaderId?: string;
  uploaderName?: string;
  uploaderAvatarUrl?: string;
  sourceUrl?: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  eventDate: string;
  description?: string;
  hasCrown?: boolean;
  eventType?: string;
  sourceUrl?: string;
}

export interface BatchCreateCalendarEventsRequest {
  items: CreateCalendarEventRequest[];
}

export interface BatchCreateCalendarEventsResponse {
  items: CalendarEvent[];
  createdCount: number;
}

export interface CalendarListQuery {
  year?: number;
  page?: number;
  pageSize?: number;
}

// === 收集册 ===
export interface CollectionCard {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  status: 'published' | 'pending' | 'rejected';
  sortOrder: number;
  rotationDegree: number;
  thumbX?: number;
  thumbY?: number;
  thumbW?: number;
  thumbH?: number;
  uploaderId?: string;
  uploaderName?: string;
  uploaderAvatarUrl?: string;
}

export interface CollectionListQuery {
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCollectionCardRequest {
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  thumbX?: number;
  thumbY?: number;
  thumbW?: number;
  thumbH?: number;
}

// === 留言板 ===
export interface GuestbookNote {
  id: string;
  authorName: string;
  content: string;
  noteShape: string;
  noteColor: string;
  positionX: number;
  positionY: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CreateGuestbookNoteRequest {
  authorName?: string;
  content: string;
  noteShape: string;
  noteColor?: string;
}

// === 文学鉴赏 ===
export interface LiteratureTag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface LiteraturePost {
  id: string;
  title: string;
  author: string;
  sourcePlatform?: string;
  content: string;
  recommendationReason?: string;
  status: 'pending' | 'published' | 'rejected';
  rejectReason?: string;
  authorUserId?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  tags: LiteratureTag[];
  reviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiteratureComment {
  id: string;
  postId: string;
  content: string;
  userId?: string;
  guestName?: string;
  displayName?: string;
  avatarUrl?: string;
  status: string;
  createdAt: string;
}

export interface LiteraturePostQuery {
  page?: number;
  pageSize?: number;
  tagId?: string;
  status?: string;
  keyword?: string;
}

export interface CreateLiteraturePostRequest {
  title: string;
  author: string;
  sourcePlatform?: string;
  content: string;
  recommendationReason?: string;
  tagIds: string[];
}

export interface CreateLiteratureCommentRequest {
  content: string;
  guestName?: string;
}

export interface ReviewPostRequest {
  status: 'published' | 'rejected';
  rejectReason?: string;
}

export interface ReviewApplicationRequest {
  status: 'approved' | 'rejected';
  rejectReason?: string;
}

export interface ReviewSettings {
  diaryEnabled: boolean;
  literatureEnabled: boolean;
  collectionEnabled: boolean;
  calendarEnabled: boolean;
  guestbookEnabled: boolean;
}

export interface UpdateReviewSettingsRequest {
  diaryEnabled?: boolean;
  literatureEnabled?: boolean;
  collectionEnabled?: boolean;
  calendarEnabled?: boolean;
  guestbookEnabled?: boolean;
}

// === 那年今日 (首页聚合) ===
export interface OnThisDayCalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  description?: string;
  sourceUrl?: string;
  type: 'calendar';
}

export interface OnThisDayPhoto {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  type: 'photo';
}

export interface OnThisDayDiaryEntry {
  id: string;
  title: string;
  entryDate: string;
  weather: string;
  type: 'diary';
}

export interface OnThisDayResponse {
  hasContent: boolean;
  month: number;
  day: number;
  events: OnThisDayCalendarEvent[];
  photos: OnThisDayPhoto[];
  diaryEntries: OnThisDayDiaryEntry[];
}

// === 管理后台统计 ===
export interface AdminStats {
  totalUsers: number;
  todayNewUsers: number;
  pendingApplications: number;
  totalApplications: number;
  activeUsers: number;
  disabledUsers: number;
  pendingGuestbookCount: number;
  publishedLiteratureCount: number;
  pendingLiteratureCount: number;
  pendingDiaryCount: number;
  pendingCollectionCount: number;
  pendingCalendarCount: number;
  reviewSettings: ReviewSettings;
}
