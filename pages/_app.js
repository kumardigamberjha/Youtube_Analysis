import '../styles/globals.css';
import GoogleAuth from '../components/GoogleAuth';
import Nav from '../components/Nav';

export default function App({ Component, pageProps }) {
  return (
    <>
      <header className="bg-gray-900 text-white py-6 mb-8 shadow">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">YouTube Competitor Analysis Tool</h1>
          <div className="flex items-center gap-4">
            <GoogleAuth />
            <Nav />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4">
        <Component {...pageProps} />
      </main>
    </>
  );
} 