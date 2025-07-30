import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Nav from '../components/Nav';

export default function TrendAnalysis() {
    const [loading, setLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [competitors, setCompetitors] = useState('');
    const [timeRange, setTimeRange] = useState('24h');
    const [insights, setInsights] = useState(null);
    
    const timeRangeOptions = [
        { value: '1h', label: 'Last Hour' },
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 90 Days' }
    ];
    const router = useRouter();

    const analyzeTrends = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const competitorList = competitors
                .split('\n')
                .map(c => c.trim())
                .filter(Boolean);

            const response = await fetch('/api/analyze-trends', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic,
                    competitorChannels: competitorList,
                    timeRange,
                }),
            });

            const data = await response.json();
            setInsights(data);
        } catch (error) {
            console.error('Error analyzing trends:', error);
            alert('Error analyzing trends. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Nav />
            <div className="pt-16 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-center">
                    YouTube Trend Analysis & Content Planning
                </h1>

                <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
                    <form onSubmit={analyzeTrends}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Time Range
                            </label>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="w-full p-2 border rounded mb-4"
                            >
                                {timeRangeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Topic to Analyze (optional)
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="Enter a specific topic to analyze"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Competitor Channels (one per line, optional)
                            </label>
                            <textarea
                                value={competitors}
                                onChange={(e) => setCompetitors(e.target.value)}
                                className="w-full p-2 border rounded"
                                rows="4"
                                placeholder="Enter competitor channel URLs or IDs"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? 'Analyzing...' : 'Analyze Trends'}
                        </button>
                    </form>
                </div>

                {insights && (
                    <div className="space-y-6">
                        {/* Trending Topics */}
                        <div className="bg-white shadow-sm rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Trending Topics</h2>
                            {Array.isArray(insights.trendingTopics) && insights.trendingTopics.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {insights.trendingTopics.map((topic, index) => (
                                        <div key={index} className="border rounded p-3">
                                            <div className="font-medium">{topic.topic}</div>
                                            <div className="text-sm text-gray-500">
                                                Score: {topic.score !== undefined ? Math.round(topic.score).toLocaleString() : 'N/A'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500">No trending topics found.</div>
                            )}
                        </div>

                        {/* Competitor Analysis */}
                        {Array.isArray(insights.competitorAnalysis) && insights.competitorAnalysis.length > 0 ? (
                            <div className="bg-white shadow-sm rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-4">Competitor Analysis</h2>
                                <div className="space-y-4">
                                    {insights.competitorAnalysis.map((item, index) => (
                                        <div key={index} className="border rounded p-3">
                                            <div className="font-medium">{item.topic}</div>
                                            <div className="text-sm text-gray-500">
                                                Used {item.frequency} times by competitors
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Last used: {item.timespan && item.timespan.last ? new Date(item.timespan.last).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white shadow-sm rounded-lg p-6">
                                <h2 className="text-xl font-semibold mb-4">Competitor Analysis</h2>
                                <div className="text-gray-500">No competitor analysis data found.</div>
                            </div>
                        )}

                        {/* Recommendations */}
                        <div className="bg-white shadow-sm rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                            {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 ? (
                                <div className="space-y-4">
                                    {insights.recommendations.map((rec, index) => (
                                        <div key={index} className="border rounded p-3">
                                            <div className="font-medium mb-2">{rec.message}</div>
                                            {rec.topics && Array.isArray(rec.topics) && (
                                                <ul className="list-disc list-inside text-sm text-gray-600">
                                                    {rec.topics.map((t, i) => (
                                                        <li key={i}>
                                                            {t.topic || t}
                                                            {t.frequency && ` (${t.frequency} videos)`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {rec.recommendations && Array.isArray(rec.recommendations) && (
                                                <ul className="list-disc list-inside text-sm text-blue-600 mt-2">
                                                    {rec.recommendations.map((tip, i) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {rec.strategies && Array.isArray(rec.strategies) && (
                                                <ul className="list-disc list-inside text-sm text-green-600 mt-2">
                                                    {rec.strategies.map((strat, i) => (
                                                        <li key={i}>{strat}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {rec.videos && Array.isArray(rec.videos) && (
                                                <ul className="list-disc list-inside text-sm text-purple-600 mt-2">
                                                    {rec.videos.map((vid, i) => (
                                                        <li key={i}>{vid.title} - {vid.views} views ({vid.engagement})</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {rec.score && (
                                                <div className="text-sm text-gray-600">
                                                    <div>Score: {Math.round(rec.score)}</div>
                                                    <div>{rec.interpretation}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500">No recommendations found.</div>
                            )}
                        </div>

                        {/* Debug: Show raw API response */}
                        <div className="bg-gray-50 border rounded p-4 mt-8">
                            <h3 className="text-md font-semibold mb-2">Debug: Raw API Response</h3>
                            <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                                {JSON.stringify(insights, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
