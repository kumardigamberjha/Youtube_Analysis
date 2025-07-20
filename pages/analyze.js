import { useState, useEffect } from 'react';
import { pendingRequests } from '../lib/cache';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

// Function to clear old cache entries from localStorage
function clearOldCache() {
  const now = new Date();
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('yt_analyzer_')) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        const cacheTime = new Date(item.timestamp);
        if (now.getTime() - cacheTime.getTime() > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // If entry is invalid, remove it
        localStorage.removeItem(key);
      }
    }
  });
}

// Helper to extract channel ID from input (URL or direct ID)
function extractChannelId(input) {
  try {
    // Clean up the input
    const cleanInput = input.trim();
    
    // Handle direct channel IDs (UC...)
    if (cleanInput.startsWith('UC') && cleanInput.length >= 24) {
      return cleanInput;
    }

    // Handle @username format
    if (cleanInput.startsWith('@')) {
      return cleanInput.slice(1);
    }

    // Try parsing as URL
    let url;
    try {
      // If input doesn't start with http/https, prepend https://
      if (!cleanInput.startsWith('http')) {
        url = new URL(`https://${cleanInput}`);
      } else {
        url = new URL(cleanInput);
      }
    } catch {
      // If not a valid URL and not starting with @, return as is
      return cleanInput;
    }

    // Normalize the hostname
    if (!url.hostname.includes('youtube.com')) {
      url = new URL(`https://youtube.com${url.pathname}`);
    }

    // Extract ID from various URL formats
    if (url.pathname.includes('/channel/')) {
      return url.pathname.split('/channel/')[1]?.split('/')[0];
    }
    if (url.pathname.includes('/c/')) {
      return url.pathname.split('/c/')[1]?.split('/')[0];
    }
    if (url.pathname.includes('/user/')) {
      return url.pathname.split('/user/')[1]?.split('/')[0];
    }
    if (url.pathname.includes('/@')) {
      return url.pathname.split('/@')[1]?.split('/')[0];
    }
    
    // If no matches found, return cleaned input
    return cleanInput;
  } catch (e) {
    console.error('Error extracting channel ID:', e);
    return input.trim();
  }
}

export default function Analyze() {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState('');
  const [currentChannelId, setCurrentChannelId] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [categorizedVideos, setCategorizedVideos] = useState({
    all: [],
    shorts: [],
    full: [],
    trending: [], // Changed from popular/mostViewed to trending (last 7 days performance)
    live: [] // Added live/upcoming streams category
  });

  // Clean up old cache entries and pending requests when component mounts/unmounts
  useEffect(() => {
    // Clean up old cache entries from localStorage
    try {
      clearOldCache();
    } catch (error) {
      console.error('Error cleaning up localStorage cache:', error);
    }

    // Cleanup function to clear pending requests on unmount or channel change
    return () => {
      if (currentChannelId) {
        pendingRequests.delete(currentChannelId);
        pendingRequests.delete(`${currentChannelId}_videos`);
        pendingRequests.delete(`channel_id_${currentChannelId}`);
      }
    };
  }, [currentChannelId]);

  // Categorize videos when videos array changes
  useEffect(() => {
    if (videos.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const categorized = {
        all: videos,
        shorts: videos.filter(video => {
          const isShort = video.snippet?.title?.toLowerCase().includes('#shorts') ||
            (video.snippet?.thumbnails?.maxres?.height > video.snippet?.thumbnails?.maxres?.width);
          return isShort;
        }),
        full: videos.filter(video => {
          const isShort = video.snippet?.title?.toLowerCase().includes('#shorts') ||
            (video.snippet?.thumbnails?.maxres?.height > video.snippet?.thumbnails?.maxres?.width);
          return !isShort;
        }),
        trending: videos.filter(video => {
          // Videos from last 7 days, sorted by views
          const publishDate = new Date(video.snippet?.publishedAt);
          return publishDate >= sevenDaysAgo;
        }).sort((a, b) => 
          (Number(b.statistics?.viewCount) || 0) - (Number(a.statistics?.viewCount) || 0)
        ),
        live: videos.filter(video => 
          video.snippet?.liveBroadcastContent === 'live' || 
          video.snippet?.liveBroadcastContent === 'upcoming'
        )
      };
      setCategorizedVideos(categorized);
    }
  }, [videos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions while loading
    if (loading) return;
    
    const channelIdOrName = extractChannelId(input.trim());
    console.log('Extracted channel ID/name:', channelIdOrName);
    
    // Check for any pending requests for this channel
    const isPending = Array.from(pendingRequests.keys()).some(key => {
      try {
        return key.includes(channelIdOrName) || channelIdOrName.includes(key);
      } catch (e) {
        return false;
      }
    });

    if (isPending) {
      console.log('Request already in progress for channel:', channelIdOrName);
      return;
    }

    // Reset states before starting
    setError('');
    setChannel(null);
    setVideos([]);
    setSelectedVideo(null);
    setLoading(true);
    setSubmitted(input);
    setCurrentChannelId(channelIdOrName);
    
    // Add to pending requests with timestamp
    const requestKey = `${channelIdOrName}_${Date.now()}`;
    pendingRequests.set(requestKey, true);

    try {
      // Check all possible cache keys
      const possibleKeys = [
        `yt_analyzer_${channelIdOrName}`,
        `yt_analyzer_UC${channelIdOrName}`, // For partial channel IDs
        ...Object.keys(localStorage).filter(key => 
          key.startsWith('yt_analyzer_') && 
          localStorage.getItem(key).includes(channelIdOrName)
        )
      ];

      // Try to find valid cache
      for (const key of possibleKeys) {
        const cachedDataStr = localStorage.getItem(key);
        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr);
            const cacheTime = new Date(cachedData.timestamp);
            const now = new Date();
            
            // Check if cache is less than 24 hours old
            if (now.getTime() - cacheTime.getTime() < 24 * 60 * 60 * 1000) {
              console.log('Using cached data from key:', key);
              setChannel(cachedData.data.channel);
              setVideos(cachedData.data.videos);
              setAnalysis(cachedData.data.analysis || null);
              setNextPageToken(cachedData.data.nextPageToken || '');
              setLoading(false);
              pendingRequests.delete(channelIdOrName);
              return;
            } else {
              console.log('Cache expired for key:', key);
              localStorage.removeItem(key);
            }
          } catch (e) {
            console.error('Error parsing cache for key:', key, e);
            localStorage.removeItem(key);
          }
        }
      }

      // If no cache, fetch from API
      let channelData = null;
      
      // Try searching by channel ID first
      let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIdOrName}&key=${YOUTUBE_API_KEY}`;
      let res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch channel data');
      }
      let data = await res.json();
      console.log('Channel API response:', data);
      
      if (data.items && data.items.length > 0) {
        channelData = data.items[0];
      } else {
        // If no results, try searching by username
        url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=${channelIdOrName}&key=${YOUTUBE_API_KEY}`;
        res = await fetch(url);
        data = await res.json();
        
        if (data.items && data.items.length > 0) {
          channelData = data.items[0];
        } else {
          // If still no results, try searching by custom URL or handle
          url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelIdOrName}&key=${YOUTUBE_API_KEY}`;
          res = await fetch(url);
          data = await res.json();
          
          if (data.items && data.items.length > 0) {
            // Get the channel ID from search results and fetch full channel data
            const channelId = data.items[0].id.channelId;
            url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
            res = await fetch(url);
            data = await res.json();
            
            if (data.items && data.items.length > 0) {
              channelData = data.items[0];
            }
          }
        }
      }

      if (!channelData) {
        setError('Channel not found. Please check the URL or ID.');
        setLoading(false);
        pendingRequests.delete(channelIdOrName);
        return;
      }

      // Fetch latest 30 videos
      const uploadsPlaylistId = channelData.contentDetails?.relatedPlaylists?.uploads;
      let playlistId = uploadsPlaylistId;
      
      if (!playlistId) {
        // Need to fetch contentDetails
        url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelData.id}&key=${YOUTUBE_API_KEY}`;
        res = await fetch(url);
        data = await res.json();
        playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      }

      if (!playlistId) {
        setError('Could not find uploads playlist for this channel.');
        setLoading(false);
        pendingRequests.delete(channelIdOrName);
        return;
      }

      // Fetch videos from uploads playlist
      url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=30&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;
      res = await fetch(url);
      data = await res.json();

      if (!data.items) {
        setError('Could not fetch videos for this channel.');
        setLoading(false);
        pendingRequests.delete(channelIdOrName);
        return;
      }

      // Store next page token for loading more videos later
      setNextPageToken(data.nextPageToken || '');

      // Fetch video details (statistics, etc.)
      const videoIds = data.items?.map(item => item.snippet?.resourceId?.videoId).filter(Boolean).join(',');
      if (!videoIds) {
        setError('Could not process video IDs.');
        setLoading(false);
        pendingRequests.delete(channelIdOrName);
        return;
      }
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      res = await fetch(url);
      const videosData = await res.json();
      const videos = videosData?.items || [];

      // Save to localStorage with all relevant identifiers
      const cacheData = {
        data: {
          channel: channelData,
          videos: videos,
          nextPageToken: data.nextPageToken || '',
          searchIdentifiers: [
            channelIdOrName,
            channelData.id,
            channelData.snippet?.customUrl,
            `@${channelData.snippet?.customUrl}`
          ].filter(Boolean)
        },
        timestamp: new Date().toISOString()
      };
      
      try {
        // Save with the canonical channel ID
        const cacheKey = `yt_analyzer_${channelData.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('Cache saved to localStorage with key:', cacheKey);
        
        // Clear any old caches for this channel using different keys
        Object.keys(localStorage)
          .filter(key => key.startsWith('yt_analyzer_') && key !== cacheKey)
          .forEach(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              if (data?.data?.channel?.id === channelData.id) {
                localStorage.removeItem(key);
              }
            } catch (e) {}
          });
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        // If localStorage is full, clear old items
        try {
          clearOldCache();
          localStorage.setItem(`yt_analyzer_${channelData.id}`, JSON.stringify(cacheData));
        } catch (e) {
          console.error('Failed to save even after clearing cache:', e);
        }
      }

      setChannel(channelData);
      setVideos(videos);
      setLoading(false);
      pendingRequests.delete(channelIdOrName);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch channel or video data.');
      setLoading(false);
      pendingRequests.delete(channelIdOrName);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
            YouTube Channel Analyzer
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover insights, performance metrics, and video trends from any YouTube channel
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-12">
          <div className="relative group">
            <input
              type="text"
              placeholder="Enter YouTube Channel URL, ID, or @handle"
              className="w-full px-6 py-4 pr-32 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-lg placeholder-gray-500 transition-all duration-300"
              value={input}
              onChange={e => setInput(e.target.value)}
              required
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing
                </span>
              ) : 'Analyze'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-900/20 border border-red-500/50 backdrop-blur-sm rounded-xl p-4 text-red-400">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Error:</span>
              </div>
              <div className="text-sm ml-7">
                <p>{error}</p>
                <p className="mt-2 text-red-400/80 text-xs">
                  If this error persists, please check the console for more details or try again later.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Channel Info */}
        {channel && channel.snippet && (
          <div className="max-w-5xl mx-auto mb-16">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <img
                  src={channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url}
                  alt={channel.snippet?.title}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full ring-4 ring-red-500/50 shadow-xl mx-auto md:mx-0"
                />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold mb-3">{channel.snippet?.title}</h2>
                  {/* Show full description */}
                  <p className="text-gray-400 mb-6 whitespace-pre-wrap">{channel.snippet?.description || 'No description available'}</p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-red-400">
                        {Number(channel.statistics?.subscriberCount || 0).toLocaleString()}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Subscribers</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-blue-400">
                        {Number(channel.statistics?.videoCount || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Videos</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {Number(channel.statistics?.viewCount || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Total Views</div>
                    </div>
                  </div>
                  
                  <a
                    href={`https://www.youtube.com/channel/${channel.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-300"                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    View on YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Videos Grid */}
        {videos.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold mb-8 text-center">
              <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                Channel Videos
              </span>
            </h3>
            
            {/* Video Category Tabs */}
            <div className="flex justify-center mb-8 overflow-x-auto">
              <div className="inline-flex bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-1">
                {[
                  { id: 'all', label: 'All Videos', count: categorizedVideos.all.length },
                  { id: 'full', label: 'Full Videos', count: categorizedVideos.full.length },
                  { id: 'shorts', label: 'Shorts', count: categorizedVideos.shorts.length },
                  { id: 'trending', label: 'Trending', count: categorizedVideos.trending.length },
                  { id: 'live', label: 'Live & Upcoming', count: categorizedVideos.live.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorizedVideos[activeTab].filter(video => video && video.snippet).map(video => (
                <div
                  key={video.id}
                  className={`group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 cursor-pointer ${
                    selectedVideo === video.id ? 'ring-2 ring-red-500' : ''
                  }`}
                  onClick={() => setSelectedVideo(selectedVideo === video.id ? null : video.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url}
                      alt={video.snippet?.title || 'Video thumbnail'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <h4 className="font-semibold text-lg mb-2 group-hover:text-red-400 transition-colors">
                      {video.snippet?.title || 'Untitled'}
                    </h4>
                    
                    {/* Quick Stats */}
                    {(!selectedVideo || selectedVideo !== video.id) && video.statistics && (
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {Number(video.statistics?.viewCount || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {Number(video.statistics?.likeCount || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {/* Expanded Details */}
                    {selectedVideo === video.id && (
                      <div className="mt-4 space-y-3 text-sm animate-in slide-in-from-top-2">
                        {/* Full Description */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Description</div>
                          <p className="text-gray-300 whitespace-pre-wrap">
                            {video.snippet?.description || 'No description available'}
                          </p>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Published</div>
                            <div className="text-white font-medium">
                              {new Date(video.snippet?.publishedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Views</div>
                            <div className="text-white font-medium">
                              {Number(video.statistics?.viewCount || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Likes</div>
                            <div className="text-white font-medium">
                              {Number(video.statistics?.likeCount || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Comments</div>
                            <div className="text-white font-medium">
                              {Number(video.statistics?.commentCount || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        {/* All Tags */}
                        {video.snippet?.tags && video.snippet.tags.length > 0 && (
                          <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">
                              Keywords ({video.snippet.tags.length} tags)
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {video.snippet.tags.map((tag, index) => (
                                <span 
                                  key={index} 
                                  className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full hover:bg-gray-600 transition-colors"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Additional Info */}
                        <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-xs">Category</span>
                            <span className="text-gray-300 text-xs">{video.snippet?.categoryId || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-xs">Default Language</span>
                            <span className="text-gray-300 text-xs">{video.snippet?.defaultLanguage || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-xs">Default Audio Language</span>
                            <span className="text-gray-300 text-xs">{video.snippet?.defaultAudioLanguage || 'Not specified'}</span>
                          </div>
                        </div>
                        
                        <a
                          href={`https://www.youtube.com/watch?v=${video.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 rounded-lg font-medium hover:from-red-700 hover:to-pink-700 transition-all duration-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Watch on YouTube
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-center gap-4">
              {nextPageToken && (
                <button
                  onClick={async () => {
                    setIsLoadingMore(true);
                    try {
                      // Fetch next page of videos
                      let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=30&playlistId=${channel.contentDetails?.relatedPlaylists?.uploads}&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`;
                      let res = await fetch(url);
                      let data = await res.json();

                      if (data.items) {
                        // Fetch video details (statistics, etc.)
                        const videoIds = data.items?.map(item => item.snippet?.resourceId?.videoId).filter(Boolean).join(',');
                        url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
                        res = await fetch(url);
                        const videosData = await res.json();
                        const newVideos = videosData?.items || [];

                        // Update videos state and next page token
                        const updatedVideos = [...videos, ...newVideos];
                        setVideos(updatedVideos);
                        setNextPageToken(data.nextPageToken || '');

                        // Update cache with new videos
                        const updatedCacheData = {
                          channel,
                          videos: updatedVideos,
                          nextPageToken: data.nextPageToken || ''
                        };
                        saveToCache(currentChannelId, updatedCacheData);
                      }
                    } catch (err) {
                      console.error('Error loading more videos:', err);
                      setError('Failed to load more videos.');
                    } finally {
                      setIsLoadingMore(false);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading More...
                    </span>
                  ) : (
                    'Load More Videos'
                  )}
                </button>
              )}

              {/* Analyze Channel Button */}
              <button
                onClick={async () => {
                  setIsAnalyzing(true);
                  setError('');
                  try {
                    // Check if analysis is already cached
                    const cachedData = await getCachedData(currentChannelId);
                    if (cachedData?.analysis) {
                      console.log('Using cached analysis for channel:', currentChannelId);
                      setAnalysis(cachedData.analysis);
                      setShowAnalysis(true);
                      setIsAnalyzing(false);
                      return;
                    }

                    console.log('Starting channel analysis...');
                    const response = await fetch('/api/analyze-channel', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        videos: videos,
                        channelName: channel.snippet.title
                      }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.message || 'Failed to analyze channel');
                    }

                    if (!data || typeof data !== 'object') {
                      throw new Error('Invalid response from analysis');
                    }

                    console.log('Analysis completed:', data);
                    setAnalysis(data);
                    setShowAnalysis(true);

                    // Save the analysis to cache
                    const updatedCacheData = {
                      channel,
                      videos,
                      analysis: data,
                      nextPageToken: nextPageToken || ''
                    };
                    await saveToCache(currentChannelId, updatedCacheData);
                  } catch (err) {
                    console.error('Error analyzing channel:', err);
                    setError(err.message || 'Failed to analyze channel. Please try again.');
                    
                    // Log detailed error information
                    if (err.response) {
                      console.error('Response status:', err.response.status);
                      console.error('Response data:', err.response.data);
                    }
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing Channel...
                  </span>
                ) : (
                  'Analyze Channel'
                )}
              </button>
            </div>

            {/* Analysis Modal */}
            {showAnalysis && analysis && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Channel Analysis
                    </h3>
                    <button
                      onClick={() => setShowAnalysis(false)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Themes */}
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-purple-400">Top Performing Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.themes.map((theme, index) => (
                          <span key={index} className="px-3 py-1 bg-purple-500/20 rounded-full text-sm">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Effective Tags */}
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-blue-400">Most Effective Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.effectiveTags.map((tag, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-500/20 rounded-full text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Video Types */}
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-purple-400">Best Performing Video Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.videoTypes.map((type, index) => (
                          <span key={index} className="px-3 py-1 bg-purple-500/20 rounded-full text-sm">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Patterns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/50 rounded-xl p-4">
                        <h4 className="font-semibold mb-2 text-blue-400">Length Patterns</h4>
                        <p className="text-gray-300">{analysis.lengthPatterns}</p>
                      </div>
                      <div className="bg-gray-700/50 rounded-xl p-4">
                        <h4 className="font-semibold mb-2 text-purple-400">Posting Patterns</h4>
                        <p className="text-gray-300">{analysis.postingPatterns}</p>
                      </div>
                    </div>

                    {/* Video Ideas */}
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <h4 className="font-semibold mb-4 text-2xl bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Recommended Video Ideas
                      </h4>
                      <div className="space-y-4">
                        {analysis.videoIdeas.map((idea, index) => (
                          <div key={index} className="bg-gray-800/50 rounded-xl p-4">
                            <h5 className="font-semibold text-lg mb-2 text-blue-400">{idea.title}</h5>
                            <p className="text-gray-300 mb-3">{idea.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {idea.suggestedTags.map((tag, tagIndex) => (
                                <span key={tagIndex} className="px-2 py-1 bg-blue-500/10 rounded-full text-xs text-blue-300">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}