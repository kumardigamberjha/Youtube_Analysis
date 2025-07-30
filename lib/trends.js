import { saveToCache, getCachedData, isCached } from './cache';

const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function getYouTubeTrendingTopics(timeRange = '24h') {
    const cacheKey = `youtube_trending_topics_${timeRange}`;
    
    if (isCached(cacheKey)) {
        return await getCachedData(cacheKey);
    }

    try {
        // Get trending videos from multiple categories with time-based relevance
        const publishedAfter = getTimeRangeDate(timeRange);
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=50&key=${YT_API_KEY}`
        );
        const data = await response.json();

        // Get additional topic-specific trending videos
        const categoryResponses = await Promise.all([
            'news', 'gaming', 'technology', 'entertainment', 'education'
        ].map(async (category) => {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${category}&order=viewCount&publishedAfter=${publishedAfter}&maxResults=20&key=${YT_API_KEY}`
            );
            return response.json();
        }));

        // Combine all videos and analyze topics
        const allVideos = [
            ...data.items,
            ...categoryResponses.flatMap(resp => resp.items || [])
        ];

        const topics = analyzeVideoTopics(allVideos);
        await saveToCache(cacheKey, topics, 3600); // Cache for 1 hour
        return topics;
    } catch (error) {
        console.error('Error fetching trending topics:', error);
        return [];
    }
}

export async function analyzeCompetitorTopics(competitorChannelIds) {
    const cacheKey = `competitor_topics_${competitorChannelIds.join('_')}`;
    
    if (isCached(cacheKey)) {
        return await getCachedData(cacheKey);
    }

    try {
        const competitorVideos = await Promise.all(
            competitorChannelIds.map(async (channelId) => {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=25&type=video&key=${YT_API_KEY}`
                );
                const data = await response.json();
                return data.items || [];
            })
        );

        const analysis = analyzeCompetitorContent(competitorVideos.flat());
        await saveToCache(cacheKey, analysis, 86400); // Cache for 24 hours
        return analysis;
    } catch (error) {
        console.error('Error analyzing competitor topics:', error);
        return [];
    }
}

export async function getTopicScore(topic, timeRange = '24h') {
    const cacheKey = `topic_score_${topic}_${timeRange}`;
    
    if (isCached(cacheKey)) {
        return await getCachedData(cacheKey);
    }

    try {
        const publishedAfter = getTimeRangeDate(timeRange);
        
        // Get recent videos for the topic
        const recentResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=25&key=${YT_API_KEY}`
        );
        const recentData = await recentResponse.json();

        // Get most viewed videos for the topic
        const popularResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=25&key=${YT_API_KEY}`
        );
        const popularData = await popularResponse.json();

        // Get detailed video statistics
        const allVideoIds = [...(recentData.items || []), ...(popularData.items || [])]
            .map(item => item.id.videoId)
            .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

        const statsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${allVideoIds.join(',')}&key=${YT_API_KEY}`
        );
        const statsData = await statsResponse.json();

        const score = calculateDetailedTopicScore(
            recentData.items || [], 
            popularData.items || [], 
            statsData.items || [],
            timeRange
        );
        
        await saveToCache(cacheKey, score, 3600); // Cache for 1 hour
        return score;
    } catch (error) {
        console.error('Error calculating topic score:', error);
        return null;
    }
}

function analyzeVideoTopics(videos) {
    const topics = {};
    
    videos.forEach(video => {
        const { title, description, tags = [] } = video.snippet;
        const { viewCount, likeCount, commentCount } = video.statistics;
        
        // Extract keywords from title and description
        const keywords = extractKeywords(title + ' ' + description);
        
        // Combine with tags
        const allTopics = [...new Set([...keywords, ...tags])];
        
        allTopics.forEach(topic => {
            if (!topics[topic]) {
                topics[topic] = {
                    count: 0,
                    totalViews: 0,
                    totalLikes: 0,
                    totalComments: 0
                };
            }
            
            topics[topic].count++;
            topics[topic].totalViews += parseInt(viewCount) || 0;
            topics[topic].totalLikes += parseInt(likeCount) || 0;
            topics[topic].totalComments += parseInt(commentCount) || 0;
        });
    });

    return Object.entries(topics)
        .map(([topic, stats]) => ({
            topic,
            score: calculateEngagementScore(stats),
            stats
        }))
        .sort((a, b) => b.score - a.score);
}

function analyzeCompetitorContent(videos) {
    const topicAnalysis = {};
    
    videos.forEach(video => {
        const { title, description, publishedAt } = video.snippet;
        const topics = extractKeywords(title + ' ' + description);
        
        topics.forEach(topic => {
            if (!topicAnalysis[topic]) {
                topicAnalysis[topic] = {
                    count: 0,
                    videos: [],
                    firstSeen: publishedAt,
                    lastSeen: publishedAt
                };
            }
            
            topicAnalysis[topic].count++;
            topicAnalysis[topic].videos.push({
                title,
                publishedAt
            });
            topicAnalysis[topic].lastSeen = publishedAt;
        });
    });

    return Object.entries(topicAnalysis)
        .map(([topic, data]) => ({
            topic,
            frequency: data.count,
            timespan: {
                first: data.firstSeen,
                last: data.lastSeen
            },
            examples: data.videos.slice(0, 5)
        }))
        .sort((a, b) => b.frequency - a.frequency);
}

function calculateTopicScore(videos) {
    if (!videos.length) return 0;
    
    const totalViews = videos.reduce((sum, video) => {
        return sum + (parseInt(video.statistics?.viewCount) || 0);
    }, 0);
    
    const averageViews = totalViews / videos.length;
    const competitionLevel = videos.length / 25; // Normalized by max results
    
    // Score formula: higher average views and lower competition is better
    return (averageViews * (1 - competitionLevel)) / 1000;
}

function calculateEngagementScore(stats) {
    const { totalViews, totalLikes, totalComments, count } = stats;
    
    // Weighted scoring formula
    return (
        (totalViews * 0.4) +
        (totalLikes * 0.35) +
        (totalComments * 0.25)
    ) / count;
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

function getTimeRangeDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
        case '1h':
            now.setHours(now.getHours() - 1);
            break;
        case '24h':
            now.setDate(now.getDate() - 1);
            break;
        case '7d':
            now.setDate(now.getDate() - 7);
            break;
        case '30d':
            now.setDate(now.getDate() - 30);
            break;
        case '90d':
            now.setDate(now.getDate() - 90);
            break;
        default:
            now.setDate(now.getDate() - 1); // Default to 24h
    }
    return now.toISOString();
}

function calculateDetailedTopicScore(recentVideos, popularVideos, statsData, timeRange) {
    const timeRangeMultiplier = getTimeRangeMultiplier(timeRange);
    const stats = {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        uploadFrequency: 0,
        avgViewsPerVideo: 0,
        engagement: 0,
        velocity: 0
    };

    // Calculate basic stats
    statsData.forEach(video => {
        stats.totalViews += parseInt(video.statistics.viewCount) || 0;
        stats.totalLikes += parseInt(video.statistics.likeCount) || 0;
        stats.totalComments += parseInt(video.statistics.commentCount) || 0;
    });

    const uniqueVideos = statsData.length;
    if (uniqueVideos > 0) {
        stats.avgViewsPerVideo = stats.totalViews / uniqueVideos;
        stats.engagement = (stats.totalLikes + stats.totalComments) / stats.totalViews;
    }

    // Calculate velocity (how quickly videos are being published)
    if (recentVideos.length > 0) {
        const uploadDates = recentVideos.map(video => new Date(video.snippet.publishedAt));
        const newest = Math.max(...uploadDates);
        const oldest = Math.min(...uploadDates);
        const daysBetween = (newest - oldest) / (1000 * 60 * 60 * 24) || 1;
        stats.uploadFrequency = recentVideos.length / daysBetween;
    }

    // Calculate view velocity (how quickly videos gain views)
    const recentVideoStats = statsData.filter(video => 
        recentVideos.some(rv => rv.id.videoId === video.id)
    );
    if (recentVideoStats.length > 0) {
        const avgViewsForRecent = recentVideoStats.reduce((sum, video) => 
            sum + (parseInt(video.statistics.viewCount) || 0), 0
        ) / recentVideoStats.length;
        stats.velocity = avgViewsForRecent * timeRangeMultiplier;
    }

    // Calculate final score
    const baseScore = (
        (stats.avgViewsPerVideo * 0.3) +
        (stats.engagement * 100000 * 0.2) +
        (stats.uploadFrequency * 1000 * 0.2) +
        (stats.velocity * 0.3)
    );

    // Normalize score to 0-1000 range
    return {
        score: Math.min(Math.round(baseScore / 1000), 1000),
        stats: {
            views: stats.totalViews,
            engagement: Math.round(stats.engagement * 100) / 100,
            uploadFrequency: Math.round(stats.uploadFrequency * 100) / 100,
            velocity: Math.round(stats.velocity)
        }
    };
}

function getTimeRangeMultiplier(timeRange) {
    switch (timeRange) {
        case '1h': return 24;
        case '24h': return 1;
        case '7d': return 1/7;
        case '30d': return 1/30;
        case '90d': return 1/90;
        default: return 1;
    }
}
