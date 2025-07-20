import fs from 'fs';
import path from 'path';

const CACHE_PREFIX = 'yt_analyzer_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_DIR = path.join(process.cwd(), 'public', 'cache');

// Ensure cache directory exists
const ensureCacheDirectory = () => {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      console.log('Cache directory created at:', CACHE_DIR);
    }
    return true;
  } catch (error) {
    console.error('Error creating cache directory:', error);
    return false;
  }
};

// Get cached data for a channel
export async function getFromCache(channelId) {
  try {
    const filePath = path.join(CACHE_DIR, `${CACHE_PREFIX}${channelId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const { data, timestamp } = JSON.parse(fileContent);
    const now = new Date().getTime();
    
    // Check if cache is expired (24 hours)
    if (now - timestamp > CACHE_EXPIRY) {
      await fs.promises.unlink(filePath); // Delete expired cache
      return null;
    }
    
    console.log('Using server cache for channel:', channelId);
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

// Save data to cache
export async function saveToCache(channelId, data) {
  try {
    if (!ensureCacheDirectory()) {
      throw new Error('Failed to ensure cache directory exists');
    }
    
    const filePath = path.join(CACHE_DIR, `${CACHE_PREFIX}${channelId}.json`);
    const cacheData = {
      data,
      timestamp: new Date().getTime()
    };
    
    await fs.promises.writeFile(filePath, JSON.stringify(cacheData, null, 2));
    console.log('Saved to server cache:', filePath);
    
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    return false;
  }
}

// Clean up old cache
export async function cleanCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return;
    }
    
    const files = await fs.promises.readdir(CACHE_DIR);
    const now = new Date().getTime();
    
    for (const file of files) {
      if (!file.startsWith(CACHE_PREFIX) || !file.endsWith('.json')) {
        continue;
      }
      
      try {
        const filePath = path.join(CACHE_DIR, file);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const { timestamp } = JSON.parse(fileContent);
        
        if (now - timestamp > CACHE_EXPIRY) {
          await fs.promises.unlink(filePath);
          console.log('Deleted expired cache file:', filePath);
        }
      } catch (e) {
        // If file is corrupted, remove it
        try {
          await fs.promises.unlink(path.join(CACHE_DIR, file));
          console.log('Deleted corrupted cache file:', file);
        } catch (unlinkError) {
          console.error('Error deleting corrupted cache file:', unlinkError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    return false;
  }
}
