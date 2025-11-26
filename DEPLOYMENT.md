# Deployment Guide

This guide provides step-by-step instructions for deploying the Copy Post It application to production.

## Architecture

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: Express API deployed on Render
- **Database**: PostgreSQL on Render

## Prerequisites

1. GitHub account with repository access
2. Vercel account (free tier available)
3. Render account (free tier available)
4. Resend account for email service (free tier available)

## Step 1: Set Up Database on Render

1. Log in to [Render](https://render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `copy-post-it-db`
   - **Database**: `copy_post_it`
   - **User**: `copy_post_it_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click "Create Database"
5. **Important**: Copy the "Internal Database URL" - you'll need this for the backend

## Step 2: Deploy Backend to Render

1. In Render, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `copy-post-it-api`
   - **Environment**: `Node`
   - **Region**: Same as database
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: Leave empty (we'll handle this in build command)
   - **Build Command**: 
     ```bash
     cd server && npm install && npx prisma generate --schema=../prisma/schema.prisma && npx prisma db push --schema=../prisma/schema.prisma
     ```
     **Alternative (from root):**
     ```bash
     npm install && cd server && npm install && cd .. && npx prisma generate --schema=./prisma/schema.prisma && npx prisma db push --schema=./prisma/schema.prisma
     ```
   - **Start Command**: 
     ```bash
     cd server && node index.js
     ```
4. Add Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL internal URL from Step 1
   - `JWT_SECRET`: Generate a strong random string (e.g., `openssl rand -base64 32`)
   - `RESEND_API_KEY`: Your Resend API key (from Step 4)
   - `EMAIL_FROM`: Your verified email in Resend (e.g., `noreply@yourdomain.com`)
   - `PORT`: `10000` (Render's default)
   - `NODE_ENV`: `production`
5. Click "Create Web Service"
6. Wait for deployment to complete
7. **Note your service URL** (e.g., `https://copy-post-it-api.onrender.com`)

### Important Notes for Render Backend:

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid plan for production
- File uploads on free tier are ephemeral (files are lost on restart)
- For production, use S3 or similar for file storage

## Step 3: Set Up Email Service (Resend)

1. Sign up at [Resend](https://resend.com)
2. Verify your email address
3. Go to "API Keys" and create a new API key
4. Copy the API key (starts with `re_`)
5. If using a custom domain:
   - Add your domain in Resend
   - Add DNS records as instructed
   - Verify domain
6. Use verified email/domain in `EMAIL_FROM` environment variable

## Step 4: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g., `https://copy-post-it-api.onrender.com`)
6. Click "Deploy"
7. Wait for deployment to complete
8. **Note your Vercel URL** (e.g., `https://copy-post-it.vercel.app`)

## Step 5: Update CORS and API Configuration

1. In your Render backend environment variables, add:
   - `FRONTEND_URL`: Your Vercel frontend URL
2. Update `server/index.js` CORS configuration if needed:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
     credentials: true
   }));
   ```
3. Redeploy the backend

## Step 6: Create Admin User

After deployment, create an admin user:

1. SSH into your Render service (if available) or use a local connection
2. Set up local environment with production DATABASE_URL
3. Run the admin creation script:
   ```bash
   npm run create-admin
   ```
4. Or use Prisma Studio:
   ```bash
   DATABASE_URL="your-production-url" npx prisma studio
   ```

## Step 7: Test Deployment

1. Visit your Vercel frontend URL
2. Create a test user account
3. Upload a test PDF
4. Verify invoice generation
5. Check email delivery
6. Test admin login and status updates

## Troubleshooting

### Backend Issues

**Database Connection Errors:**
- Verify `DATABASE_URL` is correct
- Ensure database is running on Render
- Check if using internal URL (for Render services) vs external URL

**File Upload Issues:**
- Files are stored locally on Render (ephemeral on free tier)
- Consider migrating to S3 for production
- Check file size limits (currently 10MB)

**Email Not Sending:**
- Verify Resend API key is correct
- Check `EMAIL_FROM` is verified in Resend
- Check Render logs for email errors

### Frontend Issues

**API Connection Errors:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration on backend
- Ensure backend is running (may be spun down on free tier)

**Build Errors:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors

### Performance Considerations

**Render Free Tier:**
- Services spin down after 15 minutes of inactivity
- First request after spin-down is slow (cold start)
- Consider upgrading for production

**Vercel:**
- Free tier has generous limits
- Automatic HTTPS
- Global CDN

## Production Checklist

- [ ] Database backed up regularly
- [ ] Environment variables secured
- [ ] Admin user created
- [ ] Email service configured and tested
- [ ] File storage migrated to persistent storage (S3)
- [ ] CORS properly configured
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] Error logging set up
- [ ] Monitoring configured
- [ ] Rate limiting implemented (if needed)

## Scaling Considerations

1. **Database**: Upgrade Render PostgreSQL plan for more connections
2. **Backend**: Upgrade Render service for better performance
3. **File Storage**: Migrate to S3 or similar for scalability
4. **CDN**: Use CloudFront or similar for file delivery
5. **Caching**: Implement Redis for session management
6. **Load Balancing**: Use multiple backend instances

## Security Best Practices

1. Use strong `JWT_SECRET` (32+ characters, random)
2. Enable HTTPS (automatic on Vercel/Render)
3. Implement rate limiting
4. Sanitize file uploads
5. Validate all inputs
6. Use environment variables for secrets
7. Regularly update dependencies
8. Monitor for security vulnerabilities

## Cost Estimation (Free Tier)

- **Vercel**: Free (generous limits)
- **Render Web Service**: Free (with limitations)
- **Render PostgreSQL**: Free (90 days, then $7/month)
- **Resend**: Free (3,000 emails/month)

**Total**: Free for development, ~$7/month for production database

## Support

For deployment issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel logs: Dashboard → Your Project → Deployments → View Logs
3. Check application logs in server code
4. Verify environment variables are set correctly

