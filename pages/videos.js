import React, { useState } from 'react';
import { getChannelIdFromUrl, getChannelVideos } from '../lib/youtube';

export default function Videos() {
  const [input, setInput] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setVideos([]);
    const channelId = await getChannelIdFromUrl(input);
    if (!channelId) {
      setError('Channel not found.');
      setLoading(false);
      return;
    }
    const vids = await getChannelVideos(channelId, 20);
    setVideos(vids);
    setLoading(false);
  };

  return (
    <section className="max-w-2xl mx-auto bg-white rounded shadow p-6 mb-8">
      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Channel URL, handle, or name"
          className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Search Videos</button>
      </form>
      {loading && <p className="mt-4 text-blue-600">Loading...</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {videos.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Recent Videos</h4>
          <ul className="space-y-2">
            {videos.map(v => (
              <li key={v.id} className="flex items-center gap-4 bg-gray-50 rounded p-2">
                <img src={v.thumbnail_url} alt={v.title} width={80} className="rounded" />
                <div>
                  <a href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">{v.title}</a>
                  <div className="text-gray-500 text-sm">{v.upload_date}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
} 