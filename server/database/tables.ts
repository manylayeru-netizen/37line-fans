import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
  json,
  customType,
} from 'drizzle-orm/mysql-core';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const uuid = customType<{ data: string; driverData: string; config: { length?: number } }>({
  dataType(config) {
    return `varchar(${config?.length ?? 36})`;
  },
  toDriver(value: string) {
    return value;
  },
  fromDriver(value: string) {
    return value;
  },
});

export const customTimestamp = customType<{
  data: Date;
  driverData: Date | string | null;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `datetime${precision}`;
  },
  toDriver(value: Date | string | number | null | undefined) {
    if (value == null) return value as any;
    if (value instanceof Date) return value;
    return new Date(value);
  },
  fromDriver(value: Date | string | null): Date | null {
    if (value == null) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const textArray = customType<{ data: string[]; driverData: string }>({
  dataType() {
    return 'json';
  },
  toDriver(value: string[]) {
    return JSON.stringify(value ?? []);
  },
  fromDriver(value: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  },
});

// === 文学鉴赏 ===

export const literatureTags = mysqlTable('literature_tags', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull(),
  color: varchar('color', { length: 20 }).default('#F4A261'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex('lt_name_unique').on(table.name),
  uniqueIndex('lt_slug_unique').on(table.slug),
]);

export const literaturePosts = mysqlTable('literature_posts', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  title: varchar('title', { length: 255 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  sourcePlatform: varchar('source_platform', { length: 100 }),
  content: text('content').notNull(),
  recommendationReason: text('recommendation_reason'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  rejectReason: text('reject_reason'),
  authorUserId: uuid('author_user_id'),
  reviewedAt: customTimestamp('reviewed_at', { precision: 3 }),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('lp_status_idx').on(table.status),
  index('lp_created_idx').on(table.createdAt),
  index('lp_author_idx').on(table.authorUserId),
  foreignKey({
    columns: [table.authorUserId as AnyMySqlColumn],
    foreignColumns: [siteUsers.id as AnyMySqlColumn],
    name: 'lp_author_fk',
  }),
]);

export const literaturePostTags = mysqlTable('literature_post_tags', {
  postId: uuid('post_id').notNull(),
  tagId: uuid('tag_id').notNull(),
}, (table) => [
  primaryKey({ columns: [table.postId, table.tagId], name: 'lpt_pk' }),
  foreignKey({
    columns: [table.postId as AnyMySqlColumn],
    foreignColumns: [literaturePosts.id as AnyMySqlColumn],
    name: 'lpt_post_fk',
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.tagId as AnyMySqlColumn],
    foreignColumns: [literatureTags.id as AnyMySqlColumn],
    name: 'lpt_tag_fk',
  }).onDelete('cascade'),
]);

export const literatureComments = mysqlTable('literature_comments', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  postId: uuid('post_id').notNull(),
  content: text('content').notNull(),
  userId: uuid('user_id'),
  guestName: varchar('guest_name', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('approved'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('lc_post_idx').on(table.postId),
  index('lc_created_idx').on(table.createdAt),
  foreignKey({
    columns: [table.postId as AnyMySqlColumn],
    foreignColumns: [literaturePosts.id as AnyMySqlColumn],
    name: 'lc_post_fk',
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.userId as AnyMySqlColumn],
    foreignColumns: [siteUsers.id as AnyMySqlColumn],
    name: 'lc_user_fk',
  }),
]);

// === 用户与注册申请 ===

export const siteUsers = mysqlTable('site_users', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  username: varchar('username', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  displayName: varchar('display_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex('su_username_unique').on(table.username),
  uniqueIndex('su_username_idx').on(table.username),
]);

export const registerApplications = mysqlTable('register_applications', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  username: varchar('username', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  applicationReason: text('application_reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  rejectReason: text('reject_reason'),
  reviewedAt: customTimestamp('reviewed_at', { precision: 3 }),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('ra_status_idx').on(table.status),
  index('ra_created_idx').on(table.createdAt),
]);

// === 留言板 ===

export const guestbookNotes = mysqlTable('guestbook_notes', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  authorName: varchar('author_name', { length: 100 }).notNull().default('匿名访客'),
  content: text('content').notNull(),
  noteShape: varchar('note_shape', { length: 20 }).notNull().default('shiba'),
  noteColor: varchar('note_color', { length: 50 }).default('#FFE4B5'),
  positionX: int('position_x').default(0),
  positionY: int('position_y').default(0),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('gn_status_idx').on(table.status),
  index('gn_created_idx').on(table.createdAt),
]);

// === 收集册 ===

export const collectionCards = mysqlTable('collection_cards', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  category: varchar('category', { length: 100 }).default('photocard'),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  sortOrder: int('sort_order').default(0),
  rotationDegree: int('rotation_degree').default(0),
  thumbX: int('thumb_x'),
  thumbY: int('thumb_y'),
  thumbW: int('thumb_w'),
  thumbH: int('thumb_h'),
  uploaderId: uuid('uploader_id'),
  uploaderName: varchar('uploader_name', { length: 100 }),
  uploaderAvatarUrl: text('uploader_avatar_url'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('cc_category_idx').on(table.category),
  index('cc_status_idx').on(table.status),
  index('cc_sort_idx').on(table.sortOrder),
  index('cc_uploader_idx').on(table.uploaderId),
]);

// === 双人日历 ===

export const calendarEvents = mysqlTable('calendar_events', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  title: varchar('title', { length: 255 }).notNull(),
  eventDate: date('event_date').notNull(),
  description: text('description'),
  hasCrown: boolean('has_crown').default(false),
  eventType: varchar('event_type', { length: 50 }).default('anniversary'),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  uploaderId: uuid('uploader_id'),
  uploaderName: varchar('uploader_name', { length: 100 }),
  uploaderAvatarUrl: text('uploader_avatar_url'),
  sourceUrl: text('source_url'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('ce_date_idx').on(table.eventDate),
  index('ce_status_idx').on(table.status),
  index('ce_uploader_idx').on(table.uploaderId),
]);

// === 日记 / 今日记录 ===

export const diaryEntries = mysqlTable('diary_entries', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  weather: varchar('weather', { length: 50 }).default('sunny'),
  entryDate: date('entry_date').notNull(),
  illustrationUrl: text('illustration_url'),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  sortOrder: int('sort_order').default(0),
  author: varchar('author', { length: 255 }).default(''),
  sourcePlatform: varchar('source_platform', { length: 100 }),
  completionStatus: varchar('completion_status', { length: 20 }).default('completed'),
  contentWarnings: textArray('content_warnings'),
  characterBackground: text('character_background'),
  recommendationReason: text('recommendation_reason'),
  rejectReason: text('reject_reason'),
  reviewedAt: customTimestamp('reviewed_at', { precision: 3 }),
  submitterId: uuid('submitter_id'),
  submitterName: varchar('submitter_name', { length: 100 }),
  sourceUrl: text('source_url'),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('de_date_idx').on(table.entryDate),
  index('de_status_idx').on(table.status),
  index('de_completion_idx').on(table.completionStatus),
  index('de_submitter_idx').on(table.submitterId),
]);

// === 邮箱验证码 ===

export const emailVerificationCodes = mysqlTable('email_verification_codes', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).notNull().default('register'),
  expiresAt: customTimestamp('expires_at', { precision: 3 }).notNull(),
  attemptCount: int('attempt_count').notNull().default(0),
  maxAttempts: int('max_attempts').notNull().default(5),
  used: boolean('used').notNull().default(false),
  createdAt: customTimestamp('_created_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('evc_email_idx').on(table.email),
  index('evc_email_purpose_idx').on(table.email, table.purpose),
]);

// === 审核设置 ===

export const reviewSettings = mysqlTable('review_settings', {
  id: int('id').primaryKey().default(1),
  diaryEnabled: boolean('diary_enabled').notNull().default(true),
  literatureEnabled: boolean('literature_enabled').notNull().default(true),
  collectionEnabled: boolean('collection_enabled').notNull().default(true),
  calendarEnabled: boolean('calendar_enabled').notNull().default(true),
  guestbookEnabled: boolean('guestbook_enabled').notNull().default(true),
  updatedAt: customTimestamp('_updated_at', { precision: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});

// table aliases
export const calendarEventsTable = calendarEvents;
export const collectionCardsTable = collectionCards;
export const diaryEntriesTable = diaryEntries;
export const guestbookNotesTable = guestbookNotes;
export const literatureCommentsTable = literatureComments;
export const literaturePostTagsTable = literaturePostTags;
export const literaturePostsTable = literaturePosts;
export const literatureTagsTable = literatureTags;
export const registerApplicationsTable = registerApplications;
export const siteUsersTable = siteUsers;
