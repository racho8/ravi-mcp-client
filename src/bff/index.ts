import express from 'express';
import { processNaturalLanguageCommand } from './routes.js';
import { debugTestCategoryQuery, debugPrintAllProducts } from './mcpClient.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

// Serve static files from public directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../../public')));

// Serve chatbot interface at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Main endpoint for natural language command
app.post('/api/command', processNaturalLanguageCommand);

// Debug endpoint to test category queries directly
app.get('/api/debug/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    console.log(`[Debug API] Testing category query: "${category}"`);
    const result = await debugTestCategoryQuery(category);
    res.json({ 
      category,
      result,
      productCount: Array.isArray(result.result) ? result.result.length : 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to list all products
app.get('/api/debug/all-products', async (req, res) => {
  try {
    console.log(`[Debug API] Fetching all products`);
    await debugPrintAllProducts();
    res.json({ message: 'Check server logs for product list' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check cache status
app.get('/api/cache-status', (req, res) => {
  // Import the responseCache from routes.ts (we'll need to export it)
  res.json({
    cacheSize: 0, // Will be updated when we export responseCache
    message: 'Cache status endpoint - implementation pending'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BFF server listening on port ${PORT}`);
});
