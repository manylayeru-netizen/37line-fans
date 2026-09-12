# 37line 手帐日记 · 企鹅与柴犬的日常 — 粉丝站

手帐风格的粉丝站，记录 Mina 和 Sana 的温馨互动。暖色复古色调，手绘风格 UI，
包含今日记录、双人日历、收集册、留言板、文学鉴赏五大栏目，
配套完整管理员后台。

## 技术栈

- **后端**: NestJS 10 + TypeScript + Drizzle ORM + PostgreSQL
- **前端**: React 19 + TypeScript + Tailwind CSS + React Router v6
- **认证**: 自有用户体系 + JWT + 注册申请审核制
- **部署**: 
  - Vercel（Serverless）+ Neon（PostgreSQL）+ Vercel Blob（图片存储）— **推荐，免费层可用**
  - 或 Node.js >= 22 + Nginx + 任意 PostgreSQL 数据库

## 默认管理员

- 用户名: `admin`
- 密码: `admin123`
- **首次登录后请立即修改密码**（登录后点击右上角头像 → 修改密码）

## 功能一览

### 前台

| 栏目 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | Hero + 各模块入口卡片 + 最新动态 |
| 今日记录 | `/diary` | 日记列表 + 详情页 |
| 双人日历 | `/calendar` | 重要日期标记（生日、纪念日、皇冠） |
| 收集册 | `/collection` | 拍立得风格卡片，支持分类筛选 |
| 留言板 | `/guestbook` | 便签留言，软木板展示，需审核 |
| 文学鉴赏 | `/literature` | 帖子列表、详情、评论、标签筛选 |
| 登录 | `/login` | 账号登录 |
| 注册 | `/register` | 提交注册申请（需管理员审核） |

### 后台（需管理员登录）

| 页面 | 路径 | 说明 |
|------|------|------|
| 仪表盘 | `/admin` | 数据统计 + 快捷操作 |
| 日记管理 | `/admin/diary` | 新增、编辑、删除、上下线 |
| 日历管理 | `/admin/calendar` | 新增、编辑、删除重要日期 |
| 收集册管理 | `/admin/collection` | 新增、编辑、删除卡片 |
| 留言审核 | `/admin/guestbook` | 审核通过 / 拒绝 / 删除 |
| 文学帖子 | `/admin/literature` | 帖子审核 / 管理 |
| 评论管理 | `/admin/literature/comments` | 评论删除 |
| 标签管理 | `/admin/literature/tags` | 标签 CRUD |
| 用户管理 | `/admin/users` | 角色、状态、重置密码 |
| 注册审核 | `/admin/applications` | 通过 / 拒绝注册申请 |

---

## 部署指南（37line.fans）

### 一、环境要求

- Node.js >= 22.0.0
- PostgreSQL >= 13
- Nginx（反向代理 + HTTPS）
- 系统: Linux（推荐 Ubuntu 22.04 / Debian 12）

### 二、准备工作

#### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # 验证
```

#### 2. 安装 PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### 3. 创建数据库和用户

```bash
sudo -u postgres psql
```

```sql
CREATE USER fan_site WITH PASSWORD 'your_strong_password';
CREATE DATABASE fan_site OWNER fan_site;
\q
```

#### 4. 安装 Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 三、部署应用

#### 1. 上传代码

将整个项目上传到服务器，例如 `/var/www/37line`：

```bash
cd /var/www/37line
```

#### 2. 安装依赖

```bash
npm ci
```

#### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
nano .env
```

**环境变量清单**:

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://fan_site:password@localhost:5432/fan_site` |
| `JWT_SECRET` | JWT 签名密钥（务必修改为随机字符串） | `your-super-secret-jwt-key-change-me` |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `PORT` | 服务端口（默认 3000） | `3000` |
| `NODE_ENV` | 运行环境 | `production` |

#### 4. 初始化数据库

```bash
# 建表（执行 DDL）
npm run db:migrate

# 注入初始数据（可选，包含示例内容和默认管理员）
npm run db:seed
```

> 首次启动应用时，`AuthModule` 会自动创建默认管理员账号 `admin / admin123`。

#### 5. 构建生产版本

```bash
npm run build
```

构建产物：
- 后端: `dist/server/`
- 前端: `dist/client/`

#### 6. 启动服务（使用 PM2）

```bash
npm install -g pm2

# 启动
pm2 start dist/server/main.js --name 37line-fans

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### 四、配置 Nginx 反向代理

#### 1. 创建站点配置

```bash
sudo nano /etc/nginx/sites-available/37line.fans
```

配置内容：

```nginx
server {
    listen 80;
    server_name 37line.fans www.37line.fans;

    # 静态文件（前端构建产物）
    location / {
        root /var/www/37line/dist/client;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 反向代理到 Node 服务
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 上传文件大小限制
        client_max_body_size 10M;
    }
}
```

#### 2. 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/37line.fans /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

### 五、配置 HTTPS（Let's Encrypt）

#### 1. 安装 Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

#### 2. 申请证书

```bash
sudo certbot --nginx -d 37line.fans -d www.37line.fans
```

Certbot 会自动修改 Nginx 配置并开启 HTTPS。

#### 3. 自动续期

Certbot 默认已配置 systemd timer 自动续期，验证一下：

```bash
sudo systemctl list-timers | grep certbot
```

### 六、更新应用

```bash
cd /var/www/37line
git pull          # 或重新上传代码
npm ci            # 安装新依赖
npm run build     # 重新构建
pm2 reload 37line-fans  # 平滑重启
```

### 七、备份

#### 数据库备份

```bash
# 备份
sudo -u postgres pg_dump fan_site > /var/backups/37line_$(date +%Y%m%d).sql

# 恢复
sudo -u postgres psql fan_site < /var/backups/37line_YYYYMMDD.sql
```

建议设置 cron 每日自动备份。

---

## Vercel + Neon 部署指南（推荐，免费层可用）

本项目已适配 Vercel Serverless + Neon PostgreSQL，可完全使用免费层部署。

### 一、准备工作

1. **GitHub 账号** — 将代码推送到 GitHub 仓库
2. **Vercel 账号** — vercel.com 免费注册（Hobby 计划）
3. **Neon 账号** — neon.tech 免费注册（Free Tier 512MB 存储）

### 二、部署数据库（Neon）

1. 登录 [Neon Console](https://console.neon.tech/)
2. 点击 **Create a project**
3. 填写项目名（如 `37line-fans`），选择就近区域
4. 创建后复制 **Connection string**（格式类似 `postgresql://user:pass@ep-xxx.neon.tech/neondb`）
5. 在项目根目录执行建表脚本：

```bash
psql "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" -f init.sql
```

> 如果本地没有 psql，也可以在 Neon Console 的 **SQL Editor** 中逐段执行 `init.sql` 中的 SQL 语句。

### 三、部署到 Vercel

#### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/37line-fans.git
git push -u origin main
```

#### 2. 导入项目到 Vercel

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New → Project**
3. 选择刚才创建的 GitHub 仓库，点击 **Import**
4. 配置项目：
   - **Framework Preset**: 选择 Other（Vercel 会自动检测）
   - **Build Command**: `npm run build:prod`
   - **Output Directory**: `dist/client`
   - **Install Command**: `npm install`

#### 3. 配置环境变量

在 **Environment Variables** 中添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | Neon 连接串（含 `?sslmode=require`） | PostgreSQL 数据库 |
| `JWT_SECRET` | 随机字符串（建议 32 位以上） | JWT 签名密钥 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 令牌 | 图片存储（可选，配置后支持上传） |
| `CORS_ORIGIN` | `https://37line.fans` | 允许的前端域名 |
| `NODE_ENV` | `production` | 运行环境 |

> **Vercel Blob 开通方式**：在 Vercel 项目 → Storage → Create → Blob，创建后会自动生成 `BLOB_READ_WRITE_TOKEN`。
> 未配置时，上传功能不可用，用户仍可通过图片 URL 添加内容。

#### 4. 开始部署

点击 **Deploy**，等待部署完成（首次约 2-3 分钟）。

部署成功后会得到一个 `*.vercel.app` 的预览域名，可以先访问测试。

### 四、绑定自定义域名 37line.fans

1. 在 Vercel 项目页面点击 **Settings → Domains**
2. 输入 `37line.fans`，点击 **Add**
3. Vercel 会提示你添加 DNS 记录
4. 登录你的域名注册商（如 Namecheap / Cloudflare / 阿里云），添加：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| `A` | `@` | Vercel 提供的 IP |
| `CNAME` | `www` | `cname.vercel-dns.com` |

5. 等待 DNS 生效（通常几分钟），Vercel 会自动签发 HTTPS 证书

### 五、初始化数据库

部署完成后，如果还没执行 `init.sql`，用以下方式初始化：

```bash
# 方式一：本地 psql 连接 Neon 执行
psql "$DATABASE_URL?sslmode=require" -f init.sql

# 方式二：Neon Console SQL Editor 手动执行 init.sql 中的 SQL
```

初始化后，默认管理员账号为：
- **用户名**: `admin`
- **密码**: `admin123`

> 首次登录后请立即修改密码！

### 六、更新应用

```bash
git add .
git commit -m "update"
git push
```

推送到 main 分支后 Vercel 会自动重新部署。

### 七、从自建服务器迁移到 Vercel

1. 导出原数据库：
```bash
pg_dump fan_site > backup.sql
```

2. 导入到 Neon：
```bash
psql "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" < backup.sql
```

3. 图片迁移：如有本地/对象存储中的图片，需手动上传到 Vercel Blob 或保持原 URL 不变。

---

## 开发环境运行

```bash
# 安装依赖
npm install

# 启动开发服务器（前后端同时启动，支持热重载）
npm run dev

# 访问 http://localhost:5173
```

## 内容安全

- **留言板**: 访客留言需管理员审核后才展示
- **文学帖子**: 用户投稿需管理员审核通过后才发布
- **注册申请**: 用户需填写申请理由，管理员审核通过后才能登录
- **敏感词过滤**: 内置基础敏感词过滤（可在 `server/common/services/content-filter.service.ts` 中扩展词库）

## 目录结构

```
├── client/              # React 前端
│   └── src/
│       ├── pages/       # 页面（前台 + 后台）
│       ├── components/  # 通用组件
│       ├── api/         # API 调用层
│       └── utils/       # 工具函数
├── server/              # NestJS 后端
│   ├── modules/         # 业务模块
│   ├── common/          # 公共服务（JWT、内容过滤、守卫）
│   └── database/        # Drizzle ORM schema
├── shared/              # 前后端共享类型定义
└── package.json
```

## 许可证

MIT
