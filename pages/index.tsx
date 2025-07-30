import Link from 'next/link';
import { useState, useEffect } from 'react';
import GoogleAuth from '../components/GoogleAuth';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

      <h1>Hello js</h1>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {mounted && [...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-white rounded-full opacity-20 animate-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-12 px-6">
        {/* Header Section */}
        <div className="text-center mb-16">
          {/* YouTube Icon with Glow Effect */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-2xl shadow-red-500/50 mb-8 animate-pulse">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-200 mb-6 drop-shadow-2xl leading-tight">
            YouTube Competitor
            <br />
            <span className="text-4xl md:text-6xl bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              Analysis Tool
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light mb-8">
            Unlock deep insights into YouTube performance. Analyze channels, compare competitors, and discover trending content with our powerful analytics suite.
          </p>

          {/* CTA Badges */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/20">
              📊 Advanced Analytics
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/20">
              🚀 Real-time Data
            </span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/20">
              📈 Competitive Intelligence
            </span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl mb-16">
          {/* Trends Analysis */}
          <Link href="/trends" className="group">
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-yellow-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 21H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
                      Trends Analysis
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      Discover trending topics, real-time momentum, and actionable insights for content planning
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-xs">Trending Topics</span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-xs">Real-time Insights</span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-xs">Content Strategy</span>
                </div>
              </div>
            </div>
          </Link>
          {/* Analyze Channel */}
          <Link href="/analyze" className="group">
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 17v-2a4 4 0 014-4h3m4 4v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6m16-4V7a2 2 0 00-2-2h-3.34a2 2 0 01-1.42-.59l-2.83-2.83A2 2 0 008.34 2H7a2 2 0 00-2 2v4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                      Analyze Channel
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      Deep dive into channel performance with comprehensive stats, video analytics, and growth trends
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">Subscriber Growth</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">Video Performance</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">Engagement Metrics</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Compare Channels */}
          <Link href="/compare" className="group">
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-green-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 20h5v-2a4 4 0 00-4-4h-1M7 20H2v-2a4 4 0 014-4h1m4-4V4m0 0L8 7m4-3l4 3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-300 transition-colors">
                      Compare Channels
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      Side-by-side competitive analysis to benchmark performance and identify opportunities
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">Head-to-Head</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">Market Share</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">Competitive Edge</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Search Channels */}
          <Link href="/search" className="group">
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      Search Channels
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      Discover channels by name, keyword, or niche with advanced filtering and search capabilities
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">Smart Search</span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">Niche Discovery</span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">Advanced Filters</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Search Videos */}
          <Link href="/videos" className="group">
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-pink-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="p-4 bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 10l4.553-2.276A2 2 0 0021 6.382V5a2 2 0 00-2-2H5a2 2 0 00-2 2v1.382a2 2 0 001.447 1.342L9 10m6 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V10m10 0l-4 2-4-2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-300 transition-colors">
                      Search Videos
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      Browse and analyze recent videos from any channel with detailed performance metrics
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">Video Analytics</span>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">Content Trends</span>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">Performance Data</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Bottom Section */}
        <div className="text-center">
          <div className="mb-8">
            <GoogleAuth />
          </div>
          
          <div className="flex justify-center gap-8 text-white/60 text-sm">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              API Status: Active
            </span>
            <span>•</span>
            <span>99.9% Uptime</span>
            <span>•</span>
            <span>Real-time Data</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}