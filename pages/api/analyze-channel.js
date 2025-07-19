import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.groq_api_key,
});

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

    console.log(`Analyzing ${videos.length} videos for channel: ${channelName}`);

    // Prepare video data for analysis
    const videoData = videos.map(video => {
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

    // Create prompt for Groq API
    const prompt = `As a YouTube content strategist, analyze these videos from the channel "${channelName}":
    ${JSON.stringify(videoData, null, 2)}

    Based on this data, provide analysis in the following format:
    1. Top performing video themes
    2. Most effective tags
    3. Best performing video types
    4. Optimal video length patterns
    5. Best posting times/days
    6. 10 specific video ideas with titles and brief descriptions that could perform well on this channel and suggested tags for each idea.
    - Each video idea should include:
      - Title  
        - Description
        - Suggested tags
    Provide insights on:
    1. Themes that resonate with the audience
    2. Tags that drive engagement
    3. Types of videos that perform best
    4. Length patterns that keep viewers engaged
    5. Posting patterns that maximize reach and engagement
    6. Video ideas that align with the channel's content strategy and audience interests
    7. Suggested tags for each video idea

    Format the response as JSON with the following structure:
    {
      "themes": ["theme1", "theme2", ...],
      "effectiveTags": ["tag1", "tag2", ...],
      "videoTypes": ["type1", "type2", ...],
      "lengthPatterns": "description",
      "postingPatterns": "description",
      "videoIdeas": [
        {
          "title": "title",
          "description": "description",
          "suggestedTags": ["tag1", "tag2", ...]
        }
      ]
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
      model: process.env.groq_api_model,
      temperature: 0.7,
      max_tokens: 2048,
    });

    console.log('Received Groq API response');
    
    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No response from Groq API');
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    console.log('Parsing API response...');
    let analysis;
    try {
      // First, try to find JSON content within the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try to parse the entire content
        analysis = JSON.parse(content);
      }

      // Validate the required fields
      if (!analysis.themes) analysis.themes = [];
      if (!analysis.effectiveTags) analysis.effectiveTags = [];
      if (!analysis.videoTypes) analysis.videoTypes = [];
      if (!analysis.lengthPatterns) analysis.lengthPatterns = '';
      if (!analysis.postingPatterns) analysis.postingPatterns = '';
      if (!analysis.videoIdeas) analysis.videoIdeas = [];

      // Ensure videoIdeas are in correct format
      analysis.videoIdeas = analysis.videoIdeas.map(idea => ({
        title: idea.title || '',
        description: idea.description || '',
        suggestedTags: Array.isArray(idea.suggestedTags) ? idea.suggestedTags : []
      }));

    } catch (parseError) {
      console.error('Error parsing Groq response:', content);
      console.error('Parse error:', parseError);
      
      // Attempt to create a structured response from unstructured content
      try {
        const lines = content.split('\n');
        analysis = {
          themes: [],
          effectiveTags: [],
          videoTypes: [],
          lengthPatterns: '',
          postingPatterns: '',
          videoIdeas: []
        };

        let currentSection = null;
        let currentIdea = null;

        for (const line of lines) {
          if (line.includes('themes:') || line.includes('Themes:')) currentSection = 'themes';
          else if (line.includes('tags:') || line.includes('Tags:')) currentSection = 'tags';
          else if (line.includes('video types:') || line.includes('Video Types:')) currentSection = 'videoTypes';
          else if (line.includes('length patterns:') || line.includes('Length Patterns:')) currentSection = 'lengthPatterns';
          else if (line.includes('posting patterns:') || line.includes('Posting Patterns:')) currentSection = 'postingPatterns';
          else if (line.includes('Video Idea') || line.includes('Title:')) {
            currentSection = 'videoIdea';
            currentIdea = { title: '', description: '', suggestedTags: [] };
            analysis.videoIdeas.push(currentIdea);
          }
          
          if (line.trim() && currentSection && currentIdea) {
            if (line.includes('Title:')) currentIdea.title = line.split('Title:')[1].trim();
            else if (line.includes('Description:')) currentIdea.description = line.split('Description:')[1].trim();
            else if (line.includes('Tags:')) {
              const tags = line.split('Tags:')[1].trim().split(',').map(t => t.trim());
              currentIdea.suggestedTags = tags;
            }
          }
        }
      } catch (structureError) {
        console.error('Failed to structure response:', structureError);
        throw new Error('Could not parse or structure the API response');
      }
    }

    console.log('Analysis completed successfully');
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error analyzing channel:', error);
    
    // Send more detailed error message
    res.status(500).json({ 
      message: 'Error analyzing channel', 
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}
