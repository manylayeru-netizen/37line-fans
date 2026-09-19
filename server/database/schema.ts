/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const literaturePostTags = pgTable("literature_post_tags", {
  postId: uuid("post_id").primaryKey(),
  tagId: uuid("tag_id").primaryKey(),
}, (table) => [
  foreignKey({
    columns: [table.postId],
    foreignColumns: [literaturePosts.id],
    name: "literature_post_tags_post_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.tagId],
    foreignColumns: [literatureTags.id],
    name: "literature_post_tags_tag_id_fkey",
  }).onDelete("cascade"),
]);

export const literatureTags = pgTable("literature_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 20 }).default('#F4A261'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("literature_tags_name_key").on(table.name),
  uniqueIndex("literature_tags_slug_key").on(table.slug),
]);

export const literatureComments = pgTable("literature_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  content: text("content").notNull(),
  userId: uuid("user_id"),
  guestName: varchar("guest_name", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default('approved'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_lit_comments_post").on(table.postId),
  index("idx_lit_comments_created").on(table.createdAt),
  foreignKey({
    columns: [table.postId],
    foreignColumns: [literaturePosts.id],
    name: "literature_comments_post_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [siteUsers.id],
    name: "literature_comments_user_id_fkey",
  }),
]);

export const literaturePosts = pgTable("literature_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  sourcePlatform: varchar("source_platform", { length: 100 }),
  content: text("content").notNull(),
  recommendationReason: text("recommendation_reason"),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  rejectReason: text("reject_reason"),
  authorUserId: uuid("author_user_id"),
  reviewedAt: customTimestamptz("reviewed_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_lit_posts_status").on(table.status),
  index("idx_lit_posts_created").on(table.createdAt),
  index("idx_lit_posts_author").on(table.authorUserId),
  foreignKey({
    columns: [table.authorUserId],
    foreignColumns: [siteUsers.id],
    name: "literature_posts_author_user_id_fkey",
  }),
]);

export const registerApplications = pgTable("register_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  applicationReason: text("application_reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  rejectReason: text("reject_reason"),
  reviewedAt: customTimestamptz("reviewed_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_register_apps_status").on(table.status),
  index("idx_register_apps_created").on(table.createdAt),
]);

export const siteUsers = pgTable("site_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default('user'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("site_users_username_key").on(table.username),
  uniqueIndex("idx_site_users_username").on(table.username),
]);

export const guestbookNotes = pgTable("guestbook_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorName: varchar("author_name", { length: 100 }).notNull().default('匿名访客'),
  content: text("content").notNull(),
  noteShape: varchar("note_shape", { length: 20 }).notNull().default('shiba'),
  noteColor: varchar("note_color", { length: 50 }).default('#FFE4B5'),
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_guestbook_status").on(table.status),
  index("idx_guestbook_created").on(table.createdAt),
]);

export const collectionCards = pgTable("collection_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  category: varchar("category", { length: 100 }).default('photocard'),
  sortOrder: integer("sort_order").default(0),
  rotationDegree: integer("rotation_degree").default(0),
  uploaderId: uuid("uploader_id"),
  uploaderName: varchar("uploader_name", { length: 100 }),
  uploaderAvatarUrl: text("uploader_avatar_url"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_collection_category").on(table.category),
  index("idx_collection_sort").on(table.sortOrder),
  index("idx_collection_uploader").on(table.uploaderId),
]);

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  eventDate: date("event_date").notNull(),
  description: text("description"),
  hasCrown: boolean("has_crown").default(false),
  eventType: varchar("event_type", { length: 50 }).default('anniversary'),
  uploaderId: uuid("uploader_id"),
  uploaderName: varchar("uploader_name", { length: 100 }),
  uploaderAvatarUrl: text("uploader_avatar_url"),
  sourceUrl: text("source_url"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_calendar_events_date").on(table.eventDate),
  index("idx_calendar_uploader").on(table.uploaderId),
]);

export const diaryEntries = pgTable("diary_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  weather: varchar("weather", { length: 50 }).default('sunny'),
  entryDate: date("entry_date").notNull(),
  illustrationUrl: text("illustration_url"),
  status: varchar("status", { length: 20 }).notNull().default('published'),
  sortOrder: integer("sort_order").default(0),
  author: varchar("author", { length: 255 }),
  sourcePlatform: varchar("source_platform", { length: 100 }),
  completionStatus: varchar("completion_status", { length: 20 }).default('completed'),
  contentWarnings: text("content_warnings").array().default([]),
  characterBackground: text("character_background"),
  recommendationReason: text("recommendation_reason"),
  rejectReason: text("reject_reason"),
  reviewedAt: customTimestamptz("reviewed_at", { precision: 3 }),
  submitterId: uuid("submitter_id"),
  submitterName: varchar("submitter_name", { length: 100 }),
  sourceUrl: text("source_url"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_diary_entries_date").on(table.entryDate),
  index("idx_diary_entries_status").on(table.status),
  index("idx_diary_entries_completion").on(table.completionStatus),
  index("idx_diary_entries_submitter").on(table.submitterId),
]);

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
