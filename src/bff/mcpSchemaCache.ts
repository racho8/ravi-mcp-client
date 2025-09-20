// src/bff/mcpSchemaCache.ts
// Utility to fetch, cache, and use MCP tool schemas and JSON-RPC envelope formats
import axios from 'axios';
import { execSync } from 'child_process';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://ravi-mcp-server-256110662801.europe-west3.run.app/mcp';

function getGCPAuthToken(): string | undefined {
  try {
    const token = execSync('gcloud auth print-identity-token', { encoding: 'utf-8' }).trim();
    return token;
  } catch (err) {
    console.error('Failed to fetch GCP identity token:', err);
    return undefined;
  }
}

// Cache for tool schemas and envelopes
let toolSchemas: Record<string, any> = {};
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
  const token = getGCPAuthToken();
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const rpcPayload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/list'
  };
  const response = await axios.post(MCP_SERVER_URL, rpcPayload, config);
  console.log('[Schema Cache] MCP Response:', JSON.stringify(response.data, null, 2));
  
  if (response.data && response.data.result && response.data.result.tools) {
    for (const tool of response.data.result.tools) {
      toolSchemas[tool.name] = {
        description: tool.description,
        inputSchema: tool.inputSchema,
        samplePayload: tool.samplePayload || null
      };
    }
    console.log('[Schema Cache] Cached tools:', Object.keys(toolSchemas));
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
