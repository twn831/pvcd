# Private Cloud Drive

A minimalist personal cloud storage application for you and your family (up to 3 users).

## Features

- **Simple Authentication**: Password-only login (no username/email needed)
- **Multi-user Support**: Up to 3 different passwords for family members
- **File Management**: Upload, download, rename, delete files and folders
- **Folder Support**: Create nested folder structures
- **File Preview**: View images and text files directly in the browser
- **Search**: Fuzzy search across all files and folders
- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive Design**: Works great on desktop and mobile devices
- **Storage Indicator**: Visual display of used storage space

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Cloudflare R2 (S3-compatible)
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `PASSWORD_1`, `PASSWORD_2`, `PASSWORD_3`: Set your 3 passwords
- `R2_ENDPOINT`: Your R2 bucket endpoint
- `R2_ACCESS_KEY_ID`: R2 access key
- `R2_SECRET_ACCESS_KEY`: R2 secret key
- `R2_BUCKET_NAME`: Your R2 bucket name
- `R2_PUBLIC_DOMAIN`: Public domain for file access
- `D1_DATABASE_ID`: Your D1 database ID

### 3. Set Up D1 Database

Create a D1 database and run the migration:

```bash
wrangler d1 create private-cloud-drive
# Note the database_id from the output

# Run the migration
wrangler d1 execute private-cloud-drive --file=./migrations/001_create_files.sql --remote
```

### 4. Configure Cloudflare R2

1. Go to Cloudflare Dashboard > R2
2. Create a new bucket
3. Generate an API token with "Edit" permissions
4. Note the endpoint URL from the bucket settings

### 5. Local Development

```bash
npm run dev
```

Visit http://localhost:3000

### 6. Deploy to Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set the build command: `npm run build`
3. Set the build output directory: `.next`
4. Add environment variables in Pages settings
5. Add the D1 database binding in Pages settings

## Project Structure

```
private-cloud-drive/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── drive/        # Main drive page
│   │   ├── login/        # Login page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   ├── lib/              # Utilities and clients
│   │   ├── auth.ts       # Authentication
│   │   ├── db.ts         # D1 database
│   │   ├── r2.ts         # R2 storage
│   │   └── utils.ts      # Helpers
│   ├── middleware.ts     # Auth middleware
│   └── types/            # TypeScript types
├── migrations/           # D1 SQL migrations
├── .env.example          # Environment template
├── package.json
├── tailwind.config.ts
└── wrangler.toml
```

## Security Notes

- Passwords are stored in environment variables (not database)
- Sessions are stored in httpOnly cookies
- All API routes require authentication
- R2 bucket can be set to private (files only accessible via signed URLs)

## License

MIT
