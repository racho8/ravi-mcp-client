/**
 * index.ts - Express Server Entry Point
 * 
 * Purpose:
 * - Sets up the Express.js server on port 3001
 * - Serves static files from the public/ directory
 * - Serves the chatbot UI at the root path
 * - Handles natural language command processing
 * 
 * API Endpoints:
 * - POST /api/command - Main endpoint for natural language commands
 * 
 * Architecture:
 * This is the entry point of the BFF (Backend-for-Frontend) layer that bridges
 * the frontend UI with the MCP server and LLM processing logic.
 */

import express from 'express';
import { processNaturalLanguageCommand } from './routes.js';
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BFF server listening on port ${PORT}`);
});
