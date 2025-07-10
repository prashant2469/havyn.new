# Tenant Insights Dashboard

A comprehensive React-based dashboard for tenant insights and property management, featuring interactive charts, maps, and data visualization.

## 🚀 Quick Deployment

Your project is **ready to deploy**! Choose your preferred method:

### Option 1: Vercel (Fastest - Recommended)
```bash
npx vercel --prod
```

### Option 2: Netlify
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

### Option 3: One-Click Script
```bash
./deploy.sh
```

## 🔧 Environment Variables

The following environment variables are already configured:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ⚠️ `VITE_MAPBOX_ACCESS_TOKEN` (optional - set if using map features)

## 📚 Features

- Interactive data visualization with Chart.js
- Map integration with Leaflet and Mapbox GL
- Supabase backend integration
- Responsive design with Tailwind CSS
- File upload and CSV processing
- Real-time data updates

## 🛠 Development

```bash
npm install
npm run dev
```

## 📖 Detailed Documentation

See `DEPLOYMENT.md` for comprehensive deployment instructions and troubleshooting.
