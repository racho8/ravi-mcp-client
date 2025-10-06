/**
 * updateHandler.ts - Product Update Command Handler
 * 
 * Purpose:
 * - Handles single and bulk product update operations
 * - Resolves product names to UUIDs
 * - Extracts price and filter criteria from commands
 */

import { callMCP } from '../mcpClient.js';
import { findProductByNameOrId, extractFilterCriteria, filterProducts } from '../helpers/productResolver.js';
import { invalidateProductCache } from '../helpers/cacheManager.js';

/**
 * Handles single product update
 */
export async function handleSingleUpdate(
  productNameOrId: string,
  newPrice: number,
  allProducts: any[]
): Promise<any> {
  const matchingProduct = findProductByNameOrId(productNameOrId, allProducts);
  
  if (!matchingProduct) {
    console.warn(`[Update Flow] Could not find product: '${productNameOrId}'`);
    return { error: `Product '${productNameOrId}' not found` };
  }
  
  console.log(`[Update Flow] Found product: ${matchingProduct.name} (${matchingProduct.id}), updating price from ${matchingProduct.price} to ${newPrice}`);
  
  // Call update_product with actual UUID and preserve existing fields
  const updateResult = await callMCP({
    tool: 'update_product',
    parameters: {
      id: matchingProduct.id,
      name: matchingProduct.name,
      category: matchingProduct.category,
      segment: matchingProduct.segment,
      price: newPrice
    }
  });
  
  // Return enhanced response
  if (updateResult.result) {
    invalidateProductCache(`Product update: ${matchingProduct.name}`);
    
    return {
      jsonrpc: "2.0",
      id: updateResult.id,
      result: {
        success: true,
        message: `Successfully updated '${matchingProduct.name}' price to ${newPrice}`,
        productName: matchingProduct.name,
        oldPrice: matchingProduct.price,
        newPrice: newPrice,
        updatedProduct: {
          ...matchingProduct,
          price: newPrice
        }
      }
    };
  }
  
  return updateResult;
}

/**
 * Handles bulk product update
 */
export async function handleBulkUpdate(
  command: string,
  allProducts: any[]
): Promise<any> {
  console.log(`[Update Flow] Processing bulk update`);
  
  const filterCriteria = extractFilterCriteria(command);
  
  // Extract price from command
  const priceMatch = command.match(/(?:to|price)\s+(\d+)/i);
  const newPrice = priceMatch ? parseInt(priceMatch[1]) : undefined;
  
  if (!newPrice) {
    console.warn(`[Update Flow] Could not extract price from command: ${command}`);
    return { error: 'Could not determine new price from command' };
  }
  
  if (Object.keys(filterCriteria).length === 0) {
    console.warn(`[Update Flow] Could not determine filter criteria from command: ${command}`);
    return { error: 'Could not determine which products to update' };
  }
  
  // Filter products based on criteria
  const productsToUpdate = filterProducts(allProducts, filterCriteria);
  
  if (productsToUpdate.length === 0) {
    console.warn(`[Update Flow] No products matched filter criteria:`, filterCriteria);
    return { error: `No products found matching criteria: ${JSON.stringify(filterCriteria)}` };
  }
  
  console.log(`[Update Flow] Found ${productsToUpdate.length} products to update with price ${newPrice}`);
  console.log(`[Update Flow] Products:`, productsToUpdate.map((p: any) => ({ name: p.name, oldPrice: p.price })));
  
  // Build products array with updated prices
  const updatedProducts = productsToUpdate.map((product: any) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    segment: product.segment,
    price: newPrice
  }));
  
  // Call update_products with actual UUIDs
  const updateResult = await callMCP({
    tool: 'update_products',
    parameters: {
      products: updatedProducts
    }
  });
  
  // Return enhanced response
  if (updateResult.result) {
    invalidateProductCache(`Bulk update: ${productsToUpdate.length} products updated`);
    
    return {
      jsonrpc: "2.0",
      id: updateResult.id,
      result: {
        success: true,
        message: `Successfully updated ${productsToUpdate.length} products to price ${newPrice}`,
        updatedCount: productsToUpdate.length,
        newPrice: newPrice,
        updatedProducts: updatedProducts.map((p: any) => ({
          name: p.name,
          oldPrice: productsToUpdate.find((op: any) => op.id === p.id)?.price,
          newPrice: newPrice
        }))
      }
    };
  }
  
  return updateResult;
}
