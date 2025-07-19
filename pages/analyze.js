import { useState } from 'react';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

// Helper to extract channel ID from input (URL or direct ID)
function extractChannelId(input) {
  try {
    const url = new URL(input);
    if (url.pathname.startsWith('/channel/')) {
      return url.pathname.split('/')[2];
    }
    if (url.pathname.startsWith('/user/')) {
      return url.pathname.split('/')[2];
    }
    if (url.pathname.startsWith('/c/')) {
      return url.pathname.split('/')[2];
    }
    if (url.pathname.startsWith('/@')) {
      return url.pathname.split('/')[1];
    }
  } catch (e) {
    if (input.startsWith('@')) return input.slice(1);
    return input;
  }
  return input;
}

export default function Analyze() {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setChannel(null);
    setVideos([]);
    setSelectedVideo(null);
    setLoading(true);
    setSubmitted(input);
    const channelIdOrName = extractChannelId(input.trim());
    try {
      // Try fetching by channel ID first
      let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIdOrName}&key=${YOUTUBE_API_KEY}`;
      let res = await fetch(url);
      let data = await res.json();
      let channelData = null;
      if (data.items && data.items.length > 0) {
        channelData = data.items[0];
      } else {
        // Try by username
        url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${channelIdOrName}&key=${YOUTUBE_API_KEY}`;
        res = await fetch(url);
        data = await res.json();
        if (data.items && data.items.length > 0) {
          channelData = data.items[0];
        }
      }
      if (!channelData) {
        setError('Channel not found. Please check the URL or ID.');
        setLoading(false);
        return;
      }
      setChannel(channelData);
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
        return;
      }
      // Fetch videos from uploads playlist
      url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=30&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;
      res = await fetch(url);
      data = await res.json();
      if (!data.items) {
        setError('Could not fetch videos for this channel.');
        setLoading(false);
        return;
      }
      // Fetch video details (statistics, etc.)
      const videoIds = data.items.map(item => item.snippet.resourceId.videoId).join(',');
      url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      res = await fetch(url);
      const videosData = await res.json();
      setVideos(videosData.items || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch channel or video data.');
      setLoading(false);
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
            <div className="bg-red-900/20 border border-red-500/50 backdrop-blur-sm rounded-xl p-4 text-red-400 text-center">
              <span className="inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Channel Info */}
        {channel && (
          <div className="max-w-5xl mx-auto mb-16">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <img
                  src={channel.snippet.thumbnails.high.url}
                  alt={channel.snippet.title}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full ring-4 ring-red-500/50 shadow-xl mx-auto md:mx-0"
                />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold mb-3">{channel.snippet.title}</h2>
                  {/* Show full description */}
                  <p className="text-gray-400 mb-6 whitespace-pre-wrap">{channel.snippet.description}</p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-red-400">
                        {Number(channel.statistics.subscriberCount).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Subscribers</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-blue-400">
                        {Number(channel.statistics.videoCount).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Videos</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {Number(channel.statistics.viewCount).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider">Total Views</div>
                    </div>
                  </div>
                  
                  <a
                    href={`https://www.youtube.com/channel/${channel.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-300"
                    >
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
                Latest Videos
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(video => (
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
                      src={video.snippet.thumbnails.medium.url}
                      alt={video.snippet.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <h4 className="font-semibold text-lg mb-2 group-hover:text-red-400 transition-colors">
                      {video.snippet.title}
                    </h4>
                    
                    {/* Quick Stats */}
                    {!selectedVideo || selectedVideo !== video.id ? (
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {Number(video.statistics.viewCount).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {Number(video.statistics.likeCount || 0).toLocaleString()}
                        </span>
                      </div>
                    ) : null}
                    
                    {/* Expanded Details */}
                    {selectedVideo === video.id && (
                      <div className="mt-4 space-y-3 text-sm animate-in slide-in-from-top-2">
                        {/* Full Description */}
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Description</div>
                          <p className="text-gray-300 whitespace-pre-wrap">
                            {video.snippet.description || 'No description available'}
                          </p>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Published</div>
                            <div className="text-white font-medium">
                              {new Date(video.snippet.publishedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Views</div>
                            <div className="text-white font-medium">
                              {Number(video.statistics.viewCount).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Likes</div>
                            <div className="text-white font-medium">
                              {Number(video.statistics.likeCount || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-2">
                            <div className="text-gray-500 text-xs">Comments</div>
                            <div className="text-white font-medium">
                              {Number(video.statistics.commentCount || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        {/* All Tags */}
                        {video.snippet.tags && video.snippet.tags.length > 0 && (
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
                            <span className="text-gray-300 text-xs">{video.snippet.categoryId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-xs">Default Language</span>
                            <span className="text-gray-300 text-xs">{video.snippet.defaultLanguage || 'Not specified'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-xs">Default Audio Language</span>
                            <span className="text-gray-300 text-xs">{video.snippet.defaultAudioLanguage || 'Not specified'}</span>
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
          </div>
        )}
      </div>
    </div>
  );
}