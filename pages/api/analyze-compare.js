export default async function handler(req, res) {
  // Validate HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Validate request body
    const { channelsData } = req.body;
    
    if (!channelsData || !Array.isArray(channelsData) || channelsData.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request data. Provide non-empty array of channels.' 
      });
    }

    // Enhanced channel data formatting with error handling
    const formattedData = channelsData.map((channel, index) => {
      try {
        const stats = channel.statistics || {};
        const snippet = channel.snippet || {};
        const videosData = channel.videosData || { latest: [], popular: [] };
        
        // Calculate additional metrics
        const subscriberCount = parseInt(stats.subscriberCount) || 0;
        const viewCount = parseInt(stats.viewCount) || 0;
        const videoCount = parseInt(stats.videoCount) || 0;
        
        const avgViewsPerVideo = videoCount > 0 ? Math.round(viewCount / videoCount) : 0;
        const engagementRate = calculateEngagementRate(videosData);
        
        return {
          id: channel.id || `channel_${index}`,
          name: snippet.title || 'Unknown Channel',
          description: snippet.description || '',
          country: snippet.country || 'Unknown',
          publishedAt: snippet.publishedAt || null,
          subscribers: subscriberCount,
          views: viewCount,
          videos: videoCount,
          avgViewsPerVideo,
          engagementRate,
          videosData: {
            latest: formatVideos(videosData.latest, 'recent'),
            popular: formatVideos(videosData.popular, 'popular')
          },
          customMetrics: {
            subscriberToViewRatio: subscriberCount > 0 ? (viewCount / subscriberCount).toFixed(2) : 0,
            videosPerMonth: calculateVideosPerMonth(snippet.publishedAt, videoCount)
          }
        };
      } catch (error) {
        console.error(`Error processing channel ${index}:`, error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries

    if (formattedData.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No valid channel data could be processed.' 
      });
    }

    // Create an enhanced prompt with more context
    const prompt = createAnalysisPrompt(formattedData);

    // Configure Groq API request with better parameters
    const groqResponse = await callGroqAPI(prompt);
    
    if (!groqResponse.success) {
      throw new Error(groqResponse.error || 'Failed to get AI analysis');
    }

    // Process and validate the AI response
    const analysis = processAIResponse(groqResponse.data);

    // Add metadata to the response
    const finalResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      channelsAnalyzed: formattedData.length,
      analysis,
      metadata: {
        model: process.env.QWEN_MODEL_ID || 'qwen-default',
        processingTime: Date.now() - req.startTime || 0
      }
    };

    return res.status(200).json(finalResponse);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze channels',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper functions
function calculateEngagementRate(videosData) {
  const allVideos = [...(videosData.latest || []), ...(videosData.popular || [])];
  if (allVideos.length === 0) return 0;
  
  const totalEngagement = allVideos.reduce((sum, video) => {
    const views = parseInt(video.statistics?.viewCount) || 0;
    const likes = parseInt(video.statistics?.likeCount) || 0;
    const comments = parseInt(video.statistics?.commentCount) || 0;
    return sum + (views > 0 ? ((likes + comments) / views) * 100 : 0);
  }, 0);
  
  return (totalEngagement / allVideos.length).toFixed(2);
}

function formatVideos(videos, type) {
  if (!Array.isArray(videos)) return [];
  
  return videos.slice(0, 10).map(video => ({
    id: video.id?.videoId || video.id || '',
    title: video.snippet?.title || 'Untitled',
    publishedAt: video.snippet?.publishedAt || null,
    views: parseInt(video.statistics?.viewCount) || 0,
    likes: parseInt(video.statistics?.likeCount) || 0,
    comments: parseInt(video.statistics?.commentCount) || 0,
    duration: video.contentDetails?.duration || '',
    engagement: calculateVideoEngagement(video),
    type
  }));
}

function calculateVideoEngagement(video) {
  const views = parseInt(video.statistics?.viewCount) || 0;
  const likes = parseInt(video.statistics?.likeCount) || 0;
  const comments = parseInt(video.statistics?.commentCount) || 0;
  
  if (views === 0) return 0;
  return (((likes + comments) / views) * 100).toFixed(2);
}

function calculateVideosPerMonth(publishedAt, videoCount) {
  if (!publishedAt || videoCount === 0) return 0;
  
  const monthsSincePublished = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsSincePublished > 0 ? (videoCount / monthsSincePublished).toFixed(2) : 0;
}

function createAnalysisPrompt(formattedData) {
  return `As a YouTube analytics expert, provide a comprehensive analysis of these ${formattedData.length} YouTube channels:

${formattedData.map((channel, index) => `
### Channel ${index + 1}: ${channel.name}
**Basic Metrics:**
- Subscribers: ${channel.subscribers.toLocaleString()}
- Total Views: ${channel.views.toLocaleString()}
- Video Count: ${channel.videos.toLocaleString()}
- Average Views per Video: ${channel.avgViewsPerVideo.toLocaleString()}
- Engagement Rate: ${channel.engagementRate}%
- Videos per Month: ${channel.customMetrics.videosPerMonth}

**Recent Videos Performance:**
${channel.videosData.latest.slice(0, 5).map(v => 
  `- "${v.title}" - ${v.views.toLocaleString()} views, ${v.engagement}% engagement`
).join('\n')}

**Top Performing Videos:**
${channel.videosData.popular.slice(0, 5).map(v => 
  `- "${v.title}" - ${v.views.toLocaleString()} views, ${v.engagement}% engagement`
).join('\n')}
`).join('\n\n')}

Please provide a detailed JSON analysis with the following structure:
{
  "executiveSummary": "Brief overview of all channels",
  "comparativeMetrics": {
    "growthAnalysis": "Detailed growth comparison",
    "performanceRanking": "Ranking with justification",
    "marketPosition": "Position in their respective niches"
  },
  "contentStrategy": {
    "topicsAnalysis": "Common themes and unique approaches",
    "postingPatterns": "Frequency and timing insights",
    "contentQuality": "Production value and engagement quality"
  },
  "audienceEngagement": {
    "engagementPatterns": "How audiences interact",
    "communityStrength": "Community building effectiveness",
    "loyaltyIndicators": "Signs of audience loyalty"
  },
  "competitiveAnalysis": {
    "strengths": "Key advantages of each channel",
    "weaknesses": "Areas needing improvement",
    "opportunities": "Growth opportunities",
    "threats": "Competitive threats"
  },
  "recommendations": {
    "immediate": "Quick wins for each channel",
    "shortTerm": "3-6 month strategies",
    "longTerm": "6-12 month vision"
  },
  "predictiveInsights": {
    "growthProjections": "Expected growth trajectories",
    "trendAlignment": "Alignment with platform trends",
    "sustainabilityScore": "Long-term viability rating"
  }
}`;
}

async function callGroqAPI(prompt) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL_ID || 'mixtral-8x7b-32768',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert YouTube analytics consultant with deep knowledge of content strategy, audience engagement, and platform algorithms. Provide detailed, actionable insights in well-structured JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.choices?.[0]?.message?.content || ''
    };
  } catch (error) {
    console.error('Groq API call failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function processAIResponse(aiOutput) {
  if (!aiOutput) {
    return {
      error: 'No AI response received',
      fallback: getDefaultAnalysis()
    };
  }

  try {
    // Try to parse as JSON first
    if (typeof aiOutput === 'string') {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiOutput.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiOutput;
      
      // Clean up common JSON issues
      const cleanedJson = jsonString
        .replace(/^\s*\n/gm, '') // Remove empty lines
        .replace(/,\s*}/g, '}')   // Remove trailing commas
        .replace(/,\s*]/g, ']');  // Remove trailing commas in arrays
      
      const parsed = JSON.parse(cleanedJson);
      
      // Validate the structure
      if (validateAnalysisStructure(parsed)) {
        return {
          ...parsed,
          analysisComplete: true,
          generatedAt: new Date().toISOString()
        };
      } else {
        return {
          ...getDefaultAnalysis(),
          partialData: parsed,
          warning: 'Incomplete analysis structure'
        };
      }
    }
    
    // If already an object
    if (typeof aiOutput === 'object') {
      return validateAnalysisStructure(aiOutput) ? aiOutput : {
        ...getDefaultAnalysis(),
        partialData: aiOutput
      };
    }
    
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    
    // Attempt to extract useful information from raw text
    return {
      ...getDefaultAnalysis(),
      rawAnalysis: aiOutput,
      parseError: error.message,
      fallbackMode: true
    };
  }
}

function validateAnalysisStructure(analysis) {
  const requiredKeys = [
    'executiveSummary',
    'comparativeMetrics',
    'contentStrategy',
    'audienceEngagement',
    'competitiveAnalysis',
    'recommendations',
    'predictiveInsights'
  ];
  
  return requiredKeys.every(key => key in analysis);
}

function getDefaultAnalysis() {
  return {
    executiveSummary: 'Analysis pending - data processing in progress',
    comparativeMetrics: {
      growthAnalysis: 'Unable to determine growth patterns',
      performanceRanking: 'Ranking unavailable',
      marketPosition: 'Market position analysis pending'
    },
    contentStrategy: {
      topicsAnalysis: 'Content analysis incomplete',
      postingPatterns: 'Pattern recognition failed',
      contentQuality: 'Quality assessment unavailable'
    },
    audienceEngagement: {
      engagementPatterns: 'Engagement data processing',
      communityStrength: 'Community metrics unavailable',
      loyaltyIndicators: 'Loyalty analysis pending'
    },
    competitiveAnalysis: {
      strengths: 'Strengths assessment in progress',
      weaknesses: 'Weaknesses identification pending',
      opportunities: 'Opportunity analysis unavailable',
      threats: 'Threat assessment incomplete'
    },
    recommendations: {
      immediate: 'Generate custom recommendations manually',
      shortTerm: 'Short-term strategy pending',
      longTerm: 'Long-term vision development needed'
    },
    predictiveInsights: {
      growthProjections: 'Projections unavailable',
      trendAlignment: 'Trend analysis pending',
      sustainabilityScore: 'Score calculation in progress'
    },
    metadata: {
      analysisStatus: 'fallback',
      timestamp: new Date().toISOString(),
      message: 'Using default analysis template due to processing issues'
    }
  };
}

// Middleware to track request timing
export function middleware(req, res) {
  req.startTime = Date.now();
}

// Additional utility functions for enhanced analysis

function calculateChannelHealth(channel) {
  const factors = {
    subscriberGrowth: channel.customMetrics.subscriberToViewRatio > 100 ? 1 : 0.5,
    consistency: channel.customMetrics.videosPerMonth > 4 ? 1 : 0.5,
    engagement: parseFloat(channel.engagementRate) > 5 ? 1 : 0.5,
    viewPerformance: channel.avgViewsPerVideo > (channel.subscribers * 0.1) ? 1 : 0.5
  };
  
  const healthScore = Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;
  return {
    score: (healthScore * 100).toFixed(0),
    factors,
    rating: healthScore > 0.8 ? 'Excellent' : healthScore > 0.6 ? 'Good' : healthScore > 0.4 ? 'Fair' : 'Needs Improvement'
  };
}

// Error recovery function
async function attemptErrorRecovery(error, formattedData) {
  // Try a simpler analysis if the main one fails
  try {
    const simplePrompt = `Analyze these YouTube channels briefly:
${formattedData.map(ch => `${ch.name}: ${ch.subscribers} subs, ${ch.views} views`).join('\n')}

Provide a simple comparison focusing on size, engagement, and growth potential.`;

    const response = await callGroqAPI(simplePrompt);
    if (response.success) {
      return {
        ...getDefaultAnalysis(),
        executiveSummary: response.data,
        simplified: true,
        recoveryMode: true
      };
    }
  } catch (recoveryError) {
    console.error('Recovery attempt failed:', recoveryError);
  }
  
  return null;
}

// Rate limiting helper (if needed)
const requestQueue = new Map();

function rateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const requests = requestQueue.get(key) || [];
  
  // Clean old requests
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  requestQueue.set(key, validRequests);
  return true;
}

// Export additional utilities if needed
export const utils = {
  calculateChannelHealth,
  calculateEngagementRate,
  formatVideos,
  validateAnalysisStructure
};