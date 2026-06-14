# Private Cloud Drive - 個人專屬雲盤

## 1. Concept & Vision

一個極簡、安全的個人/家庭雲盤服務。採用現代玻璃態（Glassmorphism）設計風格，配合流暢的漸層背景和柔和的光暈效果。強調隱私（3 個帳號密碼）、美觀和實用性。整體感覺：現代、科技感、輕盈、私密。

## 2. Design Language

### Color Palette
```css
/* Light Mode */
--bg-base: #f0f4ff;
--bg-gradient-1: #e0e7ff;
--bg-gradient-2: #f5f3ff;
--bg-gradient-3: #ecfeff;
--card-bg: rgba(255, 255, 255, 0.72);
--text-primary: #0f172a;
--text-secondary: #64748b;
--accent: #6366f1;
--accent-hover: #4f46e5;

/* Dark Mode */
--bg-base: #0b0f1a;
--bg-gradient-1: #111827;
--bg-gradient-2: #0f172a;
--card-bg: rgba(30, 41, 59, 0.65);
--accent: #818cf8;
```

### Typography
- Font: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Microsoft JhengHei)
- Scale: 11px (badge) / 13px (label) / 14px (body) / 15px (subtitle) / 16px (title) / 22px (heading) / 28px (hero)

### Motion Philosophy
- 漸入動畫: `fadeUp 0.5-0.6s ease`
- 浮動光暈: `float 12s ease-in-out infinite`
- 按鈕互動: `translateY(-1px)` on hover
- 主題切換: `transition 0.35s ease`

### Visual Assets
- 背景光暈球（Orbs）動畫效果
- 毛玻璃（Glassmorphism）卡片
- Emoji 作為主要圖示（📦, 📤, 📂, 📭 等）

## 3. Layout & Structure

### Pages
1. **Login Page** (`/login`)
   - 居中登入卡片，玻璃態效果
   - 漸層背景 + 浮動光暈
   - 主題切換按鈕

2. **Main Dashboard** (`/drive`)
   - 頂部標題區域（Logo + 標題）
   - 上傳區域（拖放 + 點擊）
   - 檔案列表區域
   - 儲存空間指示器
   - 登出按鈕

### Responsive Strategy
- Mobile: 單欄布局，按鈕堆疊
- Desktop: 標準卡片布局

## 4. Features & Interactions

### Authentication
- 帳號 + 密碼登入（最多 3 個用戶）
- Cookie-based session
- 環境變數配置用戶

### File Upload
- 拖放上傳
- 點擊選擇檔案
- 多檔案支援

### File/Folder Management
- 建立資料夾
- 刪除檔案/資料夾（帶確認）
- 重新命名
- 導航進入資料夾
- 麵包屑導航

### Search
- 即時搜尋

### Download
- 單檔下載
- 批量下載 ZIP

### Preview
- 圖片預覽
- 其他檔案提供下載

### Sorting
- 名稱/大小/日期排序

## 5. Technical Approach

### Frontend Stack
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS + Custom CSS
- Lucide React (icons)
- JSZip (batch download)

### Backend/API Routes
- `/api/auth/login` - POST, validate credentials, set cookie
- `/api/auth/logout` - POST, clear cookie
- `/api/auth/check` - GET, verify session
- `/api/files/list` - GET, list files in path
- `/api/files/upload` - POST, upload file
- `/api/files/delete` - DELETE, remove file
- `/api/files/rename` - PATCH, rename file
- `/api/folders/create` - POST, create folder
- `/api/search` - GET, search files
- `/api/storage` - GET, get storage usage
- `/api/download` - GET, download file(s)

### Data Model (D1 SQLite)
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  is_folder INTEGER DEFAULT 0,
  parent_path TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Environment Variables
```
USERNAME_1, PASSWORD_1=nam, 0000
USERNAME_2, PASSWORD_2 (optional)
USERNAME_3, PASSWORD_3 (optional)
SESSION_SECRET
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME, R2_PUBLIC_DOMAIN
D1_DATABASE_ID
STORAGE_LIMIT
```
