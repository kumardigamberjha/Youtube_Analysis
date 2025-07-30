// Helper functions for enhanced trend analysis
import { getRealTimeTrends } from './realTimeTrends';

export async function getGeoTrendDistribution(topic) {
    const regions = ['US', 'GB', 'IN', 'CA', 'AU', 'DE', 'FR', 'BR', 'JP', 'KR'];
    try {
        const geoPromises = regions.map(async region => {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?` +
                `part=snippet&q=${encodeURIComponent(topic)}` +
                `&type=video&regionCode=${region}&maxResults=10&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
            );
            const data = await response.json();
            return {
                region,
                popularity: calculateRegionPopularity(data.items || []),
                topVideos: extractTopVideos(data.items || [])
            };
        });

        const geoData = await Promise.all(geoPromises);
        return analyzeGeoDistribution(geoData);
    } catch (error) {
        console.error('Error fetching geo distribution:', error);
        return null;
    }
}

function mergeCategoryTrends(allTrends) {
    const merged = {
        trendingNow: new Map(),
        momentum: new Map(),
        relatedTopics: new Map(),
        keywordSuggestions: new Map(),
        categoryInsights: {},
        predictedTrends: [],
        trendTimeline: {},
        searchVolume: {},
        socialSignals: {}
    };

    allTrends.forEach((trends, index) => {
        if (!trends) return;

        // Merge trending topics with weights based on engagement
        trends.trendingNow.forEach(trend => {
            const key = trend.topic.toLowerCase();
            if (!merged.trendingNow.has(key)) {
                merged.trendingNow.set(key, {
                    ...trend,
                    weight: calculateTrendWeight(trend)
                });
            } else {
                const existing = merged.trendingNow.get(key);
                merged.trendingNow.set(key, {
                    ...existing,
                    count: existing.count + trend.count,
                    totalViews: existing.totalViews + trend.totalViews,
                    weight: existing.weight + calculateTrendWeight(trend)
                });
            }
        });

        // Merge momentum data
        trends.momentum.forEach(item => {
            const key = item.topic.toLowerCase();
            if (!merged.momentum.has(key)) {
                merged.momentum.set(key, item);
            } else {
                const existing = merged.momentum.get(key);
                merged.momentum.set(key, {
                    ...existing,
                    score: Math.max(existing.score, item.score)
                });
            }
        });

        // Collect category-specific insights
        merged.categoryInsights[trends.category] = {
            topTrends: trends.trendingNow.slice(0, 5),
            growth: calculateCategoryGrowth(trends),
            potential: estimateCategoryPotential(trends)
        };

        // Merge social signals
        merged.socialSignals = {
            ...merged.socialSignals,
            ...trends.socialSignals
        };

        // Update search volume data
        Object.entries(trends.searchVolume || {}).forEach(([term, volume]) => {
            merged.searchVolume[term] = (merged.searchVolume[term] || 0) + volume;
        });
    });

    // Convert maps back to arrays and sort by weight/score
    return {
        trendingNow: Array.from(merged.trendingNow.values())
            .sort((a, b) => b.weight - a.weight),
        momentum: Array.from(merged.momentum.values())
            .sort((a, b) => b.score - a.score),
        relatedTopics: Array.from(merged.relatedTopics.values())
            .sort((a, b) => b.score - a.score),
        keywordSuggestions: Array.from(merged.keywordSuggestions.values())
            .sort((a, b) => b.score - a.score),
        categoryInsights: merged.categoryInsights,
        predictedTrends: predictUpcomingTrends(merged),
        trendTimeline: generateTrendTimeline(merged),
        searchVolume: merged.searchVolume,
        socialSignals: merged.socialSignals
    };
}

function calculateTrendWeight(trend) {
    const viewWeight = trend.totalViews * 0.4;
    const engagementWeight = trend.engagement * 0.3;
    const recencyWeight = calculateRecencyWeight(trend) * 0.3;
    return viewWeight + engagementWeight + recencyWeight;
}

function calculateRecencyWeight(trend) {
    const now = Date.now();
    const trendTime = new Date(trend.timestamp).getTime();
    const hoursDiff = (now - trendTime) / (1000 * 60 * 60);
    return Math.max(0, 1 - (hoursDiff / 24)); // Higher weight for more recent trends
}

function calculateRegionPopularity(videos) {
    if (!videos.length) return 0;
    
    return videos.reduce((acc, video) => {
        const viewCount = parseInt(video.statistics?.viewCount) || 0;
        const likeCount = parseInt(video.statistics?.likeCount) || 0;
        const commentCount = parseInt(video.statistics?.commentCount) || 0;
        
        return acc + (viewCount + (likeCount * 2) + (commentCount * 3));
    }, 0) / videos.length;
}

function extractTopVideos(videos) {
    return videos
        .map(video => ({
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt,
            viewCount: video.statistics?.viewCount || 0
        }))
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 3);
}

function analyzeGeoDistribution(geoData) {
    const totalPopularity = geoData.reduce((sum, data) => sum + data.popularity, 0);
    
    return {
        regions: geoData.map(data => ({
            region: data.region,
            percentage: Math.round((data.popularity / totalPopularity) * 100),
            topVideos: data.topVideos
        })),
        recommendedRegions: geoData
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 3)
            .map(data => data.region),
        insights: generateGeoInsights(geoData)
    };
}

function generateGeoInsights(geoData) {
    return {
        primaryMarket: geoData[0].region,
        marketPenetration: calculateMarketPenetration(geoData),
        expansionOpportunities: identifyExpansionOpportunities(geoData),
        localizations: suggestLocalizations(geoData)
    };
}

function calculateMarketPenetration(geoData) {
    // Implementation of market penetration calculation
    return {};
}

function identifyExpansionOpportunities(geoData) {
    // Implementation of expansion opportunities identification
    return [];
}

function suggestLocalizations(geoData) {
    // Implementation of localization suggestions
    return [];
}

function calculateCategoryGrowth(trends) {
    // Implementation of category growth calculation
    return {};
}

function estimateCategoryPotential(trends) {
    // Implementation of category potential estimation
    return {};
}

function predictUpcomingTrends(mergedData) {
    // Implementation of trend prediction
    return [];
}

function generateTrendTimeline(mergedData) {
    // Implementation of trend timeline generation
    return {};
}
