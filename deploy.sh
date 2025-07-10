#!/bin/bash

echo "🚀 Tenant Insights Dashboard Deployment Script"
echo "=============================================="

# Build the application
echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check your code and try again."
    exit 1
fi

echo "✅ Build successful!"
echo ""

echo "Choose your deployment method:"
echo "1) Vercel (Recommended)"
echo "2) Netlify" 
echo "3) Static file server (for testing)"
echo "4) Docker container"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🔗 Deploying to Vercel..."
        echo "Please run: vercel --prod"
        echo "Don't forget to set these environment variables in Vercel dashboard:"
        echo "- VITE_SUPABASE_URL"
        echo "- VITE_SUPABASE_ANON_KEY"
        echo "- VITE_MAPBOX_ACCESS_TOKEN (optional)"
        ;;
    2)
        echo "🔗 Deploying to Netlify..."
        echo "Please run: netlify deploy --prod --dir=dist"
        echo "Or drag the 'dist' folder to netlify.com"
        echo "Don't forget to set environment variables in Netlify dashboard."
        ;;
    3)
        echo "🌐 Starting local static server..."
        npx serve dist -p 3000
        ;;
    4)
        echo "🐳 Building Docker container..."
        docker build -t tenant-insights-dashboard .
        echo "Run with: docker run -p 3000:80 tenant-insights-dashboard"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"