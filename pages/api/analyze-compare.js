export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { channelsData } = req.body;
    
    if (!channelsData || !Array.isArray(channelsData)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Format channel data for analysis
    const formattedData = channelsData.map(channel => ({
      name: channel.snippet?.title || 'Unknown Channel',
      subscribers: parseInt(channel.statistics?.subscriberCount) || 0,
      views: parseInt(channel.statistics?.viewCount) || 0,
      videos: parseInt(channel.statistics?.videoCount) || 0,
      videosData: channel.videosData || { latest: [], popular: [] },
    }));

    // Create a detailed prompt for the Qwen model
    const prompt = `Analyze these YouTube channels and provide a detailed comparative analysis:

${formattedData.map((channel, index) => `
Channel ${index + 1}: ${channel.name}
- Subscribers: ${channel.subscribers.toLocaleString()}
- Total Views: ${channel.views.toLocaleString()}
- Video Count: ${channel.videos.toLocaleString()}
- Recent Videos: ${channel.videosData.latest.slice(0, 5).map(v => ({
  title: v.snippet?.title,
  views: parseInt(v.statistics?.viewCount) || 0,
  likes: parseInt(v.statistics?.likeCount) || 0
})).map(v => v.title).join(', ')}
- Top Videos: ${channel.videosData.popular.slice(0, 5).map(v => ({
  title: v.snippet?.title,
  views: parseInt(v.statistics?.viewCount) || 0,
  likes: parseInt(v.statistics?.likeCount) || 0
})).map(v => v.title).join(', ')}
`).join('\n')}

Provide a detailed analysis including:
1. Comparative Metrics Analysis
2. Content Strategy Comparison
3. Engagement Patterns
4. Growth Potential
5. Recommendations for Each Channel
6. Competitive Advantages
7. Areas for Improvement

Format the response in JSON with these sections as keys.`;

    // Call Qwen model using Groq API
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL_ID,
        messages: [
          { role: 'system', content: 'You are an AI expert in analyzing YouTube channels and providing detailed comparative analysis.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.8
      })
    });
    const groqData = await groqRes.json();
    let qwenOutput = groqData.choices?.[0]?.message?.content || groqData;

    // Parse the response and format it
    let analysis;
    try {
      // If the response is already an object, use it directly
      if (typeof qwenOutput === 'object') {
        analysis = qwenOutput;
      } else {
        // If it's a string, try to parse it as JSON
        analysis = JSON.parse(qwenOutput);
      }
    } catch (e) {
      // If parsing fails, structure the raw output
      analysis = {
        raw: qwenOutput,
        error: "Failed to parse structured data"
      };
    }

    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      message: 'Failed to analyze channels',
      error: error.message
    });
  }
}
