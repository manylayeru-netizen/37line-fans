-- ============================================================
-- 37line 手帐日记粉丝站 · TiDB (MySQL 8.0 兼容) 建表脚本
-- 执行方式：在 TiDB Serverless 控制台或 MySQL 客户端执行
-- 全部使用 CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
-- 字符集：utf8mb4 / 排序规则：utf8mb4_unicode_ci（大小写不敏感）
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. site_users（用户表）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `display_name` varchar(100) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `su_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. register_applications（注册申请表）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `register_applications` (
  `id` varchar(36) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `application_reason` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `reject_reason` text DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ra_status_idx` (`status`),
  KEY `ra_created_idx` (`_created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. guestbook_notes（留言板便签）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guestbook_notes` (
  `id` varchar(36) NOT NULL,
  `author_name` varchar(100) NOT NULL DEFAULT '匿名访客',
  `content` text NOT NULL,
  `note_shape` varchar(20) NOT NULL DEFAULT 'shiba',
  `note_color` varchar(50) DEFAULT '#FFE4B5',
  `position_x` int DEFAULT 0,
  `position_y` int DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `gn_status_idx` (`status`),
  KEY `gn_created_idx` (`_created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. collection_cards（收集册/照片集卡片）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `collection_cards` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` text NOT NULL,
  `category` varchar(100) DEFAULT 'photocard',
  `sort_order` int DEFAULT 0,
  `rotation_degree` int DEFAULT 0,
  `uploader_id` varchar(36) DEFAULT NULL,
  `uploader_name` varchar(100) DEFAULT NULL,
  `uploader_avatar_url` text DEFAULT NULL,
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `cc_category_idx` (`category`),
  KEY `cc_sort_idx` (`sort_order`),
  KEY `cc_uploader_idx` (`uploader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. calendar_events（考古日历/重要日期）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `event_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `has_crown` tinyint(1) DEFAULT 0,
  `event_type` varchar(50) DEFAULT 'anniversary',
  `uploader_id` varchar(36) DEFAULT NULL,
  `uploader_name` varchar(100) DEFAULT NULL,
  `uploader_avatar_url` text DEFAULT NULL,
  `source_url` text DEFAULT NULL,
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ce_date_idx` (`event_date`),
  KEY `ce_uploader_idx` (`uploader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. literature_tags（文学标签）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `literature_tags` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `color` varchar(20) DEFAULT '#F4A261',
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lt_name_unique` (`name`),
  UNIQUE KEY `lt_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. literature_posts（文学帖子）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `literature_posts` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `source_platform` varchar(100) DEFAULT NULL,
  `content` text NOT NULL,
  `recommendation_reason` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `reject_reason` text DEFAULT NULL,
  `author_user_id` varchar(36) DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `lp_status_idx` (`status`),
  KEY `lp_created_idx` (`_created_at`),
  KEY `lp_author_idx` (`author_user_id`),
  CONSTRAINT `lp_author_fk` FOREIGN KEY (`author_user_id`) REFERENCES `site_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. literature_post_tags（文学帖子-标签关联表）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `literature_post_tags` (
  `post_id` varchar(36) NOT NULL,
  `tag_id` varchar(36) NOT NULL,
  PRIMARY KEY (`post_id`, `tag_id`),
  KEY `lpt_tag_idx` (`tag_id`),
  CONSTRAINT `lpt_post_fk` FOREIGN KEY (`post_id`) REFERENCES `literature_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lpt_tag_fk` FOREIGN KEY (`tag_id`) REFERENCES `literature_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. literature_comments（文学评论）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `literature_comments` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(36) NOT NULL,
  `content` text NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `guest_name` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'approved',
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `lc_post_idx` (`post_id`),
  KEY `lc_created_idx` (`_created_at`),
  CONSTRAINT `lc_post_fk` FOREIGN KEY (`post_id`) REFERENCES `literature_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lc_user_fk` FOREIGN KEY (`user_id`) REFERENCES `site_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. diary_entries（今日记录/日记条目）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `diary_entries` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `weather` varchar(50) DEFAULT 'sunny',
  `entry_date` date NOT NULL,
  `illustration_url` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `sort_order` int DEFAULT 0,
  `author` varchar(255) DEFAULT '',
  `source_platform` varchar(100) DEFAULT NULL,
  `completion_status` varchar(20) DEFAULT 'completed',
  `content_warnings` json DEFAULT NULL,
  `character_background` text DEFAULT NULL,
  `recommendation_reason` text DEFAULT NULL,
  `reject_reason` text DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `submitter_id` varchar(36) DEFAULT NULL,
  `submitter_name` varchar(100) DEFAULT NULL,
  `source_url` text DEFAULT NULL,
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `_updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `de_date_idx` (`entry_date`),
  KEY `de_status_idx` (`status`),
  KEY `de_completion_idx` (`completion_status`),
  KEY `de_submitter_idx` (`submitter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ============================================================
-- 邮箱验证码表
-- ============================================================
CREATE TABLE IF NOT EXISTS `email_verification_codes` (
  `id` varchar(36) NOT NULL COMMENT 'UUID 主键',
  `email` varchar(255) NOT NULL COMMENT '邮箱地址',
  `code` varchar(10) NOT NULL COMMENT '验证码（6位数字）',
  `purpose` varchar(50) NOT NULL DEFAULT 'register' COMMENT '用途：register / reset-password',
  `expires_at` datetime(3) NOT NULL COMMENT '过期时间',
  `attempt_count` int NOT NULL DEFAULT 0 COMMENT '已尝试次数',
  `max_attempts` int NOT NULL DEFAULT 5 COMMENT '最大尝试次数',
  `used` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已使用',
  `_created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `evc_email_idx` (`email`),
  KEY `evc_email_purpose_idx` (`email`, `purpose`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证码表';

-- 建表完成。说明：
-- - 所有主键使用 varchar(36) 存储 UUID（应用层生成）
-- - datetime(3) 对应原 timestamptz(3)，精度到毫秒
-- - content_warnings 使用 JSON 类型替代 PG text[]
-- - has_crown 使用 tinyint(1) 即 boolean
-- - 外键使用 SET NULL / CASCADE，与原 PG 语义一致
-- - 排序规则 utf8mb4_unicode_ci 大小写不敏感，like 查询天然不区分大小写（无需 ilike）
-- ============================================================
