# Copy Post It - Print Request System

A full-stack web application for managing PDF print requests with automatic invoice generation and email notifications.

## Features

### User Features
- User authentication (signup, login, logout)
- PDF upload (single or multiple files)
- Automatic PDF page counting
- Print request submission
- Automatic invoice generation and email delivery
- Real-time order status tracking
- Invoice download

### Admin Features
- Admin authentication panel
- View all print requests
- Update request statuses (submitted, in progress, posted, paid)
- Update posting/shipping costs
- Download user-submitted PDFs
- View and download invoices
- Automatic email notifications on status changes

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: Local file system (can be migrated to S3)
- **Email**: Resend
- **PDF Processing**: pdf-lib, pdfjs-dist
- **Authentication**: JWT

## Project Structure

```
COPY-POST-IT/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages
│   ├── dashboard/         # User dashboard
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── PDFUpload.tsx     # PDF upload component
│   └── OrdersList.tsx    # Orders list component
├── lib/                   # Utilities and helpers
│   ├── auth.tsx          # Authentication context
│   └── utils.ts          # Utility functions
├── server/                # Express backend
│   ├── index.js          # Main server file
│   └── package.json      # Server dependencies
├── prisma/                # Database schema
│   └── schema.prisma     # Prisma schema
├── uploads/               # Uploaded PDFs (gitignored)
└── invoices/              # Generated invoices (gitignored)
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Resend account (for email) or similar service

### Local Development

1. **Clone and install dependencies:**

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

2. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/copy_post_it?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="noreply@yourdomain.com"
NEXT_PUBLIC_API_URL="http://localhost:3001"
PORT=3001
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Create an admin user manually via Prisma Studio
npx prisma studio
```

4. **Create an admin user:**

You can create an admin user using Prisma Studio or by running a script. To create via Prisma Studio:

```bash
npx prisma studio
```

Then create a user with `role: "admin"` and a hashed password (use bcrypt to hash).

Or create a script `scripts/create-admin.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      name: 'Admin User',
    },
  });
  console.log('Admin created:', admin);
}

createAdmin();
```

5. **Start the development servers:**

```bash
# Terminal 1: Start backend server
cd server
npm start
# or for development with auto-reload:
npm run dev

# Terminal 2: Start frontend
npm run dev
```

6. **Access the application:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Deployment

### Backend Deployment (Render)

1. **Create a new Web Service on Render:**
   - Connect your GitHub repository
   - Set build command: `cd server && npm install && npx prisma generate && npx prisma db push`
   - Set start command: `cd server && node index.js`
   - Set environment: `Node`

2. **Create a PostgreSQL database on Render:**
   - Create a new PostgreSQL database
   - Copy the internal database URL

3. **Set environment variables on Render:**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A strong random string
   - `RESEND_API_KEY`: Your Resend API key
   - `EMAIL_FROM`: Your sender email (must be verified in Resend)
   - `PORT`: Set to `10000` (Render default)
   - `NODE_ENV`: `production`

4. **Deploy:**
   - Render will automatically deploy on push to main branch
   - Note your Render service URL (e.g., `https://copy-post-it-api.onrender.com`)

### Frontend Deployment (Vercel)

1. **Update API URL:**
   - Update `NEXT_PUBLIC_API_URL` in your `.env` or Vercel environment variables to your Render backend URL

2. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```
   Or connect your GitHub repository to Vercel for automatic deployments.

3. **Set environment variables on Vercel:**
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g., `https://copy-post-it-api.onrender.com`)

4. **Update vercel.json:**
   - Update the rewrite destination in `vercel.json` to point to your Render backend URL

### File Storage Considerations

Currently, files are stored locally on the server. For production:

1. **Option 1: Use S3-compatible storage**
   - Update multer configuration to use S3
   - Update file URLs in database

2. **Option 2: Use Render's persistent disk**
   - Render free tier has ephemeral storage
   - Consider upgrading or using external storage

3. **Option 3: Use a CDN**
   - Upload files to a CDN and store URLs

## Database Schema

### User
- `id`: Unique identifier
- `email`: User email (unique)
- `passwordHash`: Hashed password
- `name`: User name (optional)
- `role`: 'user' or 'admin'
- `requests`: Related print requests

### PrintRequest
- `id`: Unique identifier
- `userId`: Foreign key to User
- `pdfUrl`: Path to uploaded PDF
- `pdfFileName`: Original filename
- `pageCount`: Number of pages
- `postingCost`: Shipping cost
- `systemFee`: System fee (always 1.0)
- `printCost`: Pages × 0.50
- `totalCost`: Total cost
- `status`: Current status
- `invoiceUrl`: Path to generated invoice
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### StatusLog
- `id`: Unique identifier
- `requestId`: Foreign key to PrintRequest
- `oldStatus`: Previous status
- `newStatus`: New status
- `changedBy`: Admin user ID
- `createdAt`: Change timestamp

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Print Requests
- `POST /api/requests` - Create print request (protected, multipart/form-data)
- `GET /api/requests` - Get all requests (protected, admin sees all, users see own)
- `GET /api/requests/:id` - Get specific request (protected)
- `PATCH /api/requests/:id/status` - Update request status (admin only)

## Pricing Calculation

- **Print Cost**: Number of pages × €0.50
- **Posting Cost**: Admin-configurable or user-provided
- **System Fee**: €1.00 (fixed)
- **Total**: Print Cost + Posting Cost + System Fee

## Email Notifications

The system sends emails for:
1. Account confirmation (on registration)
2. Invoice delivery (on request submission)
3. Status updates (when admin changes status)

Configure Resend:
1. Sign up at https://resend.com
2. Verify your domain or use the test domain
3. Get your API key
4. Set `RESEND_API_KEY` and `EMAIL_FROM` environment variables

## Troubleshooting

### PDF Page Counting Issues
If PDF page counting fails, the system defaults to 1 page. Check server logs for errors.

### Email Not Sending
- Verify Resend API key is correct
- Check that `EMAIL_FROM` is a verified domain/email in Resend
- Check server logs for email errors

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network connectivity

### File Upload Issues
- Check file size limits (currently 10MB)
- Verify uploads directory has write permissions
- Check server logs for multer errors

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

