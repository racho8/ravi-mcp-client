/**
 * mcpSchemaCache.ts - Schema Management & Caching
 * 
 * Purpose:
 * - Fetches and caches MCP tool schemas for 10 minutes to reduce redundant calls
 * - Provides tool descriptions and parameter schemas to llmClient.ts
 * - Manages GCP auth token caching (55-minute expiry)
 * 
 * Key Features:
 * - Tool schema caching with 10-minute TTL (Time To Live)
 * - GCP Identity Token caching (55-minute duration)
 * - Optimized axios instance with connection pooling
 * - Stale cache fallback when fetch fails
 * - Schema validation utilities
 * 
 * Cached Information:
 * - Tool names, descriptions, input schemas, and sample payloads
 * - JSON-RPC envelope formats for different MCP methods
 * 
 * Cache Strategy:
 * - First call: Fetches schemas from MCP server via tools/list
 * - Subsequent calls: Returns cached schemas if within 10-minute window
 * - On fetch failure: Returns stale cache if available
 * - Token caching: Prevents repeated gcloud CLI calls
 * 
 * Performance Benefits:
 * - Reduces MCP server load by minimizing schema fetches
 * - Speeds up LLM prompt generation (no wait for schema fetch)
 * - Connection reuse via keep-alive agent (max 5 sockets, 15s timeout)
 */

// src/bff/mcpSchemaCache.ts
// Utility to fetch, cache, and use MCP tool schemas and JSON-RPC envelope formats
import axios from 'axios';
import { execSync } from 'child_process';
import { Agent } from 'https';

// Create optimized axios instance for schema fetching
const httpAgent = new Agent({
  keepAlive: true,
  maxSockets: 5,
  timeout: 15000
});

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent: httpAgent,
  headers: {
    'Connection': 'keep-alive'
  }
});

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://ravi-mcp-server-256110662801.europe-west3.run.app/mcp';

// Cache GCP auth token to avoid repeated execSync calls
let cachedGCPToken: string | undefined = undefined;
let gcpTokenExpiry: number = 0;

function getGCPAuthToken(): string | undefined {
  const now = Date.now();
  
  // Return cached token if still valid
  if (cachedGCPToken && now < gcpTokenExpiry) {
    return cachedGCPToken;
  }
  
  try {
    const token = execSync('gcloud auth print-identity-token', { encoding: 'utf-8' }).trim();
    cachedGCPToken = token;
    gcpTokenExpiry = now + (55 * 60 * 1000); // Cache for 55 minutes
    return token;
  } catch (err) {
    console.error('Failed to fetch GCP identity token:', err);
    return undefined;
  }
}

// Cache for tool schemas and envelopes with timestamp
let toolSchemas: Record<string, any> = {};
let schemaLastFetched: number = 0;
const SCHEMA_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

let envelopeFormats: Record<string, any> = {
  'tools/call': {
    jsonrpc: '2.0',
    id: 'number',
    method: 'tools/call',
    params: { name: 'string', arguments: {} }
  },
  'tools/list': {
    jsonrpc: '2.0',
    id: 'number',
    method: 'tools/list'
  },
};

export async function fetchAndCacheToolSchemas() {
  const now = Date.now();
  
  // Return cached schemas if still valid
  if (Object.keys(toolSchemas).length > 0 && (now - schemaLastFetched) < SCHEMA_CACHE_DURATION) {
    console.log('[Schema Cache] Using cached schemas');
    return toolSchemas;
  }
  
  console.log('[Schema Cache] Fetching fresh schemas');
  const token = getGCPAuthToken();
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const rpcPayload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/list'
  };
  
  try {
    const response = await axiosInstance.post(MCP_SERVER_URL, rpcPayload, config);
    console.log('[Schema Cache] MCP Response received');
    
    if (response.data && response.data.result && response.data.result.tools) {
      toolSchemas = {}; // Clear old cache
      for (const tool of response.data.result.tools) {
        toolSchemas[tool.name] = {
          description: tool.description,
          inputSchema: tool.inputSchema,
          samplePayload: tool.samplePayload || null
        };
      }
      schemaLastFetched = now;
      console.log('[Schema Cache] Cached tools:', Object.keys(toolSchemas));
    }
  } catch (error) {
    console.error('[Schema Cache] Error fetching schemas:', error);
    // Return existing cache if fetch fails
    if (Object.keys(toolSchemas).length > 0) {
      console.log('[Schema Cache] Using stale cache due to fetch error');
      return toolSchemas;
    }
    throw error;
  }
  
  return toolSchemas;
}

export function getToolSchema(toolName: string) {
  return toolSchemas[toolName];
}

export function getEnvelopeFormat(method: string) {
  return envelopeFormats[method];
}

// Example: Build a JSON-RPC payload for a tool call
export function buildToolCallPayload(toolName: string, parameters: Record<string, any>) {
  return {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      ...parameters
    }
  };
}

// Example: Validate parameters against cached schema
export function validateToolParams(toolName: string, params: Record<string, any>): boolean {
  const schema = getToolSchema(toolName);
  if (!schema) return false;
  // Simple required check
  if (schema.required) {
    for (const req of schema.required) {
      if (!(req in params)) return false;
    }
  }
  // You can add more advanced validation here
  return true;
}
