import Link from 'next/link';
import GoogleAuth from './GoogleAuth';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/100 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-white font-bold text-xl">
            YouTube Analyzer
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/trends" className="text-white/80 hover:text-white transition-colors">
              Trends
            </Link>
            <Link href="/analyze" className="text-white/80 hover:text-white transition-colors">
              Analyze
            </Link>
            <Link href="/compare" className="text-white/80 hover:text-white transition-colors">
              Compare
            </Link>
            <Link href="/searches" className="text-white/80 hover:text-white transition-colors">
              Searches
            </Link>
            <GoogleAuth />
          </div>
        </div>
      </div>
    </nav>
  );
} 