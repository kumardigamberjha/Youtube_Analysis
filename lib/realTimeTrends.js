import { saveToCache, getCachedData, isCached } from './cache';
import { google } from 'googleapis';
import googleTrends from 'google-trends-api';

const youtube = google.youtube('v3');
const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function getRealTimeTrends(topic, category = 'all') {
    const cacheKey = `realtime_trends_${topic}_${category}`;
    const cacheDuration = 1800; // 30 minutes cache

    if (isCached(cacheKey)) {
        return await getCachedData(cacheKey);
    }

    try {
        // Fetch YouTube real-time data
        const youtubeData = await getYouTubeRealTimeData(topic);
        
        // Fetch Google Trends data
        const googleTrendsData = await getGoogleTrendsData(topic);

        // Get related topics and queries
        const relatedData = await getRelatedTopicsAndQueries(topic);

        // Combine and analyze all trend data
        const combinedTrends = analyzeTrendData(
            youtubeData,
            googleTrendsData,
            relatedData
        );

        await saveToCache(cacheKey, combinedTrends, cacheDuration);
        return combinedTrends;
    } catch (error) {
        console.error('Error fetching real-time trends:', error);
        return null;
    }
}

async function getYouTubeRealTimeData(topic) {
    try {
        // Get videos published in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=date&publishedAfter=${oneHourAgo}&maxResults=50&key=${YT_API_KEY}`
        );
        const data = await response.json();

        if (!data.items) return [];

        // Get detailed stats for these videos
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const statsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,liveStreamingDetails&id=${videoIds}&key=${YT_API_KEY}`
        );
        const statsData = await statsResponse.json();

        // Combine video data with stats
        return data.items.map(item => {
            const stats = statsData.items.find(stat => stat.id === item.id.videoId);
            return {
                ...item,
                statistics: stats ? stats.statistics : {},
                liveStreamingDetails: stats ? stats.liveStreamingDetails : null
            };
        });
    } catch (error) {
        console.error('Error fetching YouTube real-time data:', error);
        return [];
    }
}

async function getGoogleTrendsData(topic) {
    try {
        // Get real-time trending searches
        const realTimeTrends = await googleTrends.realTimeTrends({
            geo: 'US',
            category: 'all'
        });

        // Get topic interest over time
        const interestOverTime = await googleTrends.interestOverTime({
            keyword: topic,
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        });

        return {
            realTimeTrends: JSON.parse(realTimeTrends),
            interestOverTime: JSON.parse(interestOverTime)
        };
    } catch (error) {
        console.error('Error fetching Google Trends data:', error);
        return null;
    }
}

async function getRelatedTopicsAndQueries(topic) {
    try {
        // Get related topics
        const relatedTopics = await googleTrends.relatedTopics({
            keyword: topic,
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000)
        });

        // Get related queries
        const relatedQueries = await googleTrends.relatedQueries({
            keyword: topic,
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000)
        });

        return {
            relatedTopics: JSON.parse(relatedTopics),
            relatedQueries: JSON.parse(relatedQueries)
        };
    } catch (error) {
        console.error('Error fetching related topics and queries:', error);
        return null;
    }
}

function analyzeTrendData(youtubeData, googleTrendsData, relatedData) {
    const analysis = {
        trendingNow: [],
        momentum: [],
        relatedTopics: [],
        keywordSuggestions: [],
        virality: {
            score: 0,
            factors: []
        }
    };

    // Analyze YouTube real-time performance
    if (youtubeData && youtubeData.length > 0) {
        const recentVideos = analyzeRecentVideos(youtubeData);
        analysis.trendingNow.push(...recentVideos.trendingTopics);
        analysis.momentum.push(...recentVideos.momentum);
    }

    // Analyze Google Trends data
    if (googleTrendsData) {
        const trendsAnalysis = analyzeGoogleTrends(googleTrendsData);
        analysis.trendingNow.push(...trendsAnalysis.trending);
        analysis.momentum.push(...trendsAnalysis.momentum);
    }

    // Analyze related topics and queries
    if (relatedData) {
        const relatedAnalysis = analyzeRelatedData(relatedData);
        analysis.relatedTopics = relatedAnalysis.topics;
        analysis.keywordSuggestions = relatedAnalysis.keywords;
    }

    // Calculate virality potential
    analysis.virality = calculateViralityPotential(
        youtubeData,
        googleTrendsData,
        relatedData
    );

    return analysis;
}

function analyzeRecentVideos(videos) {
    const result = {
        trendingTopics: [],
        momentum: []
    };

    // Group videos by common themes/topics
    const topics = {};
    videos.forEach(video => {
        const { title, description } = video.snippet;
        const keywords = extractKeywords(title + ' ' + description);
        
        keywords.forEach(keyword => {
            if (!topics[keyword]) {
                topics[keyword] = {
                    count: 0,
                    views: 0,
                    likes: 0,
                    comments: 0,
                    videos: []
                };
            }
            
            topics[keyword].count++;
            topics[keyword].views += parseInt(video.statistics.viewCount) || 0;
            topics[keyword].likes += parseInt(video.statistics.likeCount) || 0;
            topics[keyword].comments += parseInt(video.statistics.commentCount) || 0;
            topics[keyword].videos.push(video);
        });
    });

    // Calculate momentum and trending topics
    Object.entries(topics).forEach(([topic, stats]) => {
        const momentum = calculateMomentum(stats);
        
        if (momentum > 50) {
            result.momentum.push({
                topic,
                score: momentum,
                stats
            });
        }

        if (stats.count >= 3) {
            result.trendingTopics.push({
                topic,
                count: stats.count,
                totalViews: stats.views,
                engagement: (stats.likes + stats.comments) / stats.views
            });
        }
    });

    return {
        trendingTopics: result.trendingTopics.sort((a, b) => b.totalViews - a.totalViews),
        momentum: result.momentum.sort((a, b) => b.score - a.score)
    };
}

function analyzeGoogleTrends(trendsData) {
    const result = {
        trending: [],
        momentum: []
    };

    if (trendsData.realTimeTrends) {
        // Analyze real-time trending searches
        trendsData.realTimeTrends.storySummaries.trendingStories.forEach(story => {
            result.trending.push({
                topic: story.title,
                traffic: story.entityNames.length,
                articles: story.articles.length
            });
        });
    }

    if (trendsData.interestOverTime) {
        // Calculate momentum from interest over time
        const timelineData = trendsData.interestOverTime.default.timelineData;
        const recentValues = timelineData.slice(-6); // Last 6 hours
        
        const momentum = calculateTrendsMomentum(recentValues);
        if (momentum > 0) {
            result.momentum.push({
                topic: trendsData.interestOverTime.default.query,
                momentum,
                timeline: recentValues
            });
        }
    }

    return result;
}

function analyzeRelatedData(relatedData) {
    const result = {
        topics: [],
        keywords: []
    };

    if (relatedData.relatedTopics) {
        const topics = relatedData.relatedTopics.default.rankedList[0].rankedKeyword;
        result.topics = topics.map(topic => ({
            title: topic.topic.title,
            type: topic.topic.type,
            score: topic.value
        }));
    }

    if (relatedData.relatedQueries) {
        const queries = relatedData.relatedQueries.default.rankedList[0].rankedKeyword;
        result.keywords = queries.map(query => ({
            term: query.query,
            score: query.value
        }));
    }

    return result;
}

function calculateMomentum(stats) {
    const viewsPerVideo = stats.views / stats.count;
    const engagementRate = (stats.likes + stats.comments) / stats.views;
    const recency = calculateRecencyScore(stats.videos);
    
    return (viewsPerVideo * 0.4 + engagementRate * 100 * 0.3 + recency * 0.3);
}

function calculateTrendsMomentum(timelineData) {
    const values = timelineData.map(point => point.value[0]);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const latestValue = values[values.length - 1];
    
    return ((latestValue - average) / average) * 100;
}

function calculateRecencyScore(videos) {
    const now = Date.now();
    return videos.reduce((score, video) => {
        const ageInHours = (now - new Date(video.snippet.publishedAt).getTime()) / (1000 * 60 * 60);
        return score + (1 / (ageInHours + 1));
    }, 0) / videos.length;
}

function calculateViralityPotential(youtubeData, googleTrendsData, relatedData) {
    const factors = [];
    let score = 0;

    // YouTube factors
    if (youtubeData && youtubeData.length > 0) {
        const engagement = calculateEngagementMetrics(youtubeData);
        score += engagement.score * 0.4;
        factors.push({
            name: 'YouTube Engagement',
            score: engagement.score,
            details: engagement.details
        });
    }

    // Google Trends factors
    if (googleTrendsData && googleTrendsData.interestOverTime) {
        const trendsScore = calculateTrendsScore(googleTrendsData.interestOverTime);
        score += trendsScore.score * 0.3;
        factors.push({
            name: 'Search Trends',
            score: trendsScore.score,
            details: trendsScore.details
        });
    }

    // Related content factors
    if (relatedData) {
        const relatedScore = calculateRelatedScore(relatedData);
        score += relatedScore.score * 0.3;
        factors.push({
            name: 'Related Content',
            score: relatedScore.score,
            details: relatedScore.details
        });
    }

    return {
        score: Math.round(score),
        factors: factors.sort((a, b) => b.score - a.score)
    };
}

function calculateEngagementMetrics(videos) {
    // Implementation of engagement metrics calculation
    return {
        score: 0,
        details: []
    };
}

function calculateTrendsScore(trendsData) {
    // Implementation of trends score calculation
    return {
        score: 0,
        details: []
    };
}

function calculateRelatedScore(relatedData) {
    // Implementation of related content score calculation
    return {
        score: 0,
        details: []
    };
}

function extractKeywords(text) {
    // Simple keyword extraction (you might want to use a more sophisticated NLP library)
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !stopWords.includes(word));
}

const stopWords = [
    'this', 'that', 'these', 'those', 'with', 'from', 'into', 'during',
    'including', 'until', 'against', 'among', 'throughout', 'despite',
    'towards', 'upon', 'concerning', 'about', 'over', 'like'
];
