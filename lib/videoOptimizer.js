import { saveToCache, getCachedData, isCached } from './cache';

const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function getVideoOptimization(topic, timeRange = '24h') {
    const cacheKey = `video_optimization_${topic}_${timeRange}`;
    
    if (isCached(cacheKey)) {
        return await getCachedData(cacheKey);
    }

    try {
        // Get top performing videos for the topic
        const searchResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&order=viewCount&maxResults=50&key=${YT_API_KEY}`
        );
        const searchData = await searchResponse.json();

        // Get detailed video information including tags and statistics
        const videoIds = searchData.items.map(item => item.id.videoId).join(',');
        const detailsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,topicDetails&id=${videoIds}&key=${YT_API_KEY}`
        );
        const detailsData = await detailsResponse.json();

        const analysis = analyzeTopVideos(detailsData.items || []);
        await saveToCache(cacheKey, analysis, 3600); // Cache for 1 hour
        return analysis;
    } catch (error) {
        console.error('Error analyzing videos:', error);
        return null;
    }
}

function analyzeTopVideos(videos) {
    // Collect all tags and their frequencies
    const tagFrequency = {};
    const titlePatterns = [];
    const descriptions = [];
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    videos.forEach(video => {
        const { snippet, statistics } = video;
        
        // Analyze tags
        if (snippet.tags) {
            snippet.tags.forEach(tag => {
                tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
            });
        }

        // Collect title patterns
        titlePatterns.push(analyzeTitlePattern(snippet.title));

        // Collect description patterns
        descriptions.push(analyzeDescription(snippet.description));

        // Collect engagement metrics
        totalViews += parseInt(statistics.viewCount) || 0;
        totalLikes += parseInt(statistics.likeCount) || 0;
        totalComments += parseInt(statistics.commentCount) || 0;
    });

    // Generate recommended tags
    const recommendedTags = Object.entries(tagFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag]) => tag);

    // Generate title suggestions
    const titleSuggestions = generateTitleSuggestions(titlePatterns, videos[0].snippet.title);

    // Generate description template
    const descriptionTemplate = generateDescriptionTemplate(descriptions);

    return {
        recommendedTags,
        titleSuggestions,
        descriptionTemplate,
        engagement: {
            avgViews: Math.round(totalViews / videos.length),
            avgLikes: Math.round(totalLikes / videos.length),
            avgComments: Math.round(totalComments / videos.length),
        },
        aidaScript: generateAIDAScript(videos[0].snippet.title, recommendedTags),
        competitorInsights: analyzeCompetitorVideos(videos)
    };
}

function analyzeTitlePattern(title) {
    return {
        length: title.length,
        hasNumber: /\d+/.test(title),
        hasQuestion: /\?/.test(title),
        hasEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(title),
        hasBrackets: /[\[\(\{].*[\]\)\}]/.test(title),
        words: title.split(' ').length,
        hasYear: /(20\d{2}|19\d{2})/.test(title)
    };
}

function analyzeDescription(description) {
    const sections = description.split('\n\n').filter(Boolean);
    return {
        length: description.length,
        sections: sections.length,
        hasLinks: /http[s]?:\/\//.test(description),
        hasHashtags: /#[\w-]+/.test(description),
        hasTimestamps: /\d{1,2}:\d{2}/.test(description)
    };
}

function generateTitleSuggestions(patterns, sampleTitle) {
    // Analyze what works in successful titles
    const patternStats = patterns.reduce((acc, pattern) => {
        Object.keys(pattern).forEach(key => {
            if (typeof pattern[key] === 'boolean') {
                acc[key] = (acc[key] || 0) + (pattern[key] ? 1 : 0);
            } else if (typeof pattern[key] === 'number') {
                acc[key] = (acc[key] || 0) + pattern[key];
            }
        });
        return acc;
    }, {});

    // Generate title templates based on successful patterns
    const templates = [
        "How to [Topic] in [Year] (Complete Guide)",
        "[Number] Best [Topic] Tips That Actually Work",
        "The Ultimate [Topic] Tutorial for Beginners",
        "[Topic] Masterclass: From Beginner to Pro",
        "Why [Topic] Is Essential for [Benefit]"
    ];

    return templates.map(template => 
        template.replace('[Topic]', sampleTitle.split(' ')[0])
               .replace('[Year]', new Date().getFullYear())
               .replace('[Number]', Math.floor(Math.random() * 10) + 5)
               .replace('[Benefit]', 'Success')
    );
}

function generateDescriptionTemplate(descriptions) {
    return `🎥 VIDEO OVERVIEW
[Brief introduction to the topic]

⏰ TIMESTAMPS
00:00 - Introduction
[Add your timestamps here]

🔑 KEY POINTS COVERED
• [Main point 1]
• [Main point 2]
• [Main point 3]

📚 RESOURCES MENTIONED
• [Resource 1]
• [Resource 2]

🔗 USEFUL LINKS
• Website: [Your website]
• Twitter: [Your Twitter]
• Instagram: [Your Instagram]

#[Topic] #[RelatedTopic1] #[RelatedTopic2]

✨ Don't forget to LIKE, SUBSCRIBE, and hit the NOTIFICATION BELL! ✨`;
}

function generateAIDAScript(title, tags) {
    return {
        attention: {
            hook: `Did you know that mastering ${tags[0]} can transform your ${tags[1]}?`,
            statistic: "According to recent studies, experts in this field are in high demand",
            question: `Are you struggling with ${tags[0]}?`
        },
        interest: {
            problem: `Many people find ${tags[0]} overwhelming and complex`,
            solution: "In this video, I'll break down the process into simple, actionable steps",
            uniqueAngle: `Unlike other tutorials, we'll focus on real-world applications`
        },
        desire: {
            benefits: [
                "Master the fundamentals in record time",
                "Learn insider techniques",
                "Get practical tips you can apply immediately"
            ],
            socialProof: "Join thousands of successful learners who have mastered this technique"
        },
        action: {
            mainCTA: "Watch till the end for a complete understanding",
            bonusOffer: "Free cheat sheet in the description",
            engagement: "Like and subscribe for more tutorials like this"
        }
    };
}

function analyzeCompetitorVideos(videos) {
    const analysis = {
        topPerformers: [],
        commonPatterns: {
            titleLength: 0,
            descriptionLength: 0,
            tagsCount: 0,
            uploadTimes: {},
            engagement: {
                viewsToLikes: 0,
                viewsToComments: 0
            }
        }
    };

    videos.forEach(video => {
        const { snippet, statistics } = video;
        
        // Analyze upload time
        const uploadHour = new Date(snippet.publishedAt).getHours();
        analysis.commonPatterns.uploadTimes[uploadHour] = 
            (analysis.commonPatterns.uploadTimes[uploadHour] || 0) + 1;

        // Collect averages
        analysis.commonPatterns.titleLength += snippet.title.length;
        analysis.commonPatterns.descriptionLength += snippet.description.length;
        analysis.commonPatterns.tagsCount += (snippet.tags || []).length;

        // Calculate engagement rates
        const views = parseInt(statistics.viewCount) || 0;
        const likes = parseInt(statistics.likeCount) || 0;
        const comments = parseInt(statistics.commentCount) || 0;

        if (views > 0) {
            analysis.commonPatterns.engagement.viewsToLikes += likes / views;
            analysis.commonPatterns.engagement.viewsToComments += comments / views;
        }

        // Store top performers
        if (views > 10000) {
            analysis.topPerformers.push({
                title: snippet.title,
                views,
                likes,
                comments,
                publishedAt: snippet.publishedAt
            });
        }
    });

    // Calculate averages
    const videoCount = videos.length;
    analysis.commonPatterns.titleLength = Math.round(analysis.commonPatterns.titleLength / videoCount);
    analysis.commonPatterns.descriptionLength = Math.round(analysis.commonPatterns.descriptionLength / videoCount);
    analysis.commonPatterns.tagsCount = Math.round(analysis.commonPatterns.tagsCount / videoCount);
    analysis.commonPatterns.engagement.viewsToLikes = 
        Math.round((analysis.commonPatterns.engagement.viewsToLikes / videoCount) * 100);
    analysis.commonPatterns.engagement.viewsToComments = 
        Math.round((analysis.commonPatterns.engagement.viewsToComments / videoCount) * 100);

    return analysis;
}
