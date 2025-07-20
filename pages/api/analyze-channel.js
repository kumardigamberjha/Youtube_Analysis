import { Groq } from 'groq-sdk';
import { saveToCache, getFromCache, cleanCache } from '../../lib/server-cache';

const groq = new Groq({
  apiKey: process.env.groq_api_key,
});

// Helper function to chunk array into smaller pieces
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Helper function to parse JSON content
const parseJsonContent = (content) => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting channel analysis...');
    
    if (!req.body) {
      throw new Error('Request body is missing');
    }

    const { videos, channelName } = req.body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      throw new Error('No videos provided for analysis');
    }

    if (!channelName) {
      throw new Error('Channel name is missing');
    }

    // Get channelId for caching
    const channelId = videos[0]?.snippet?.channelId;
    if (channelId) {
      const cachedAnalysis = await getFromCache(channelId);
      if (cachedAnalysis) {
        console.log('Returning cached analysis');
        return res.status(200).json(cachedAnalysis);
      }
    }

    console.log(`Analyzing ${videos.length} videos for channel: ${channelName}`);

    // Prepare video data for analysis
    const allVideoData = videos.map(video => {
      if (!video.snippet) {
        console.warn('Video missing snippet:', video.id);
        return null;
      }
      return {
        title: video.snippet.title,
        views: parseInt(video.statistics?.viewCount) || 0,
        likes: parseInt(video.statistics?.likeCount) || 0,
        publishDate: video.snippet.publishedAt,
        tags: video.snippet.tags || [],
        description: video.snippet.description
      };
    }).filter(Boolean);

    // Process videos in smaller chunks of 5 to stay within token limits
    const videoChunks = chunkArray(allVideoData, 5);
    console.log(`Processing ${videoChunks.length} chunks of videos...`);

    const chunkAnalyses = [];

    // Process each chunk
    for (let i = 0; i < videoChunks.length; i++) {
      const chunk = videoChunks[i];
      console.log(`Processing chunk ${i + 1} of ${videoChunks.length}...`);

      try {
        // Prepare a more concise version of the chunk data
        const compactChunk = chunk.map(video => ({
          title: video.title,
          views: video.views,
          tags: (video.tags || []).slice(0, 5), // Limit to top 5 tags
          publishDate: video.publishDate
        }));

        const prompt = `Analyze these YouTube videos from channel "${channelName}":
        ${JSON.stringify(compactChunk)}

        Return JSON only:
        {
          "themes": ["theme1", "theme2"],
          "effectiveTags": ["tag1", "tag2"],
          "videoTypes": ["type1", "type2"],
          "lengthPatterns": "brief pattern",
          "postingPatterns": "brief pattern"
        }`;

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are an expert YouTube content strategist and data analyst."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 2048
        });

        if (!completion.choices || completion.choices.length === 0) {
          throw new Error('No response from Groq API');
        }

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from Groq API');
        }

        const chunkAnalysis = parseJsonContent(content);
        if (chunkAnalysis) {
          chunkAnalyses.push(chunkAnalysis);
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        continue;
      }

      // Add a small delay between chunks to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (chunkAnalyses.length === 0) {
      throw new Error('Failed to analyze any video chunks');
    }

    // Combine analyses from all chunks
    const combinedAnalysis = {
      themes: [...new Set(chunkAnalyses.flatMap(a => a.themes || []))],
      effectiveTags: [...new Set(chunkAnalyses.flatMap(a => a.effectiveTags || []))],
      videoTypes: [...new Set(chunkAnalyses.flatMap(a => a.videoTypes || []))],
      lengthPatterns: chunkAnalyses.map(a => a.lengthPatterns).filter(Boolean)[0] || '',
      postingPatterns: chunkAnalyses.map(a => a.postingPatterns).filter(Boolean)[0] || ''
    };

    // Generate video ideas based on combined analysis
    try {
      const videoIdeasPrompt = `Based on themes:${combinedAnalysis.themes.join(',')} and tags:${combinedAnalysis.effectiveTags.join(',')}, generate 5 video ideas for channel "${channelName}". Return JSON only:
      {
        "videoIdeas": [
          {
            "title": "brief title",
            "description": "one line description",
            "suggestedTags": ["tag1", "tag2"]
          }
        ]
      }`;

      const ideasCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert YouTube content strategist and data analyst."
          },
          {
            role: "user",
            content: videoIdeasPrompt
          }
        ],
        model: process.env.groq_api_model,
        temperature: 0.7,
        max_tokens: 2048
      });

      const ideasContent = ideasCompletion.choices[0]?.message?.content;
      const parsedIdeas = ideasContent ? parseJsonContent(ideasContent) : null;
      
      const finalAnalysis = {
        ...combinedAnalysis,
        videoIdeas: parsedIdeas?.videoIdeas || []
      };

      // Save to cache if we have a channel ID
      if (channelId) {
        await saveToCache(channelId, finalAnalysis);
      }

      console.log('Analysis completed successfully');
      return res.status(200).json(finalAnalysis);

    } catch (ideasError) {
      console.error('Error generating video ideas:', ideasError);
      // Return combined analysis even if video ideas generation fails
      return res.status(200).json({
        ...combinedAnalysis,
        videoIdeas: []
      });
    }

  } catch (error) {
    console.error('Error analyzing channel:', error);
    
    res.status(500).json({ 
      message: 'Error analyzing channel', 
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
