# Railway Deployment Guide for Emoty Web

## Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/U-HNN5)

## Manual Deployment Steps

### 1. Prerequisites
- GitHub repository with your code
- Railway account ([sign up here](https://railway.app))

### 2. Deploy via Railway Dashboard

1. **Connect Repository**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `emo-web` repository

2. **Configure Deployment**
   - Railway will automatically detect it's a Next.js app
   - The `railway.json` configuration will be used automatically
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Set Environment Variables** (if needed)
   - Go to your project dashboard
   - Click on "Variables" tab
   - Add any required environment variables from `.env.example`

4. **Deploy**
   - Click "Deploy Now"
   - Railway will build and deploy your application
   - You'll get a generated domain (e.g., `https://your-app.railway.app`)

### 3. Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 4. Custom Domain (Optional)

1. Go to your project dashboard
2. Click on "Settings"
3. Go to "Domains" section
4. Add your custom domain
5. Configure DNS records as instructed

## Configuration Files

- `railway.json` - Railway-specific configuration
- `package.json` - Contains required build/start scripts
- `.env.example` - Environment variables template

## Features Enabled

- ✅ Automatic deployments on git push
- ✅ Zero-downtime deployments
- ✅ Automatic HTTPS
- ✅ Environment variable management
- ✅ Build logs and monitoring
- ✅ Custom domain support

## Troubleshooting

### Build Failures
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (18+)

### Runtime Issues
- Check application logs in Railway dashboard
- Verify environment variables are set correctly
- Ensure `npm start` works locally

### Performance
- Railway provides automatic scaling
- Monitor usage in the dashboard
- Consider upgrading plan for high traffic

## Support

- [Railway Documentation](https://docs.railway.com)
- [Railway Discord](https://discord.gg/railway)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)