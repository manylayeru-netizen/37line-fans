-- =====================================================
-- 37line 手帐日记 · 企鹅与柴犬的日常 — 数据库初始化脚本
-- 适用于 PostgreSQL 14+（Neon / Vercel Postgres / 自建 PG）
-- 首次部署时执行：psql "$DATABASE_URL" -f init.sql
-- =====================================================

-- 扩展（如已安装则跳过）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 用户与注册申请
-- =====================================================

CREATE TABLE IF NOT EXISTS site_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_users_username ON site_users (username);

CREATE TABLE IF NOT EXISTS register_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    application_reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    reviewed_at TIMESTAMPTZ(3),
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_register_apps_status ON register_applications (status);
CREATE INDEX IF NOT EXISTS idx_register_apps_created ON register_applications (_created_at);

-- =====================================================
-- 2. 文学鉴赏（推文 / 帖子 / 标签 / 评论）
-- =====================================================

CREATE TABLE IF NOT EXISTS literature_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#F4A261',
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS literature_tags_name_key ON literature_tags (name);
CREATE UNIQUE INDEX IF NOT EXISTS literature_tags_slug_key ON literature_tags (slug);

CREATE TABLE IF NOT EXISTS literature_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    source_platform VARCHAR(100),
    content TEXT NOT NULL,
    recommendation_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    author_user_id UUID,
    reviewed_at TIMESTAMPTZ(3),
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_user_id) REFERENCES site_users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lit_posts_status ON literature_posts (status);
CREATE INDEX IF NOT EXISTS idx_lit_posts_created ON literature_posts (_created_at);
CREATE INDEX IF NOT EXISTS idx_lit_posts_author ON literature_posts (author_user_id);

CREATE TABLE IF NOT EXISTS literature_post_tags (
    post_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES literature_posts (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES literature_tags (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS literature_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    content TEXT NOT NULL,
    user_id UUID,
    guest_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'approved',
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES literature_posts (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES site_users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lit_comments_post ON literature_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_lit_comments_created ON literature_comments (_created_at);

-- =====================================================
-- 3. 今日记录 / 日记
-- =====================================================

CREATE TABLE IF NOT EXISTS diary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    weather VARCHAR(50) DEFAULT 'sunny',
    entry_date DATE NOT NULL,
    illustration_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    sort_order INTEGER DEFAULT 0,
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_diary_entries_status ON diary_entries (status);

-- =====================================================
-- 4. 双人日历
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    has_crown BOOLEAN DEFAULT FALSE,
    event_type VARCHAR(50) DEFAULT 'anniversary',
    uploader_id UUID,
    uploader_name VARCHAR(100),
    uploader_avatar_url TEXT,
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events (event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_uploader ON calendar_events (uploader_id);

-- =====================================================
-- 5. 收集册
-- =====================================================

CREATE TABLE IF NOT EXISTS collection_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'photocard',
    sort_order INTEGER DEFAULT 0,
    rotation_degree INTEGER DEFAULT 0,
    uploader_id UUID,
    uploader_name VARCHAR(100),
    uploader_avatar_url TEXT,
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collection_category ON collection_cards (category);
CREATE INDEX IF NOT EXISTS idx_collection_sort ON collection_cards (sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_uploader ON collection_cards (uploader_id);

-- =====================================================
-- 6. 留言板
-- =====================================================

CREATE TABLE IF NOT EXISTS guestbook_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name VARCHAR(100) NOT NULL DEFAULT '匿名访客',
    content TEXT NOT NULL,
    note_shape VARCHAR(20) NOT NULL DEFAULT 'shiba',
    note_color VARCHAR(50) DEFAULT '#FFE4B5',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guestbook_status ON guestbook_notes (status);
CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook_notes (_created_at);

-- =====================================================
-- 初始数据：默认管理员 + 示例标签
-- =====================================================

-- 默认管理员：admin / admin123
-- 首次登录后请立即修改密码！
INSERT INTO site_users (username, password_hash, role, display_name, status)
VALUES (
    'admin',
    '329ca92ef5b4a4e3fa1c13af7e8b7915fcad2a9ee3ceeb43b7ed918fd7deaa1f',
    'admin',
    '站长',
    'active'
)
ON CONFLICT (username) DO NOTHING;

-- 示例标签（文学鉴赏）
INSERT INTO literature_tags (name, slug, color) VALUES
    ('日常', 'daily', '#F4A261'),
    ('舞台', 'stage', '#7D9BB5'),
    ('合照', 'couple', '#F8C8DC'),
    ('饭拍', 'fan-cam', '#A8DADC'),
    ('幕后', 'behind', '#B8D4E3')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 提示
-- =====================================================
-- admin / admin123 的 password_hash 计算方式：
--   sha256('admin123' + '37line_salt')
-- 如果需要重置，可在管理后台操作或手动更新 password_hash 字段。
