const YT_API_KEY = 'AIzaSyBX4YpStMtYD_k-yXSys27mw3pCOSkmQT0';

export async function getChannelIdFromUrl(urlOrName) {
  const channelMatch = urlOrName.match(/channel\/([\w-]+)/);
  if (channelMatch) return channelMatch[1];
  const handleMatch = urlOrName.match(/@([\w-]+)/);
  if (handleMatch) {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handleMatch[1]}&key=${YT_API_KEY}`);
    const data = await res.json();
    if (data.items && data.items.length > 0) return data.items[0].snippet.channelId;
  }
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(urlOrName)}&key=${YT_API_KEY}`);
  const data = await res.json();
  if (data.items && data.items.length > 0) return data.items[0].snippet.channelId;
  return null;
}

export async function getChannelStats(channelId) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YT_API_KEY}`);
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;
  const item = data.items[0];
  return {
    id: channelId,
    name: item.snippet.title,
    subscribers: parseInt(item.statistics.subscriberCount),
    views: parseInt(item.statistics.viewCount),
    videos_count: parseInt(item.statistics.videoCount),
    profile_image: item.snippet.thumbnails.default.url
  };
}

export async function getChannelVideos(channelId, maxResults = 10) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`);
  const data = await res.json();
  if (!data.items || data.items.length === 0) return [];
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
  return videos;
} 