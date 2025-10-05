/**
 * deleteHandler.ts - Product Delete Command Handler
 * 
 * Purpose:
 * - Handles single product delete operations
 * - Resolves product names to UUIDs
 */

import { callMCP } from '../mcpClient.js';
import { findProductByNameOrId } from '../helpers/productResolver.js';
import { invalidateProductCache } from '../helpers/cacheManager.js';

/**
 * Handles single product delete
 */
export async function handleSingleDelete(
  productNameOrId: string,
  allProducts: any[]
): Promise<any> {
  const matchingProduct = findProductByNameOrId(productNameOrId, allProducts);
  
  if (!matchingProduct) {
    console.warn(`[Delete Flow] Could not find product: '${productNameOrId}'`);
    return { error: `Product '${productNameOrId}' not found` };
  }
  
  console.log(`[Delete Flow] Found product: ${matchingProduct.name} (${matchingProduct.id}), deleting...`);
  
  // Call delete_product with actual UUID
  const deleteResult = await callMCP({
    tool: 'delete_product',
    parameters: {
      id: matchingProduct.id
    }
  });
  
  // Return enhanced response
  if (deleteResult.result) {
    invalidateProductCache(`Product delete: ${matchingProduct.name}`);
    
    return {
      jsonrpc: "2.0",
      id: deleteResult.id,
      result: {
        success: true,
        message: `Successfully deleted '${matchingProduct.name}'`,
        productName: matchingProduct.name,
        deletedProduct: matchingProduct
      }
    };
  }
  
  return deleteResult;
}
