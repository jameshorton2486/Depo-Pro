# Collectibles Analyzer - Google Drive Integration

AI-powered collectible item analysis using Google Drive storage and Claude AI for intelligent image recognition and appraisal.

## Features

- **Google Drive Integration**: Seamlessly access folders containing collectible photos
- **AI Analysis**: Uses Claude AI to analyze images and provide detailed item assessments  
- **Single Item Analysis**: Analyze one folder containing 2-6 photos of a single item
- **Batch Processing**: Process multiple items at once from parent folders
- **Automated Reports**: Generate and upload HTML appraisal reports back to Drive
- **Professional UI**: Clean, modern interface optimized for collectibles workflow
- **Cloud Ready**: Designed for easy deployment to free hosting platforms

## Quick Start (Cloud Deployment - Recommended)

### Option 1: Deploy to Render (Free)

1. **Upload to GitHub**:
   - Create GitHub account and new public repository
   - Upload all project files (drag & drop)
   - Commit changes

2. **Deploy to Render**:
   - Go to render.com and sign up with GitHub
   - Create new Web Service from your repository
   - Add environment variables (see Environment Setup below)
   - Deploy

3. **Update Google OAuth**:
   - Add your Render URL to Google OAuth redirect URIs
   - Format: `https://your-app.onrender.com/auth/google/callback`

## Environment Setup

### Required Environment Variables

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
ANTHROPIC_API_KEY=your_claude_api_key_here
GOOGLE_REDIRECT_URI=https://your-deployed-url.com/auth/google/callback
DEFAULT_OUTPUT_PARENT_ID=your_drive_folder_id_here
NODE_ENV=production
PORT=8787
```

### Google Cloud Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing one

2. **Enable APIs**
   - Navigate to APIs & Services → Library
   - Enable "Google Drive API"

3. **Configure OAuth Consent Screen**
   - Go to APIs & Services → OAuth consent screen
   - Choose "External" user type
   - Fill in app name and support email
   - Add scopes:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.file`
   - Add test users (your Google account email)

4. **Create OAuth Credentials**
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://your-app.onrender.com/auth/google/callback`

## Local Development (Optional)

If you want to run locally for development:

```bash
# Install dependencies
npm install

# Copy environment template
cp 4-env-template.txt .env

# Edit .env with your credentials
# Set GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback

# Run server
npm start
```

Server will be available at: `http://localhost:8787`

## Usage Guide

### Authentication

1. Open your deployed application
2. Click "Connect Google Drive" 
3. Sign in with your Google account (must be added as test user)
4. Approve the requested Drive permissions

### Single Item Analysis

1. **Prepare Folder**: Create a Google Drive folder containing 2-6 images of one collectible item (JPG/PNG/WEBP format)

2. **Get Folder URL**: Copy the Drive folder URL:
   - Format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

3. **Analyze**: Paste the URL into "Analyze Single Folder" and click the button

4. **Review Results**: Claude AI will analyze the images and provide:
   - Item title and description
   - Estimated value range
   - Category classification
   - Approximate year/era
   - Condition assessment

### Batch Processing

1. **Organize Folders**: 
   - Create a parent folder in Google Drive
   - Inside it, create one subfolder per collectible item
   - Put each item's photos (2-6 images) in its respective subfolder

2. **Process Batch**: 
   - Paste the parent folder URL into "Batch Generate"
   - Click process button

3. **Generated Reports**: 
   - HTML appraisal reports are automatically created for each item
   - Reports are uploaded to your configured output folder
   - Each report includes full analysis and professional formatting

## File Structure

```
collectibles-analyzer/
├── server.mjs           # Main Express server
├── index.html           # Web interface
├── package.json         # Dependencies
├── .env                 # Environment variables (create from template)
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Technical Requirements

- **Node.js 16+** (for local development)
- **Google Drive API access**
- **Claude API key from Anthropic**
- **Supported image formats**: JPG, PNG, WEBP
- **Image size limit**: 12MB per file
- **Analysis limit**: Up to 6 images per item

## Deployment Platforms

### Render (Recommended)
- Free tier available
- Automatic deployments from GitHub
- Built-in environment variable management
- https://render.com

### Railway
- Alternative free hosting
- Simple GitHub integration
- https://railway.app

### Vercel
- Great for static sites but requires serverless functions
- https://vercel.com

## Troubleshooting

### Common Issues

**OAuth Errors**
- Verify redirect URI matches exactly in Google OAuth client
- Ensure your Google account is added as test user
- Check that required scopes are configured

**Drive API Errors**  
- Enable Google Drive API in your Google Cloud project
- Verify API quotas haven't been exceeded

**Claude API Errors**
- Verify ANTHROPIC_API_KEY is correctly configured
- Check API quota and usage limits
- Ensure image sizes are under 12MB

**No Images Found**
- Ensure images are directly inside the target folder
- Verify image formats are JPG, PNG, or WEBP
- Check that files aren't in nested subfolders

**Deployment Issues**
- Check environment variables are properly set
- Review deployment logs for specific errors
- Ensure all files are uploaded to repository

## Security Best Practices

- Keep `.env` file private and never commit to version control
- Use environment variables for all sensitive configuration in production
- Rotate OAuth secrets if accidentally exposed
- Implement proper session management for production use
- Keep dependencies updated

## API Endpoints

- `GET /` - Server status and health check
- `GET /ping` - Simple health check for monitoring
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle OAuth callback
- `POST /drive/analyze-folder` - Analyze single folder
- `POST /drive/batch-generate` - Batch process multiple folders

## License

MIT License - Feel free to use and modify for your needs.

## Support

For issues:
1. Check the troubleshooting section above
2. Verify all environment variables are configured
3. Check Google Cloud Console for API errors
4. Review browser console for JavaScript errors

## Contributing

This is a standalone project designed for personal use. Feel free to fork and modify for your specific needs.
