# YouTube Competitor Analysis Tool

A powerful Next.js-based web application for analyzing YouTube channels, comparing competitors, and discovering trending content. Built with modern technologies including React, TailwindCSS, Groq AI, and Google Sheets integration.

![YouTube Analytics](https://img.shields.io/badge/YouTube-Analytics-red)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![Groq AI](https://img.shields.io/badge/Groq-AI-green)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)

## 🚀 Features

### Core Functionality

- **📊 Channel Analysis**: Deep dive into any YouTube channel's performance with comprehensive statistics, video analytics, and growth trends
- **⚖️ Channel Comparison**: Side-by-side competitive analysis to benchmark performance and identify market opportunities
- **🔍 Channel Search**: Discover channels by name, keyword, or niche with advanced filtering capabilities
- **📹 Video Analytics**: Browse and analyze recent videos from any channel with detailed performance metrics
- **🤖 AI-Powered Insights**: Leverage Groq AI to analyze content patterns, themes, and generate video ideas
- **💾 Smart Caching**: 24-hour client-side and server-side caching to minimize API calls and improve performance
- **📈 Google Sheets Integration**: Save and export analysis data directly to Google Sheets

### Key Capabilities

#### Channel Analysis (`/analyze`)
- Extract channel information from URLs, handles (@username), or direct channel IDs
- Display subscriber count, total views, video count, and average views per video
- Categorize videos into:
  - All videos
  - Shorts (#shorts or vertical format)
  - Full-length videos
  - Trending (last 7 days performance)
  - Live/upcoming streams
- AI-powered content analysis including:
  - Theme identification
  - Effective tags discovery
  - Video type classification
  - Length and posting pattern analysis
  - Automated video idea generation

#### Channel Comparison (`/compare`)
- Compare multiple channels simultaneously (comma-separated input)
- Side-by-side metrics display:
  - Subscribers
  - Total views
  - Video count
  - Average views per video
- Toggle between latest and most popular videos for each channel
- AI analysis across all compared channels to identify:
  - Trending content types
  - Reach-gaining strategies
  - Engagement patterns
  - 10 actionable video topic suggestions

#### Channel Search (`/search`)
- Search YouTube channels by keywords, topics, or names
- Display search results with:
  - Channel thumbnails
  - Subscriber counts
  - Video counts
  - Channel descriptions
- Quick navigation to detailed channel analysis
- Popular search suggestions for common categories

#### Video Browser (`/videos`)
- Fetch latest videos from any channel
- Display video thumbnails, titles, and upload dates
- Direct links to YouTube videos

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** (Pages Router) - React framework with Turbopack
- **React 19.1** - UI library
- **TypeScript** - Type safety
- **TailwindCSS 3.4** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend & APIs
- **Next.js API Routes** - Serverless API endpoints
- **YouTube Data API v3** - Channel and video data retrieval
- **Groq SDK** - AI-powered content analysis using Llama models
- **Google Sheets API** - Data persistence and export

### Caching Strategy
- **Client-side**: localStorage with 24-hour expiry
- **Server-side**: File-based caching in `/public/cache/`
- **Request deduplication**: Pending request tracking to prevent duplicate API calls

## 📁 Project Structure

```
/workspace
├── components/
│   ├── GoogleAuth.js          # Google OAuth authentication component
│   └── Nav.js                 # Navigation component
├── lib/
│   ├── cache.js               # Client-side caching utilities (localStorage)
│   ├── server-cache.js        # Server-side caching utilities (file-based)
│   ├── sheets.js              # Google Sheets integration
│   ├── youtube.js             # YouTube API client functions
│   └── youtube.new.js         # Alternative YouTube API implementation
├── pages/
│   ├── index.tsx              # Home page with feature cards
│   ├── analyze.js             # Channel analysis page
│   ├── compare.js             # Channel comparison page
│   ├── search.js              # Channel search page
│   ├── videos.js              # Video browser page
│   └── api/
│       ├── analyze-channel.js # AI analysis endpoint using Groq
│       ├── analyze-compare.js # Comparison analysis endpoint
│       ├── analyze-channel-new.js # Alternative analysis endpoint
│       ├── cache.js           # Cache management API
│       └── hello.ts           # Default Next.js API route
├── scripts/
│   └── check-cache.js         # Cache inspection utility
├── public/
│   └── cache/                 # Server-side cache storage directory
├── styles/
│   ├── globals.css            # Global styles and Tailwind directives
│   └── Home.module.css        # Home page specific styles
├── next.config.ts             # Next.js configuration
├── tailwind.config.js         # TailwindCSS configuration
├── postcss.config.js          # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 20+ 
- npm, yarn, pnpm, or bun
- YouTube Data API v3 key
- Groq API key
- Google Cloud project (for Sheets integration)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd youtube-analyzer-next
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# YouTube Data API
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key_here

# Groq AI
groq_api_key=your_groq_api_key_here
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_GROQ_MODEL=llama-3.1-8b-instant

# Google Sheets (Optional)
# The default client ID and sheet ID are configured in lib/sheets.js
# You can override them here if needed
```

### 4. Obtain API Keys

#### YouTube Data API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. Copy the API key to your `.env.local`

#### Groq API
1. Visit [Groq Cloud Console](https://console.groq.com/)
2. Sign up or log in
3. Create an API key
4. Copy the key to your `.env.local`

#### Google Sheets (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Sheets API"
3. Create OAuth 2.0 credentials
4. Update `CLIENT_ID` in `lib/sheets.js`
5. Create a Google Sheet and update `SHEET_ID` in `lib/sheets.js`

### 5. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage Guide

### Analyzing a Channel

1. Navigate to **Analyze Channel** from the home page
2. Enter one of the following:
   - YouTube channel URL (e.g., `https://youtube.com/channel/UC...`)
   - Channel handle (e.g., `@MrBeast`)
   - Channel name (e.g., `MrBeast`)
   - Direct channel ID (e.g., `UCX6OQ3DkcsbYNE6H8uQQuVA`)
3. Click **Analyze**
4. View comprehensive channel statistics and video breakdown
5. Switch between tabs: All, Shorts, Full, Trending, Live
6. Click **Run AI Analysis** to get insights and video ideas

### Comparing Channels

1. Navigate to **Compare Channels**
2. Enter multiple channels separated by commas:
   ```
   @MrBeast, @PewDiePie, @T-Series
   ```
3. Click **Compare**
4. Review side-by-side metrics
5. Toggle between Latest and Popular videos for each channel
6. Click **Analyze All Channels** for AI-powered comparative insights

### Searching Channels

1. Navigate to **Search Channels**
2. Enter keywords, topics, or channel names
3. Click **Search**
4. Browse results with subscriber counts and video counts
5. Click **Analyze Channel** on any result for detailed analysis

### Browsing Videos

1. Navigate to **Search Videos**
2. Enter channel URL, handle, or name
3. Click **Search Videos**
4. View recent videos with thumbnails and upload dates

## 🔌 API Endpoints

### POST `/api/analyze-channel`

Analyzes channel videos using Groq AI.

**Request Body:**
```json
{
  "videos": [...],  // Array of video objects with snippet and statistics
  "channelName": "Channel Name"
}
```

**Response:**
```json
{
  "themes": ["theme1", "theme2"],
  "effectiveTags": ["tag1", "tag2"],
  "videoTypes": ["type1", "type2"],
  "lengthPatterns": "Pattern description",
  "postingPatterns": "Pattern description",
  "videoIdeas": [
    {
      "title": "Video title suggestion",
      "description": "Brief description",
      "suggestedTags": ["tag1", "tag2"]
    }
  ]
}
```

### POST `/api/analyze-compare`

Compares multiple channels using AI analysis.

### GET/POST `/api/cache`

Manages server-side cache operations.

## 💾 Caching System

### Client-Side Cache (lib/cache.js)
- Uses browser localStorage
- 24-hour expiration
- Automatic cleanup of expired entries
- Pending request tracking to prevent duplicates
- Cache keys prefixed with `yt_analyzer_`

### Server-Side Cache (lib/server-cache.js)
- File-based caching in `/public/cache/`
- 24-hour expiration
- JSON file storage per channel ID
- Automatic cleanup on read

### Cache Benefits
- Reduced API quota usage
- Faster response times for repeated queries
- Offline capability for previously viewed channels
- Rate limit protection

## 🔐 Authentication

### Google Authentication
The app includes optional Google Sign-In for:
- Personalized features
- Google Sheets integration
- Saving comparisons and analysis results

Authentication is handled via `GoogleAuth.js` component using Google OAuth 2.0.

## 🎨 UI/UX Features

- **Gradient Backgrounds**: Modern gradient themes with animated blob effects
- **Glassmorphism**: Backdrop blur effects on cards and modals
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Loading States**: Skeleton screens and spinners during data fetching
- **Error Handling**: User-friendly error messages with retry options
- **Hover Effects**: Smooth transitions and scale animations on interactive elements
- **Dark Theme**: Default dark mode optimized for analytics dashboards

## 📝 Scripts

Available npm scripts:

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🚨 Error Handling

The application includes comprehensive error handling for:
- Invalid channel URLs or IDs
- API rate limits and quota exceeded
- Network failures
- Missing or invalid API keys
- Cache corruption
- AI analysis failures (graceful degradation)

## 🔒 Security Considerations

- API keys should be stored in environment variables only
- Client-side API keys (prefixed with `NEXT_PUBLIC_`) are exposed to browser - implement rate limiting
- Server-side API keys remain secure on the server
- CORS headers configured for API routes
- Input sanitization for channel IDs and search queries

## 📊 Performance Optimizations

- **Lazy Loading**: Components load on demand
- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component ready
- **Caching**: Multi-layer caching strategy
- **Request Deduplication**: Prevents simultaneous identical requests
- **Chunked Processing**: Large video lists processed in chunks for AI analysis

## 🧪 Testing & Debugging

### Check Cache
```bash
node scripts/check-cache.js
```

### Browser DevTools
- Inspect localStorage for cached data
- Monitor network requests
- Check console for API errors

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Add environment variables in Vercel dashboard.

### Other Platforms

```bash
npm run build
npm start
```

Ensure environment variables are set in production environment.

## 📋 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API key | Yes |
| `groq_api_key` | Groq API key (server-side) | Yes |
| `NEXT_PUBLIC_GROQ_API_KEY` | Groq API key (client-side) | Yes |
| `NEXT_PUBLIC_GROQ_MODEL` | Groq model to use | No (default: llama-3.1-8b-instant) |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [Groq](https://groq.com) - AI inference platform
- [YouTube Data API](https://developers.google.com/youtube/v3) - Video platform API
- [TailwindCSS](https://tailwindcss.com) - Styling framework
- [Lucide Icons](https://lucide.dev) - Icon library

## 📞 Support

For issues and questions:
- Check existing documentation
- Review error messages in browser console
- Verify API keys are valid and have sufficient quota
- Ensure environment variables are correctly configured

---

**Built with ❤️ using Next.js and Groq AI**
