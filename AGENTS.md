# 37line 手帐日记 · 企鹅与柴犬的日常 — 粉丝站

## 项目概览

手帐风格粉丝站，记录 Mina 和 Sana 的温馨互动。暖色复古色调，手绘风格 UI，
包含今日记录、双人日历、收集册、留言板、文学鉴赏五大栏目，
配套完整管理员后台。

## 设计规范

### 色彩系统（手帐日记风格）

| 色名 | 色值 | 用途 |
|------|------|------|
| 奶油黄（主色） | #FFF3D6 | 页面主背景、卡片底色 |
| 柴犬橘（强调色） | #F4A261 | 主按钮、柴犬元素、重点标签 |
| 企鹅灰蓝（强调色） | #7D9BB5 | 次按钮、企鹅元素、链接 |
| 可可棕（辅助色） | #6B4F3A | 正文文字、边框线 |
| 薄荷绿（辅助色） | #A8DADC | 装饰、成功状态、标签底 |
| 纸米白 | #FFFAF0 | 卡片内层、内容区 |
| 胶带粉 | #F8C8DC | 装饰胶带、粉色便签 |
| 胶带蓝 | #B8D4E3 | 装饰胶带、蓝色便签 |
| 格子浅灰 | #E8DDD0 | 页脚格子纹、分隔线 |
| 墨棕深 | #4A3728 | 标题、重点文字 |

### 字体

- 标题：手写体风格 `'Ma Shan Zheng', 'ZCOOL KuaiLe', cursive`，fallback 到系统 serif
- 正文：`'Noto Sans SC', 'PingFang SC', 'Microsoft Yahei', sans-serif`
- 日记/便签：手写体 `'Caveat', 'Ma Shan Zheng', cursive`

### 间距

- 页面最大宽度：1200px，两侧 padding 24px（移动端 16px）
- 卡片内边距：24px
- 区块间距：48px
- 小元素间距：8px / 12px / 16px

### 圆角与阴影

- 卡片圆角：12px（手帐本圆角感）
- 按钮圆角：20px（圆润贴纸感）
- 阴影：soft drop-shadow，偏暖褐色调 `0 4px 16px rgba(107, 79, 58, 0.12)`

### 视觉元素

- 胶带装饰：页面顶部/卡片角落贴有倾斜的彩色胶带条
- 贴纸元素：星星、爱心、小脚印、皇冠贴纸散落在关键位置
- 拍立得边框：收集册卡片带白色宽边 + 轻微旋转
- 便签形状：留言板用柴犬/企鹅便签，带别针图钉
- 格子纹背景：页脚和软木板使用格子纹/木纹

### 交互动效

- 卡片悬停：轻微摇晃（wobble 动画，3-5度摇摆）
- 便签点击：放大到中心显示完整内容
- 页面滚动：轻微回弹感（使用 Lenis 或 CSS scroll-behavior + overscroll）
- 丝带导航：hover 时丝带下垂变长一点

## 技术架构

### 后端模块

- `auth` — 用户认证、注册申请、登录、JWT
- `diary` — 今日记录/日记条目 CRUD + 上下线
- `calendar` — 双人日历重要日期 CRUD
- `collection` — 收集册卡片 CRUD + 分类
- `guestbook` — 留言板便签 + 审核
- `literature` — 文学鉴赏：帖子、标签、评论、审核
- `admin` — 管理后台聚合接口（用户管理、角色、重置密码）

### 前端页面

**前台：**
- `/` 首页（Hero + 各模块入口卡片）
- `/diary` 今日记录列表 + `/diary/:id` 详情
- `/calendar` 双人日历
- `/collection` 收集册
- `/guestbook` 留言板
- `/literature` 文学鉴赏列表 + `/literature/:id` 详情 + `/literature/post` 发帖
- `/login` 登录 + `/register` 注册申请

**后台（/admin 前缀，需登录+管理员角色）：**
- `/admin` 仪表盘
- `/admin/diary` 日记管理
- `/admin/calendar` 日历管理
- `/admin/collection` 收集册管理
- `/admin/guestbook` 留言审核
- `/admin/literature` 文学帖子审核 + 管理
- `/admin/literature/comments` 评论管理
- `/admin/literature/tags` 标签管理
- `/admin/users` 用户管理
- `/admin/applications` 注册申请审核

### 数据库表

见 `server/database/schema.ts`（建表后自动生成）。

## 角色体系

- `admin` — 管理员，可访问全部后台功能
- `user` — 普通注册用户，可发帖、评论
- 未登录访客 — 可浏览前台公开内容、留言

