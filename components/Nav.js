import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="flex gap-4">
      <Link href="/" className="text-blue-400 hover:text-blue-600 font-semibold">Analyze</Link>
      <Link href="/compare" className="text-blue-400 hover:text-blue-600 font-semibold">Compare</Link>
      <Link href="/search" className="text-blue-400 hover:text-blue-600 font-semibold">Search</Link>
      <Link href="/videos" className="text-blue-400 hover:text-blue-600 font-semibold">Videos</Link>
    </nav>
  );
} 