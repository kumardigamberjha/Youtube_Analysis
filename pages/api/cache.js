import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Get cached data
      try {
        const { channelId } = req.query;
        const today = new Date().toISOString().split('T')[0];
        const cacheFile = path.join(CACHE_DIR, `${channelId}_${today}.json`);

        if (fs.existsSync(cacheFile)) {
          const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          res.status(200).json(data);
        } else {
          res.status(404).json({ message: 'Cache not found' });
        }
      } catch (error) {
        res.status(500).json({ message: 'Error reading cache' });
      }
      break;

    case 'POST':
      // Save to cache
      try {
        const { channelId, data } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const cacheFile = path.join(CACHE_DIR, `${channelId}_${today}.json`);

        fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
        res.status(200).json({ message: 'Cache saved successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Error saving cache' });
      }
      break;

    case 'DELETE':
      // Clean up old cache files
      try {
        const today = new Date().toISOString().split('T')[0];
        const files = fs.readdirSync(CACHE_DIR);

        files.forEach(file => {
          const filePath = path.join(CACHE_DIR, file);
          const fileDate = file.split('_')[1].split('.')[0];
          if (fileDate !== today) {
            fs.unlinkSync(filePath);
          }
        });

        res.status(200).json({ message: 'Old cache files cleaned up' });
      } catch (error) {
        res.status(500).json({ message: 'Error cleaning up cache' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
