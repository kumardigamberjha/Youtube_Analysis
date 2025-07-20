import React, { useState } from 'react';
import { getChannelIdFromUrl, getChannelStats } from '../lib/youtube';
import { useRef } from 'react';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function Compare() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [channelVideos, setChannelVideos] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [loadingVideos, setLoadingVideos] = useState({});
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const analysisButtonRef = useRef();

  const CHUNK_SIZE = 20;

  function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  // Fetches channel videos (latest or popular)
  const fetchChannelVideos = async (channelId) => {
    try {
      setLoadingVideos((prev) => ({ ...prev, [channelId]: true }));

      let url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
      let res = await fetch(url);
      let data = await res.json();

      const playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!playlistId) {
        console.error('No uploads playlist found for channel:', channelId);
        setLoadingVideos((prev) => ({ ...prev, [channelId]: false }));
        return { latest: [], popular: [] };
      }

      url = ` https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=30&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;
      res = await fetch(url);
      data = await res.json();

      if (!data.items || data.items.length === 0) {
        console.warn('No playlist items found for channel:', channelId);
        setLoadingVideos((prev) => ({ ...prev, [channelId]: false }));
        return { latest: [], popular: [] };
      }

      const videoIds = data.items
        .map((item) => item.snippet.resourceId.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) {
        setLoadingVideos((prev) => ({ ...prev, [channelId]: false }));
        return { latest: [], popular: [] };
      }

      url = ` https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      res = await fetch(url);
      const videosData = await res.json();

      const latestVideos = videosData.items?.filter(Boolean) || [];

      const popularVideos = [...latestVideos]
        .sort(
          (a, b) =>
            Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0)
        )
        .slice(0, 10);

      setLoadingVideos((prev) => ({ ...prev, [channelId]: false }));

      return { latest: latestVideos, popular: popularVideos };
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setLoadingVideos((prev) => ({ ...prev, [channelId]: false }));
      return { latest: [], popular: [] };
    }
  };

  // Handle form submission
  const handleCompare = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setChannelVideos({});
    setActiveTab({});
    setLoadingVideos({});

    const channels = input.split(',').map((s) => s.trim()).filter(Boolean);
    const out = [];

    // First, fetch all channel stats
    for (const ch of channels) {
      const channelId = await getChannelIdFromUrl(ch);
      if (!channelId) continue;
      const stats = await getChannelStats(channelId);
      out.push(stats);
      setActiveTab((prev) => ({ ...prev, [channelId]: 'latest' }));
    }

    setResults(out);
    setLoading(false);

    // Then fetch videos for each channel asynchronously
    for (const channel of out) {
      fetchChannelVideos(channel.id).then((videos) => {
        setChannelVideos((prev) => ({ ...prev, [channel.id]: videos }));
      });
    }
  };

  // Helper to gather all video data for analysis
  const gatherAllVideos = () => {
    let allVideos = [];
    Object.values(channelVideos).forEach((vids) => {
      if (vids && vids.latest) {
        allVideos = allVideos.concat(vids.latest);
      }
    });
    return allVideos;
  };

  // Handler for Analyze button
  const handleAnalyze = async () => {
    setShowAnalysis(true);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    const allVideos = gatherAllVideos();
    if (!allVideos.length) {
      setAnalysisResult('No videos to analyze.');
      setAnalysisLoading(false);
      return;
    }

    // 1. Split into chunks
    const videoChunks = chunkArray(allVideos, CHUNK_SIZE);
    let chunkResults = [];

    for (let i = 0; i < videoChunks.length; i++) {
      const chunk = videoChunks[i];
      const prompt = `You are a YouTube channel analyst. Given the following video data (title, description, stats), analyze:\n1. Which type of video is working best (trending)?\n2. Which type is gaining reach?\n3. Which type is gaining attention (engagement)?\n\nVideo data:\n${chunk.map(v => `Title: ${v.snippet.title}\nDescription: ${v.snippet.description || ''}\nViews: ${v.statistics?.viewCount || 0}\nLikes: ${v.statistics?.likeCount || 0}\nComments: ${v.statistics?.commentCount || 0}`).join('\n---\n')}`;

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.NEXT_PUBLIC_GROQ_MODEL || 'llama3-70b-8192',
            messages: [
              { role: 'system', content: 'You are a YouTube channel analyst.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1024,
          }),
        });
        const data = await res.json();
        chunkResults.push(data.choices?.[0]?.message?.content || '');
      } catch (err) {
        chunkResults.push('Failed to analyze this chunk.');
      }
    }

    // 2. Summarize all chunk results and generate 10 video topic suggestions
    const summaryPrompt = `Given the following analyses of YouTube video data chunks, summarize the overall trends and suggest 10 new video topics that should gain user attention:\n\n${chunkResults.join('\n---\n')}`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_GROQ_MODEL || 'llama3-70b-8192',
          messages: [
            { role: 'system', content: 'You are a YouTube channel analyst.' },
            { role: 'user', content: summaryPrompt },
          ],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      setAnalysisResult(data.choices?.[0]?.message?.content || 'No analysis result.');
    } catch (err) {
      setAnalysisResult('Failed to summarize analysis.');
    }
    setAnalysisLoading(false);
  };

  // Format large numbers into K, M
  const formatNumber = (num) => {
    const value = Number(num);
    if (isNaN(value)) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Compare YouTube Channels
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Compare multiple YouTube channels side by side with detailed analytics and video insights
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleCompare} className="max-w-3xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter channel URLs, @handles, or names (comma separated)"
              className="w-full px-6 py-4 pr-32 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-lg placeholder-gray-500 transition-all duration-300"
              required
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Comparing
                </span>
              ) : 'Compare'}
            </button>
          </div>
        </form>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-8">
            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {results.map((channel) => (
                <div
                  key={channel.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="text-center mb-4">
                    <img
                      src={channel.profile_image}
                      alt={channel.name}
                      className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-blue-500/30"
                    />
                    <h3 className="text-xl font-bold mb-2">{channel.name}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-gray-400">Subscribers</span>
                      <span className="font-bold text-blue-400">{formatNumber(channel.subscribers)}</span>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-gray-400">Total Views</span>
                      <span className="font-bold text-green-400">{formatNumber(channel.views)}</span>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-gray-400">Videos</span>
                      <span className="font-bold text-purple-400">{formatNumber(channel.videos_count)}</span>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-gray-400">Avg Views</span>
                      <span className="font-bold text-yellow-400">
                        {channel.videos_count > 0
                          ? formatNumber(Math.round(channel.views / channel.videos_count))
                          : '0'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={` https://www.youtube.com/channel/ ${channel.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    View Channel
                  </a>
                </div>
              ))}
            </div>

            {/* Videos Section for Each Channel */}
            {results.map((channel) => (
              <div
                key={`videos-${channel.id}`}
                className="bg-gray-800/30 backdrop-blur-sm rounded-3xl p-8 border border-gray-700"
              >
                <h3 className="text-2xl font-bold mb-6 text-center">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    {channel.name} Videos
                  </span>
                </h3>

                {/* Loading state for videos */}
                {loadingVideos[channel.id] && (
                  <div className="flex justify-center items-center py-12">
                    <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}

                {/* Show content only when videos are loaded */}
                {!loadingVideos[channel.id] && channelVideos[channel.id] && (
                  <>
                    {/* Tabs */}
                    <div className="flex justify-center gap-4 mb-8">
                      <button
                        onClick={() =>
                          setActiveTab((prev) => ({ ...prev, [channel.id]: 'latest' }))
                        }
                        className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                          activeTab[channel.id] === 'latest'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-400 hover:text-white'
                        }`}
                      >
                        Latest Videos ({channelVideos[channel.id]?.latest?.length || 0})
                      </button>
                      <button
                        onClick={() =>
                          setActiveTab((prev) => ({ ...prev, [channel.id]: 'popular' }))
                        }
                        className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                          activeTab[channel.id] === 'popular'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-700/50 text-gray-400 hover:text-white'
                        }`}
                      >
                        Most Popular ({channelVideos[channel.id]?.popular?.length || 0})
                      </button>
                    </div>

                    {/* Videos Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {channelVideos[channel.id]?.[activeTab[channel.id]]?.map((video) => (
                        <div
                          key={video.id}
                          className={`bg-gray-900/50 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all duration-300 cursor-pointer ${
                            selectedVideo === video.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() =>
                            setSelectedVideo(selectedVideo === video.id ? null : video.id)
                          }
                        >
                          <img
                            src={video.snippet.thumbnails.medium.url}
                            alt={video.snippet.title}
                            className="w-full aspect-video object-cover"
                          />
                          <div className="p-4">
                            <h4 className="font-medium text-sm mb-2 line-clamp-2">
                              {video.snippet.title}
                            </h4>
                            {/* Quick Stats */}
                            {selectedVideo !== video.id && (
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path
                                      fillRule="evenodd"
                                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {formatNumber(video.statistics?.viewCount)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {formatNumber(video.statistics?.likeCount || 0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* No Videos Message */}
                    {channelVideos[channel.id]?.[activeTab[channel.id]]?.length === 0 && (
                      <div className="text-center py-12 text-gray-500">No videos found in this category</div>
                    )}
                  </>
                )}
              </div>
            ))}
            {/* Analyze Button and Modal */}
            <div className="flex justify-center mt-12">
              <button
                ref={analysisButtonRef}
                className="px-8 py-3 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-white text-lg shadow-lg"
                onClick={handleAnalyze}
                disabled={analysisLoading}
              >
                {analysisLoading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {showAnalysis && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative">
                  <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
                    onClick={() => setShowAnalysis(false)}
                  >
                    &times;
                  </button>
                  <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Channel Trends & Suggestions
                  </h2>
                  {analysisLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-200 text-base max-h-[60vh] overflow-y-auto">{analysisResult}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-800/50 rounded-full mb-6">
              <svg
                className="w-12 h-12 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No comparisons yet</h3>
            <p className="text-gray-500">Enter channel URLs or handles to start comparing</p>
          </div>
        )}
      </div>
    </div>
  );
}