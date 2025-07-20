import React, { useState } from 'react';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

async function searchChannels(query) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=20&key=${YOUTUBE_API_KEY}`);
  const data = await res.json();
  return data.items || [];
}

async function getChannelDetails(channelIds) {
  if (!channelIds.length) return [];
  const ids = channelIds.join(',');
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids}&key=${YOUTUBE_API_KEY}`);
  const data = await res.json();
  return data.items || [];
}

export default function Search() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const items = await searchChannels(input);
      if (!items.length) {
        setError('No channels found. Try different keywords.');
        setLoading(false);
        return;
      }

      // Get detailed channel info including statistics
      const channelIds = items.map(item => item.id.channelId);
      const detailedChannels = await getChannelDetails(channelIds);

      // Merge search results with detailed info
      const mergedResults = items.map(item => {
        const detailed = detailedChannels.find(ch => ch.id === item.id.channelId);
        return detailed || item;
      });

      setResults(mergedResults);
    } catch (err) {
      setError('Failed to search channels. Please try again.');
    }

    setLoading(false);
  };

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
            Search YouTube Channels
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover YouTube channels by name, topic, or keyword with detailed statistics
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search by channel name, topic, or keyword..."
                className="flex-1 px-6 py-4 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-l-2xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-lg placeholder-gray-500 transition-all duration-300"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-r-2xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
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

        {/* Results */}
        {results.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-300">
                Found {results.length} channel{results.length !== 1 ? 's' : ''}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map(channel => (
                <div
                  key={channel.id || channel.id?.channelId}
                  className={`group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-green-500/50 transition-all duration-300 cursor-pointer ${
                    selectedChannel === (channel.id || channel.id?.channelId) ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => setSelectedChannel(selectedChannel === (channel.id || channel.id?.channelId) ? null : (channel.id || channel.id?.channelId))}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={channel.snippet?.thumbnails?.default?.url}
                      alt={channel.snippet?.title}
                      className="w-16 h-16 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-200 group-hover:text-green-400 transition-colors duration-300">
                        {channel.snippet?.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                        {channel.snippet?.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {formatNumber(channel.statistics?.subscriberCount)} subscribers
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {formatNumber(channel.statistics?.videoCount)} videos
                        </span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/analyze?id=${channel.id || channel.id?.channelId}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-green-500 hover:text-green-400 transition-colors duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analyze Channel
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-800/50 rounded-full mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">Start your search</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Search for YouTube channels by name, topic, or keyword to discover content creators
            </p>
            
            {/* Popular Search Suggestions */}
            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-3">Try searching for:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Gaming', 'Tech Reviews', 'Cooking', 'Music', 'Education', 'Vlog'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm hover:border-green-500/50 hover:text-green-400 transition-all duration-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-800/50 rounded-full mb-6">
              <svg className="animate-spin h-12 w-12 text-green-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-400">Searching channels...</h3>
            <p className="text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}