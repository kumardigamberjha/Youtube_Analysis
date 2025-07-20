import { isCached, getCachedData, saveToCache, pendingRequests } from './cache';

const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function getChannelIdFromUrl(urlOrName) {
  // Generate a cache key from the URL or name
  const cacheKey = `channel_id_${urlOrName}`;

  // Check cache first
  if (isCached(cacheKey)) {
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Add to pending requests
  pendingRequests.set(cacheKey, true);

  try {
    // Try to extract channel ID from URL patterns
    const channelMatch = urlOrName.match(/channel\/([\w-]+)/);
    if (channelMatch) {
      const channelId = channelMatch[1];
      await saveToCache(cacheKey, channelId);
      pendingRequests.delete(cacheKey);
      return channelId;
    }

    // Try to get channel ID from handle
    const handleMatch = urlOrName.match(/@([\w-]+)/);
    if (handleMatch) {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handleMatch[1]}&key=${YT_API_KEY}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const channelId = data.items[0].snippet.channelId;
        await saveToCache(cacheKey, channelId);
        pendingRequests.delete(cacheKey);
        return channelId;
      }
    }

    // Try to get channel ID from search
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(urlOrName)}&key=${YT_API_KEY}`);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].snippet.channelId;
      await saveToCache(cacheKey, channelId);
      pendingRequests.delete(cacheKey);
      return channelId;
    }

    pendingRequests.delete(cacheKey);
    return null;
  } catch (error) {
    console.error('Error getting channel ID:', error);
    pendingRequests.delete(cacheKey);
    throw error;
  }
}

export async function getChannelStats(channelId) {
  // Check cache first
  if (isCached(channelId)) {
    const cachedData = await getCachedData(channelId);
    if (cachedData) {
      return cachedData;
    }
  }

  // Add to pending requests
  pendingRequests.set(channelId, true);

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YT_API_KEY}`);
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      pendingRequests.delete(channelId);
      return null;
    }
    const item = data.items[0];

    const channelData = {
      id: channelId,
      name: item.snippet.title,
      subscribers: parseInt(item.statistics.subscriberCount),
      views: parseInt(item.statistics.viewCount),
      videos_count: parseInt(item.statistics.videoCount),
      profile_image: item.snippet.thumbnails.default.url
    };

    // Save to cache
    await saveToCache(channelId, channelData);
    pendingRequests.delete(channelId);
    return channelData;
  } catch (error) {
    console.error('Error getting channel stats:', error);
    pendingRequests.delete(channelId);
    throw error;
  }
}

export async function getChannelVideos(channelId, maxResults = 10) {
  // Generate a unique cache key for this request
  const cacheKey = `${channelId}_videos_${maxResults}`;

  // Check cache first
  if (isCached(cacheKey)) {
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Add to pending requests
  pendingRequests.set(cacheKey, true);

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`);
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      pendingRequests.delete(cacheKey);
      return [];
    }

    const playlistId = data.items[0].contentDetails.relatedPlaylists.uploads;
    let videos = [];
    let nextPageToken = '';

    while (videos.length < maxResults) {
      const res2 = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${Math.min(50, maxResults - videos.length)}&pageToken=${nextPageToken}&key=${YT_API_KEY}`);
      const data2 = await res2.json();
      if (!data2.items) break;

      for (const item of data2.items) {
        videos.push({
          id: item.contentDetails.videoId,
          title: item.snippet.title,
          upload_date: item.contentDetails.videoPublishedAt,
          thumbnail_url: item.snippet.thumbnails.default.url
        });
      }
      nextPageToken = data2.nextPageToken || '';
      if (!nextPageToken) break;
    }

    // Save to cache
    await saveToCache(cacheKey, videos);
    pendingRequests.delete(cacheKey);
    return videos;
  } catch (error) {
    console.error('Error getting channel videos:', error);
    pendingRequests.delete(cacheKey);
    throw error;
  }
}
