const CACHE_PREFIX = 'yt_analyzer_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Keep track of ongoing requests
export const pendingRequests = new Map();

// Check if data is cached and valid
export function isCached(channelId) {
  try {
    if (typeof window === 'undefined') return false;
    
    // Check if there's an ongoing request
    if (pendingRequests.has(channelId)) {
      return true; // Consider it as cached if request is in progress
    }
    
    const cacheKey = `${CACHE_PREFIX}${channelId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) return false;
    
    const { timestamp } = JSON.parse(cachedData);
    const now = new Date().getTime();
    
    // Check if cache is expired (24 hours)
    if (now - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking cache:', error);
    return false;
  }
}

// Get cached data for a channel
export async function getCachedData(channelId) {
  try {
    if (typeof window === 'undefined') return null;
    
    const cacheKey = `${CACHE_PREFIX}${channelId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) return null;
    
    const { data, timestamp } = JSON.parse(cachedData);
    const now = new Date().getTime();
    
    // Check if cache is expired (24 hours)
    if (now - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('Using cached data for channel:', channelId);
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

// Save data to cache
export async function saveToCache(channelId, data) {
  try {
    if (typeof window === 'undefined') return false;
    
    const cacheKey = `${CACHE_PREFIX}${channelId}`;
    const cacheData = {
      data,
      timestamp: new Date().getTime()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('Saved to cache:', channelId);
    
    // Remove from pending requests after caching
    pendingRequests.delete(channelId);
    
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    // Clean up pending request on error
    pendingRequests.delete(channelId);
    return false;
  }
}

// Clean up old cache
export async function cleanupOldCache() {
  try {
    if (typeof window === 'undefined') return;
    
    const now = new Date().getTime();
    
    // Get all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const cachedData = JSON.parse(localStorage.getItem(key));
          if (now - cachedData.timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If data is corrupted, remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    return false;
  }
}
