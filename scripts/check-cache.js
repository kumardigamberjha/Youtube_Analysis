const fs = require('fs');
const path = require('path');

// Get the project root directory
const projectRoot = process.cwd();
console.log('Project root:', projectRoot);

// Define paths
const dataDir = path.join(projectRoot, 'data');
const cacheDir = path.join(dataDir, 'cache');

console.log('\nChecking directories...');
console.log('Data directory:', dataDir);
console.log('Cache directory:', cacheDir);

// Check and create data directory
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory');
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
} else {
    console.log('Data directory exists');
}

// Check and create cache directory
if (!fs.existsSync(cacheDir)) {
    try {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log('Created cache directory');
    } catch (error) {
        console.error('Error creating cache directory:', error);
    }
} else {
    console.log('Cache directory exists');
}

// Test file write
const testFile = path.join(cacheDir, 'test.json');
try {
    fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }, null, 2));
    console.log('\nSuccessfully wrote test file:', testFile);
    
    // Clean up test file
    fs.unlinkSync(testFile);
    console.log('Test file cleaned up');
} catch (error) {
    console.error('\nError testing file write:', error);
}

// Check permissions
try {
    const dataStats = fs.statSync(dataDir);
    const cacheStats = fs.statSync(cacheDir);
    
    console.log('\nDirectory permissions:');
    console.log('Data directory:', dataStats.mode.toString(8));
    console.log('Cache directory:', cacheStats.mode.toString(8));
} catch (error) {
    console.error('\nError checking permissions:', error);
}
