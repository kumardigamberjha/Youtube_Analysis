import React, { useState } from 'react';

const YT_API_KEY = 'YOUR_YOUTUBE_API_KEY';

async function searchChannels(query) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=20&key=${YT_API_KEY}`);
  const data = await res.json();
  return data.items || [];
}

export default function Search() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    const items = await searchChannels(input);
    if (!items.length) setError('No channels found.');
    setResults(items);
    setLoading(false);
  };

  return (
    <section className="max-w-2xl mx-auto bg-white rounded shadow p-6 mb-8">
      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Channel name or keyword"
          className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Search Channels</button>
      </form>
      {loading && <p className="mt-4 text-blue-600">Loading...</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {results.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Channels</h4>
          <ul className="space-y-2">
            {results.map(item => (
              <li key={item.id.channelId} className="flex items-center gap-4 bg-gray-50 rounded p-2">
                <img src={item.snippet.thumbnails.default.url} alt={item.snippet.title} width={60} className="rounded" />
                <div>
                  <span className="font-semibold">{item.snippet.title}</span>
                  <div className="text-gray-500 text-sm">{item.snippet.channelId}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
} 