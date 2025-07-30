import { getYouTubeTrendingTopics, analyzeCompetitorTopics } from '../../lib/trends';
import { getVideoOptimization } from '../../lib/videoOptimizer';
import { getRealTimeTrends } from '../../lib/realTimeTrends';
import { getDetailedCategoryAnalysis } from '../../lib/categoryAnalysis';
import { getEnhancedGeoAnalysis } from '../../lib/geoAnalysis';
import { getEnhancedTrendPredictions } from '../../lib/trendPrediction';


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { topic, competitorChannels, timeRange = '24h' } = req.body;

        // Validate time range
        const validTimeRanges = ['1h', '24h', '7d', '30d', '90d'];
        if (!validTimeRanges.includes(timeRange)) {
            return res.status(400).json({
                message: 'Invalid time range. Must be one of: ' + validTimeRanges.join(', ')
            });
        }

        // Fetch base data: trending topics and competitor analysis
        let trendingTopics = [];
        let competitorAnalysis = [];
        try {
            [trendingTopics, competitorAnalysis] = await Promise.all([
                getYouTubeTrendingTopics(timeRange),
                competitorChannels?.length > 0 ? analyzeCompetitorTopics(competitorChannels) : Promise.resolve([])
            ]);
        } catch (error) {
            console.error('Error fetching base data:', error);
        }
        trendingTopics = Array.isArray(trendingTopics) ? trendingTopics : [];
        competitorAnalysis = Array.isArray(competitorAnalysis) ? competitorAnalysis : [];

        // Topic-specific analyses
        let topicAnalyses = {
            videoOptimization: null,
            realTimeTrends: null,
            categoryAnalysis: null,
            geoAnalysis: null,
            trendPredictions: null
        };

        if (topic) {
            try {
                const [videoOpt, realTrends, categories, geo, predictions] = await Promise.all([
                    getVideoOptimization(topic, timeRange).catch(() => null),
                    getRealTimeTrends(topic).catch(() => null),
                    getDetailedCategoryAnalysis(topic).catch(() => null),
                    getEnhancedGeoAnalysis(topic).catch(() => null),
                    getEnhancedTrendPredictions(topic).catch(() => null)
                ]);
                topicAnalyses = {
                    videoOptimization: videoOpt,
                    realTimeTrends: realTrends,
                    categoryAnalysis: categories,
                    geoAnalysis: geo,
                    trendPredictions: predictions
                };
            } catch (error) {
                console.error('Error fetching topic analyses:', error);
            }
        }


        // If trendingTopics is empty, use realTimeTrends.trendingNow as fallback
        let trendingTopicsToSend = trendingTopics.slice(0, 20);
        if (trendingTopicsToSend.length === 0 && topicAnalyses.realTimeTrends && Array.isArray(topicAnalyses.realTimeTrends.trendingNow)) {
            trendingTopicsToSend = topicAnalyses.realTimeTrends.trendingNow.slice(0, 20);
        }

        const insights = {
            timeRange,
            trendingTopics: trendingTopicsToSend,
            competitorAnalysis: competitorAnalysis.slice(0, 50),
            videoOptimization: topicAnalyses.videoOptimization ? {
                titleSuggestions: topicAnalyses.videoOptimization.titleSuggestions || [],
                descriptionTemplate: topicAnalyses.videoOptimization.descriptionTemplate || '',
                recommendedTags: topicAnalyses.videoOptimization.recommendedTags || [],
                engagement: topicAnalyses.videoOptimization.engagement || {},
                aidaScript: topicAnalyses.videoOptimization.aidaScript || '',
                competitorInsights: topicAnalyses.videoOptimization.competitorInsights
            } : null,
            realTimeTrends: topicAnalyses.realTimeTrends ? {
                trendingNow: topicAnalyses.realTimeTrends.trendingNow,
                momentum: topicAnalyses.realTimeTrends.momentum,
                relatedTopics: topicAnalyses.realTimeTrends.relatedTopics,
                keywordSuggestions: topicAnalyses.realTimeTrends.keywordSuggestions,
                virality: topicAnalyses.realTimeTrends.virality,
                categoryInsights: topicAnalyses.realTimeTrends.categoryInsights,
                socialSignals: topicAnalyses.realTimeTrends.socialSignals,
                searchVolume: topicAnalyses.realTimeTrends.searchVolume
            } : null,
            categoryAnalysis: topicAnalyses.categoryAnalysis ? {
                detailedInsights: topicAnalyses.categoryAnalysis
            } : null,
            geoAnalysis: topicAnalyses.geoAnalysis ? {
                regionalInsights: topicAnalyses.geoAnalysis.regionalAnalysis,
                demographics: topicAnalyses.geoAnalysis.demographics,
                languages: topicAnalyses.geoAnalysis.languageAnalysis,
                timing: topicAnalyses.geoAnalysis.timeZoneStrategy,
                cultural: topicAnalyses.geoAnalysis.culturalRelevance,
                localization: topicAnalyses.geoAnalysis.localizationStrategy,
                expansion: topicAnalyses.geoAnalysis.marketExpansion,
                adaptation: topicAnalyses.geoAnalysis.contentAdaptation
            } : null,
            predictiveAnalysis: topicAnalyses.trendPredictions ? {
                shortTerm: topicAnalyses.trendPredictions.shortTerm,
                midTerm: topicAnalyses.trendPredictions.midTerm,
                longTerm: topicAnalyses.trendPredictions.longTerm,
                confidence: topicAnalyses.trendPredictions.confidenceScores,
                risks: topicAnalyses.trendPredictions.riskAssessment,
                opportunities: topicAnalyses.trendPredictions.opportunities,
                actionable: topicAnalyses.trendPredictions.actionableInsights
            } : null,
            recommendations: generateEnhancedRecommendations(
                trendingTopicsToSend,
                competitorAnalysis,
                topicAnalyses.videoOptimization
            )
        };

        res.status(200).json(insights);
    } catch (error) {
        console.error('Error in trend analysis:', error);
        res.status(500).json({
            message: 'Error analyzing trends',
            error: error.message
        });
    }
}

function generateEnhancedRecommendations(trendingTopics, competitorAnalysis, videoOptimization) {
    try {
        const recommendations = [];
        const competitorTopics = new Set(
            (Array.isArray(competitorAnalysis) ? competitorAnalysis : [])
                .filter(item => item?.topic)
                .map(item => item.topic.toLowerCase())
        );
        const untappedTrends = (Array.isArray(trendingTopics) ? trendingTopics : [])
            .filter(item => item?.topic && !competitorTopics.has(item.topic.toLowerCase()));

        if (untappedTrends.length > 0) {
            recommendations.push({
                type: 'opportunity',
                message: 'Trending topics your competitors haven\'t covered yet:',
                topics: untappedTrends.slice(0, 5)
            });
        }

        const competitorList = Array.isArray(competitorAnalysis) ? competitorAnalysis : [];
        const popularCompetitorTopics = competitorList
            .filter(item => item?.frequency >= 3)
            .slice(0, 5);

        if (popularCompetitorTopics.length > 0) {
            recommendations.push({
                type: 'competitive',
                message: 'Popular topics among competitors:',
                topics: popularCompetitorTopics
            });
        }

        if (videoOptimization?.competitorInsights) {
            const { competitorInsights, engagement } = videoOptimization;

            recommendations.push({
                type: 'optimization',
                message: 'Video Optimization Tips:',
                recommendations: [
                    `Optimal title length: ${competitorInsights.commonPatterns.titleLength} characters`,
                    `Use ${competitorInsights.commonPatterns.tagsCount} relevant tags`,
                    `Best upload times: ${getBestUploadTimes(competitorInsights.commonPatterns.uploadTimes)}`,
                    `Target engagement: ${engagement.avgLikes} likes, ${engagement.avgComments} comments`
                ]
            });

            if (competitorInsights.topPerformers?.length > 0) {
                recommendations.push({
                    type: 'topVideos',
                    message: 'Top Performing Videos in This Space:',
                    videos: competitorInsights.topPerformers.slice(0, 3).map(video => ({
                        title: video.title,
                        views: video.views.toLocaleString(),
                        engagement: `${Math.round((video.likes / video.views) * 100)}% engagement rate`
                    }))
                });
            }

            recommendations.push({
                type: 'strategy',
                message: 'Content Strategy Recommendations:',
                strategies: [
                    'Create comprehensive tutorials with timestamps',
                    'Include data-driven insights and statistics',
                    'Add practical examples and demonstrations',
                    'Engage with comments to boost visibility'
                ]
            });
        }

        return recommendations;
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return [];
    }
}

function getBestUploadTimes(uploadTimes) {
    if (!uploadTimes || typeof uploadTimes !== 'object') {
        return 'Not available';
    }

    try {
        const sortedTimes = Object.entries(uploadTimes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => {
                const hourNum = parseInt(hour);
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                const hour12 = hourNum % 12 || 12;
                return `${hour12}${ampm}`;
            });

        return sortedTimes.join(', ');
    } catch (error) {
        console.error('Error calculating best upload times:', error);
        return 'Not available';
    }
}