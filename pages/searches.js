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
      <div className="mt-6 p-4 bg-white rounded shadow">
        <h3 className="font-bold mb-2">Result for: <span className="text-blue-600">{search.value}</span> <span className="text-xs bg-gray-200 px-2 py-1 rounded ml-2">{search.type}</span></h3>
        <div className="text-gray-600">(Simulated result. Integrate with your API for real data.)</div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Manage Your Searches</h1>
      <div className="flex gap-2 mb-4">
        <select value={type} onChange={e => setType(e.target.value)} className="border rounded p-2">
          <option value="channel">Channel</option>
          <option value="video">Video</option>
          <option value="trend">Trending Topic</option>
        </select>
        <input
          className="border rounded p-2 flex-1"
          placeholder={`Search for a ${type}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button onClick={addSearch} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4 bg-gray-50 border rounded p-2">
          <div className="font-semibold text-gray-700 mb-1">Suggestions:</div>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  onClick={() => selectSuggestion(searches.indexOf(s))}
                >
                  {s.value} <span className="text-xs bg-gray-200 px-2 py-1 rounded ml-1">{s.type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* List of searches */}
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Your Searches</h2>
        <ul className="space-y-2">
          {searches.map((s, i) => (
            <li key={i} className="flex items-center gap-2 p-2 bg-gray-100 rounded">
              <span className={`px-2 py-1 rounded text-xs ${s.active ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-600'}`}>{s.type}</span>
              <span className={s.active ? 'font-semibold text-gray-800' : 'text-gray-500 line-through'}>{s.value}</span>
              <button onClick={() => toggleActive(i)} className="ml-auto px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200">{s.active ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => removeSearch(i)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200">Remove</button>
              <button onClick={() => setActiveSearch(i)} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Show</button>
            </li>
          ))}
        </ul>
      </div>
      {/* Show result for selected search */}
      {getResult(searches[activeSearch])}
    </div>
  );
}
