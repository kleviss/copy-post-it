# Quick Start Guide

Get the application running locally in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (see setup options below)
- npm or yarn

### Database Setup Options

**Option 1: Install PostgreSQL locally (Recommended for development)**

On macOS with Homebrew:
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb copy_post_it
```

**Option 2: Use Docker (Easiest)**

```bash
# Run PostgreSQL in Docker
docker run --name copy-post-it-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=copy_post_it \
  -p 5432:5432 \
  -d postgres:15

# Your DATABASE_URL will be:
# postgresql://postgres:postgres@localhost:5432/copy_post_it?schema=public
```

**Option 3: Use a free cloud database (Supabase/Neon)**

1. Sign up at [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Use it as your `DATABASE_URL`

## Steps

1. **Install dependencies:**

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

2. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/copy_post_it?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this"
RESEND_API_KEY="re_your_key_here"  # Optional for local dev
EMAIL_FROM="noreply@example.com"   # Optional for local dev
NEXT_PUBLIC_API_URL="http://localhost:3001"
PORT=3001
```

3. **Set up the database:**

First, make sure PostgreSQL is running (see Prerequisites above).

Then:
```bash
# Generate Prisma client (from root directory)
npx prisma generate

# Push schema to database
npx prisma db push
```

**Note:** The Prisma client is generated in the root `node_modules`, and the server uses it from there. This is already configured in the code.

**Troubleshooting:**
- If you get "Can't reach database server", verify PostgreSQL is running:
  - Homebrew: `brew services list` (should show postgresql@15 as started)
  - Docker: `docker ps` (should show your container running)
- Verify your DATABASE_URL matches your setup:
  - Local: `postgresql://YOUR_USERNAME@localhost:5432/copy_post_it?schema=public`
  - Docker: `postgresql://postgres:postgres@localhost:5432/copy_post_it?schema=public`
  - Cloud: Use the connection string provided by your service

4. **Create an admin user:**

```bash
npm run create-admin
```

Follow the prompts to create your admin account.

5. **Start the servers:**

**Terminal 1 - Backend:**
```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

6. **Access the application:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Test the Application

1. Visit http://localhost:3000
2. Click "Sign Up" and create a user account
3. Log in and upload a PDF
4. Submit a print request
5. Check your email for the invoice (if email is configured)
6. Log in as admin at http://localhost:3000/admin/login
7. Update request statuses

## Troubleshooting

**Database connection error:**
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure database exists

**Port already in use:**
- Change PORT in .env
- Update NEXT_PUBLIC_API_URL accordingly

**Email not working:**
- Email is optional for local development
- Check server logs for email errors
- Verify Resend API key if using email

**PDF upload fails:**
- Check file size (max 10MB)
- Ensure uploads directory has write permissions
- Check server logs for errors

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Customize the application to your needs

