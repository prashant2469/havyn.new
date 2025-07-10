# Deployment Guide for Tenant Insights Dashboard

This React + Vite application can be deployed to several platforms. Here are instructions for the most popular options.

## Prerequisites

The application requires the following environment variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_MAPBOX_ACCESS_TOKEN` (optional): Mapbox API token for map features

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is ideal for React applications and provides excellent performance.

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from your project directory:**
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel dashboard:**
   - Go to your project settings in Vercel
   - Add the environment variables from your `.env` file
   - Redeploy if needed

4. **Alternative: GitHub Integration:**
   - Push your code to GitHub
   - Connect your GitHub repository to Vercel
   - Set environment variables in the Vercel dashboard
   - Automatic deployments on every push

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **Set environment variables:**
   - Go to Site settings > Environment variables in Netlify dashboard
   - Add your environment variables

4. **Alternative: Drag and Drop:**
   - Run `npm run build`
   - Drag the `dist` folder to Netlify's deploy area
   - Configure environment variables in the dashboard

### Option 3: GitHub Pages

For static deployment (note: environment variables need to be baked in at build time):

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json scripts:**
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Set homepage in package.json:**
   ```json
   "homepage": "https://yourusername.github.io/repository-name"
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

### Option 4: Railway

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway link
   railway up
   ```

3. **Set environment variables:**
   ```bash
   railway variables set VITE_SUPABASE_URL=your_url
   railway variables set VITE_SUPABASE_ANON_KEY=your_key
   ```

## Environment Variables Setup

For any platform, you'll need to set these environment variables:

```
VITE_SUPABASE_URL=https://qicbherqdoimeowmkuti.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpY2JoZXJxZG9pbWVvd21rdXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNjI5NjcsImV4cCI6MjA1OTczODk2N30.gjtViNNbx-kUeg8AOP0Zd0GIA8KlDX7prizFv4zynXM
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token (optional)
```

## Quick Start (Vercel - Fastest Option)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repository
4. Add environment variables in the deployment settings
5. Deploy!

Your application will be live in minutes with a custom URL.

## Post-Deployment

After deployment:
1. Test all features, especially Supabase connections
2. Verify map functionality (if using Mapbox)
3. Check that data uploads and chart generation work properly
4. Test responsive design on different devices

## Troubleshooting

- **Build fails**: Check that all environment variables are set
- **Supabase connection issues**: Verify your Supabase URL and key
- **Map not loading**: Ensure Mapbox token is set (if using Mapbox features)
- **Routing issues**: Make sure redirects are configured for SPA routing

## Performance Optimization

The build shows a large bundle size. Consider:
- Implementing code splitting with dynamic imports
- Lazy loading heavy components (maps, charts)
- Optimizing images and assets