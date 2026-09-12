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
  email?: string;
  applicationReason: string;
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

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateAvatarRequest {
  avatarUrl: string;
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
  status: 'published' | 'draft' | 'offline' | 'pending';
  sortOrder: number;
  author: string;
  sourcePlatform?: string;
  completionStatus: 'completed' | 'ongoing';
  contentWarnings: string[];
  characterBackground?: string;
  recommendationReason?: string;
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
  uploaderId?: string;
  uploaderName?: string;
  uploaderAvatarUrl?: string;
}

// === 收集册 ===
export interface CollectionCard {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  sortOrder: number;
  rotationDegree: number;
  uploaderId?: string;
  uploaderName?: string;
  uploaderAvatarUrl?: string;
}

export interface CollectionListQuery {
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCollectionCardRequest {
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
}

// === 留言板 ===
export interface GuestbookNote {
  id: string;
  authorName: string;
  content: string;
  noteShape: 'shiba' | 'penguin' | 'heart' | 'star';
  noteColor: string;
  positionX: number;
  positionY: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CreateGuestbookNoteRequest {
  authorName?: string;
  content: string;
  noteShape: 'shiba' | 'penguin' | 'heart' | 'star';
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
  tags: LiteratureTag[];
  reviewAt?: string;
  createdAt: string;
  updatedAt: string;
  authorDisplayName?: string;
}

export interface LiteratureComment {
  id: string;
  postId: string;
  content: string;
  userId?: string;
  guestName?: string;
  status: string;
  createdAt: string;
  displayName?: string;
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
}
