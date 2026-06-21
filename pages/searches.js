import { useState, useEffect } from 'react';

// LocalStorage key for persistence
const STORAGE_KEY = 'yt_searches_list';

export default function SearchesManager() {
  const [searches, setSearches] = useState([]);
  const [input, setInput] = useState('');
  const [type, setType] = useState('channel');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSearch, setActiveSearch] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSearches(JSON.parse(saved));
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  }, [searches]);

  // Suggestion logic (simple filter)
  useEffect(() => {
    if (!input) setSuggestions([]);
    else {
      setSuggestions(
        searches.filter(
          s => s.value.toLowerCase().includes(input.toLowerCase()) && s.type === type
        )
      );
    }
  }, [input, type, searches]);

  // Add new search
  const addSearch = () => {
    if (!input.trim()) return;
    setSearches(prev => [
      ...prev,
      { value: input.trim(), type, active: true }
    ]);
    setInput('');
  };

  // Remove search
  const removeSearch = idx => {
    setSearches(prev => prev.filter((_, i) => i !== idx));
    if (activeSearch === idx) setActiveSearch(null);
  };

  // Toggle active/inactive
  const toggleActive = idx => {
    setSearches(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s));
  };

  // Select suggestion
  const selectSuggestion = idx => {
    setActiveSearch(idx);
    setInput('');
  };

  // Simulate search result (replace with real API call)
  const getResult = search => {
    if (!search) return null;
    return (
      <div className="mt-6 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl">
        <h3 className="font-bold mb-2 text-white">Result for: <span className="text-blue-400">{search.value}</span> <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded ml-2">{search.type}</span></h3>
        <div className="text-gray-400">(Simulated result. Integrate with your API for real data.)</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Manage Your Searches</h1>
        <div className="flex gap-2 mb-4">
          <select value={type} onChange={e => setType(e.target.value)} className="bg-gray-900/60 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="channel" className="bg-gray-900">Channel</option>
            <option value="video" className="bg-gray-900">Video</option>
            <option value="trend" className="bg-gray-900">Trending Topic</option>
          </select>
          <input
            className="bg-gray-900/60 border border-gray-700 rounded-lg p-2 flex-1 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={`Search for a ${type}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button onClick={addSearch} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all">Add</button>
        </div>
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-4 bg-gray-800/50 border border-gray-700 rounded-lg p-2">
            <div className="font-semibold text-gray-300 mb-1">Suggestions:</div>
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                    onClick={() => selectSuggestion(searches.indexOf(s))}
                  >
                    {s.value} <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded ml-1">{s.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* List of searches */}
        <div className="mb-8">
          <h2 className="font-semibold mb-2 text-white">Your Searches</h2>
          <ul className="space-y-2">
            {searches.map((s, i) => (
              <li key={i} className="flex items-center gap-2 p-2 bg-gray-800/50 border border-gray-700 rounded-lg">
                <span className={`px-2 py-1 rounded text-xs ${s.active ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-400'}`}>{s.type}</span>
                <span className={s.active ? 'font-semibold text-gray-100' : 'text-gray-500 line-through'}>{s.value}</span>
                <button onClick={() => toggleActive(i)} className="ml-auto px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors">{s.active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => removeSearch(i)} className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">Remove</button>
                <button onClick={() => setActiveSearch(i)} className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors">Show</button>
              </li>
            ))}
          </ul>
        </div>
        {/* Show result for selected search */}
        {getResult(searches[activeSearch])}
      </div>
    </div>
  );
}
