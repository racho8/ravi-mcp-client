// Debug utility: Print all products from MCP
export async function debugPrintAllProducts(): Promise<void> {
  const token = getGCPAuthToken();
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const rpcPayload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: "list_products", arguments: {} }
  };
  try {
    const response = await axios.post(MCP_SERVER_URL, rpcPayload, config);
    const products = response.data?.result?.result || [];
    console.log("[debugPrintAllProducts] Product list:");
    for (const p of products) {
      console.log(`ID: ${p.id}, Name: '${p.name}'`);
    }
  } catch (err) {
    console.error("Failed to fetch product list from MCP:", err);
  }
}
// Utility to fetch product by name
async function fetchProductIdByName(productName: string, config: any): Promise<string | undefined> {
  const rpcPayload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: "list_products"
    }
  };
  const response = await axios.post(MCP_SERVER_URL, rpcPayload, config);
  if (response.data && response.data.result && Array.isArray(response.data.result.products)) {
    const match = response.data.result.products.find((p: any) => p.name === productName);
    return match ? match.id : undefined;
  }
  return undefined;
}
// src/bff/mcpClient.ts
// Client to communicate with remote MCP server
import axios from 'axios';



const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://ravi-mcp-server-256110662801.europe-west3.run.app/mcp';

import { execSync } from 'child_process';

function getGCPAuthToken(): string | undefined {
  try {
    // Fetch GCP identity token using gcloud CLI
    const token = execSync('gcloud auth print-identity-token', { encoding: 'utf-8' }).trim();
    return token;
  } catch (err) {
    console.error('Failed to fetch GCP identity token:', err);
    return undefined;
  }
}

export async function callMCP(toolInvocation: any): Promise<any> {
  try {
    const token = getGCPAuthToken();
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;
    // Debug: Print product list for update operations (limit to first 20)
    if (["update_product", "update_products"].includes(toolInvocation.tool)) {
      const rpcPayloadList = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "list_products", arguments: {} }
      };
      try {
        const response = await axios.post(MCP_SERVER_URL, rpcPayloadList, config);
        const products = response.data?.result?.result || [];
        console.log(`[debugPrintAllProducts] Showing up to 20 products:`);
        for (const p of products.slice(0, 20)) {
          console.log(`ID: ${p.id}, Name: '${p.name}'`);
        }
        if (products.length > 20) {
          console.log(`...and ${products.length - 20} more products.`);
        }
      } catch (err) {
        console.error("Failed to fetch product list from MCP:", err);
      }
    }
    // Special handling for each tool based on mcp-server-apis.json
    const rpcId = toolInvocation.id !== undefined ? toolInvocation.id : Date.now();
    let rpcPayload;
    switch (toolInvocation.tool) {
      case 'list_tools':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/list"
        };
        break;
      case 'welcome_message':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "welcome_message" }
        };
        break;
      case 'health_check':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "health_check", arguments: {} }
        };
        break;
      case 'list_products':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "list_products", arguments: {} }
        };
        break;
      case 'get_product':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "get_product", arguments: toolInvocation.parameters }
        };
        break;
      case 'create_product':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "create_product", arguments: toolInvocation.parameters }
        };
        break;
      case 'update_product':
        // Expect ID to already be resolved to actual product ID
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "update_product", arguments: toolInvocation.parameters }
        };
        console.log(`[update_product] Updating product with ID: ${toolInvocation.parameters.id}`);
        break;
      case 'delete_product':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "delete_product", arguments: toolInvocation.parameters }
        };
        break;
      case 'create_multiple_products':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "create_multiple_products", arguments: toolInvocation.parameters }
        };
        break;
      case 'update_products':
        // Expect IDs to already be resolved to actual product IDs
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "update_products", arguments: toolInvocation.parameters }
        };
        console.log(`[update_products] Updating ${toolInvocation.parameters.products?.length || 0} products`);
        break;
      case 'delete_products':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "delete_products", arguments: toolInvocation.parameters }
        };
        break;
      case 'get_products_by_category':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "get_products_by_category", arguments: toolInvocation.parameters }
        };
        break;
      case 'get_products_by_segment':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "get_products_by_segment", arguments: toolInvocation.parameters }
        };
        break;
      case 'get_product_by_name':
        rpcPayload = {
          jsonrpc: "2.0",
          id: rpcId,
          method: "tools/call",
          params: { name: "get_product_by_name", arguments: toolInvocation.parameters }
        };
        break;
      default:
        throw new Error(`Unsupported tool: ${toolInvocation.tool}`);
    }
    console.log("Sending to MCP:", JSON.stringify(rpcPayload, null, 2));
    const response = await axios.post(MCP_SERVER_URL, rpcPayload, config);
    return response.data;
  } catch (err) {
    throw new Error('MCP call failed: ' + (err as any).message);
  }
}
