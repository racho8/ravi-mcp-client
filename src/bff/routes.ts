import { Request, Response } from 'express';
import { callLLM } from './llmClient.js';
import { callMCP } from './mcpClient.js';

// Helper function to identify duplicate products
function identifyDuplicates(products: any[]): Record<string, any[]> {
  const duplicates: Record<string, any[]> = {};
  const nameGroups: Record<string, any[]> = {};
  
  // Group products by name (case-insensitive)
  for (const product of products) {
    if (product.name) {
      const normalizedName = product.name.toLowerCase().trim();
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(product);
    }
  }
  
  // Find groups with more than one product (duplicates)
  for (const [name, group] of Object.entries(nameGroups)) {
    if (group.length > 1) {
      duplicates[name] = group;
    }
  }
  
  return duplicates;
}

// Helper function to recommend which duplicates to keep
function recommendDuplicateCleanup(duplicates: Record<string, any[]>): any {
  const recommendations = [];
  let totalToDelete = 0;
  
  for (const [name, group] of Object.entries(duplicates)) {
    // Sort by price descending, then by creation date if available
    const sorted = group.sort((a, b) => {
      if (a.price !== b.price) return b.price - a.price; // Higher price first
      return a.id.localeCompare(b.id); // Stable sort by ID
    });
    
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);
    
    recommendations.push({
      productName: name,
      duplicateCount: group.length,
      recommended: {
        keep: toKeep,
        delete: toDelete
      }
    });
    
    totalToDelete += toDelete.length;
  }
  
  return {
    summary: {
      duplicateGroups: Object.keys(duplicates).length,
      totalProducts: Object.values(duplicates).flat().length,
      recommendedToDelete: totalToDelete
    },
    recommendations
  };
}

// Handles POST /api/command
export async function processNaturalLanguageCommand(req: Request, res: Response) {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Missing command' });
  }
  try {
    // 1. Use LLM to parse intent/tool call
    const llmResult = await callLLM(command);
    console.log(`[Route] LLM Result:`, JSON.stringify(llmResult, null, 2));
    
    // 2. Use MCP client to invoke tool
    let mcpResult = await callMCP(llmResult);
    console.log(`[Route] Initial MCP Result:`, JSON.stringify(mcpResult, null, 2));
    
    // 3. Check if this is a counting query and modify response accordingly
    const isCountingQuery = command.toLowerCase().includes('how many') || 
                           command.toLowerCase().includes('count') || 
                           command.toLowerCase().includes('number of');
    
    if (isCountingQuery && mcpResult.result && Array.isArray(mcpResult.result)) {
      console.log(`[Counting Query] Converting result to count`);
      
      let products = mcpResult.result;
      let context = '';
      
      // Apply additional filtering for name-based counting
      if (llmResult.tool === 'list_products') {
        // Check if command mentions specific product names
        const lowerCommand = command.toLowerCase();
        if (lowerCommand.includes('macbook') || lowerCommand.includes('mac book')) {
          products = products.filter((p: any) => 
            p.name && p.name.toLowerCase().includes('macbook')
          );
          context = 'MacBook products';
        } else if (lowerCommand.includes('iphone')) {
          products = products.filter((p: any) => 
            p.name && p.name.toLowerCase().includes('iphone')
          );
          context = 'iPhone products';
        } else if (lowerCommand.includes('laptop')) {
          products = products.filter((p: any) => 
            p.name && p.name.toLowerCase().includes('laptop')
          );
          context = 'Laptop products';
        }
      } else if (llmResult.tool === 'get_products_by_category' && llmResult.parameters.category) {
        context = `${llmResult.parameters.category} category`;
      } else if (llmResult.tool === 'get_products_by_segment' && llmResult.parameters.segment) {
        context = `${llmResult.parameters.segment} segment`;
      }
      
      mcpResult = {
        jsonrpc: "2.0",
        id: mcpResult.id,
        result: {
          count: products.length,
          context: context || 'total products',
          message: `Found ${products.length} ${context || 'products'}`
        }
      };
      
      console.log(`[Counting Query] Found ${products.length} products in ${context || 'total'}`);
    }
    
    // 3.5. Apply name-based filtering for regular "find" commands (moved after update processing)
    
    // 4. Handle special duplicate management commands
    if (command.toLowerCase().includes('duplicate') || command.toLowerCase().includes('find duplicates')) {
      console.log(`[Duplicate Management] Processing duplicate command`);
      
      // Check if this is a cleanup command
      const isCleanupCommand = command.toLowerCase().includes('clean') || 
                              command.toLowerCase().includes('remove') || 
                              command.toLowerCase().includes('delete');
      
      // Get all products first
      const listResult = await callMCP({ tool: 'list_products', parameters: {} });
      if (listResult.result && Array.isArray(listResult.result)) {
        const allProducts = listResult.result;
        const duplicates = identifyDuplicates(allProducts);
        
        if (Object.keys(duplicates).length === 0) {
          mcpResult = {
            jsonrpc: "2.0",
            id: listResult.id,
            result: {
              type: isCleanupCommand ? 'cleanup_result' : 'duplicate_analysis',
              message: isCleanupCommand ? 'No duplicates found to clean up.' : 'No duplicate products found! All product names are unique.',
              duplicateCount: 0,
              totalProducts: allProducts.length,
              deletedCount: isCleanupCommand ? 0 : undefined
            }
          };
        } else if (isCleanupCommand) {
          // Perform cleanup
          console.log(`[Duplicate Cleanup] Processing cleanup command`);
          const analysis = recommendDuplicateCleanup(duplicates);
          const idsToDelete = analysis.recommendations.flatMap((rec: any) => 
            rec.recommended.delete.map((product: any) => product.id)
          );
          
          // Perform the deletion
          const deleteResult = await callMCP({
            tool: 'delete_products',
            parameters: {
              ids: idsToDelete
            }
          });
          
          mcpResult = {
            jsonrpc: "2.0",
            id: deleteResult.id,
            result: {
              type: 'cleanup_result',
              message: `Successfully cleaned up ${idsToDelete.length} duplicate products`,
              deletedCount: idsToDelete.length,
              duplicateGroups: analysis.summary.duplicateGroups,
              deletedProducts: analysis.recommendations.flatMap((rec: any) => rec.recommended.delete),
              keptProducts: analysis.recommendations.map((rec: any) => rec.recommended.keep)
            }
          };
        } else {
          // Just show analysis
          const analysis = recommendDuplicateCleanup(duplicates);
          mcpResult = {
            jsonrpc: "2.0",
            id: listResult.id,
            result: {
              type: 'duplicate_analysis',
              message: `Found ${analysis.summary.duplicateGroups} duplicate product groups`,
              ...analysis,
              duplicates: duplicates
            }
          };
        }
      }
    }
    
    // 5. Handle update commands: resolve product names to UUIDs
    if (llmResult.tool === 'update_product' || llmResult.tool === 'update_products') {
      
            
      console.log(`[Update Flow] Processing ${llmResult.tool} command`);
      
      // Get all products to resolve names to UUIDs
      const listResult = await callMCP({ tool: 'list_products', parameters: {} });
      let allProducts = [];
      if (listResult.result && Array.isArray(listResult.result)) {
        allProducts = listResult.result;
      }
      
      if (allProducts.length > 0) {
        if (llmResult.tool === 'update_product') {
          // Single product update
          const productNameOrId = llmResult.parameters.id;
          const newPrice = llmResult.parameters.price;
          
          if (productNameOrId && newPrice) {
            // Check if this is already a UUID or a product name
            const looksLikeUUID = productNameOrId.includes('-') && productNameOrId.length > 30;
            
            let matchingProduct = null;
            if (looksLikeUUID) {
              // Search by UUID
              matchingProduct = allProducts.find((product: any) => product.id === productNameOrId);
            } else {
              // Search by name (case-insensitive exact match first, then contains)
              matchingProduct = allProducts.find((product: any) => 
                product.name && product.name.toLowerCase() === productNameOrId.toLowerCase()
              );
              if (!matchingProduct) {
                // Fallback to contains search
                matchingProduct = allProducts.find((product: any) => 
                  product.name && product.name.toLowerCase().includes(productNameOrId.toLowerCase())
                );
              }
            }
            
            if (matchingProduct) {
              console.log(`[Update Flow] Found product: ${matchingProduct.name} (${matchingProduct.id}), updating price from ${matchingProduct.price} to ${newPrice}`);
              
              // Call update_product with actual UUID
              const updateResult = await callMCP({
                tool: 'update_product',
                parameters: {
                  id: matchingProduct.id,
                  price: newPrice
                }
              });
              
              // Return enhanced response
              if (updateResult.result) {
                mcpResult = {
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
              } else {
                mcpResult = updateResult;
              }
            } else {
              console.warn(`[Update Flow] Could not find product: '${productNameOrId}'`);
              mcpResult = { error: `Product '${productNameOrId}' not found` };
            }
          } else {
            console.warn(`[Update Flow] Missing product name/id or price in parameters:`, llmResult.parameters);
            mcpResult = { error: 'Missing product name or price in update command' };
          }
        } 
        // Handle bulk updates if needed
        else if (llmResult.tool === 'update_products') {
          console.log(`[Update Flow] Bulk update not yet implemented in simplified flow`);
          mcpResult = { error: 'Bulk update not yet implemented' };
        }
      } else {
        mcpResult = { error: 'No products found in database' };
      }
    }
    
    // 5. Handle partial name matching fallback for non-update commands
    if (llmResult.tool === 'get_product_by_name' && 
        mcpResult.error && 
        mcpResult.error.message === 'Internal error' &&
        mcpResult.error.data === 'product service returned status 404') {
      
      console.log(`[Fallback] Product '${llmResult.parameters.name}' not found, trying partial match with list_products`);
      
      // Fallback: Get all products and filter by partial name match
      try {
        const listResult = await callMCP({ tool: 'list_products', parameters: {} });
        if (listResult.result && Array.isArray(listResult.result)) {
          const searchTerm = llmResult.parameters.name.toLowerCase();
          const filteredProducts = listResult.result.filter((product: any) => 
            product.name && product.name.toLowerCase().includes(searchTerm)
          );
          
          if (filteredProducts.length > 0) {
            mcpResult = {
              jsonrpc: "2.0",
              id: listResult.id,
              result: filteredProducts
            };
            console.log(`[Fallback] Found ${filteredProducts.length} products matching '${searchTerm}'`);
          }
        }
      } catch (fallbackErr) {
        console.error('[Fallback] Error in partial matching:', fallbackErr);
      }
    }
    
    // 6. Handle grouping requests
    if ((command.toLowerCase().includes('group') && command.toLowerCase().includes('by category')) ||
        (command.toLowerCase().includes('grouped by category'))) {
      
      if (mcpResult.result && Array.isArray(mcpResult.result)) {
        console.log(`[Grouping] Detected grouping by category request`);
        
        const products = mcpResult.result;
        const groupedByCategory: Record<string, any[]> = {};
        
        // Group products by category (normalize case)
        for (const product of products) {
          if (product.category) {
            const normalizedCategory = product.category.charAt(0).toUpperCase() + 
                                     product.category.slice(1).toLowerCase();
            if (!groupedByCategory[normalizedCategory]) {
              groupedByCategory[normalizedCategory] = [];
            }
            groupedByCategory[normalizedCategory].push(product);
          }
        }
        
        // Convert to structured format
        const categoryGroups = Object.entries(groupedByCategory).map(([category, items]) => ({
          category,
          count: items.length,
          products: items
        }));
        
        mcpResult = {
          jsonrpc: "2.0",
          id: mcpResult.id,
          result: {
            type: 'grouped_products',
            message: `Found ${products.length} products grouped into ${categoryGroups.length} categories`,
            totalProducts: products.length,
            totalCategories: categoryGroups.length,
            categories: categoryGroups
          }
        };
      }
    }
    
    // 6.5. Apply name-based filtering for regular "find" commands (only if no update was processed)
    if (!isCountingQuery && 
        llmResult.tool === 'list_products' && 
        mcpResult.result && 
        Array.isArray(mcpResult.result) &&
        !command.toLowerCase().includes('update') &&
        !command.toLowerCase().includes('change') &&
        !command.toLowerCase().includes('set') &&
        !command.toLowerCase().includes('modify')) {
      
      const lowerCommand = command.toLowerCase();
      let products = mcpResult.result;
      let filtered = false;
      
      if (lowerCommand.includes('macbook') || lowerCommand.includes('mac book')) {
        products = products.filter((p: any) => 
          p.name && p.name.toLowerCase().includes('macbook')
        );
        filtered = true;
        console.log(`[Name Filter] Filtered to ${products.length} MacBook products`);
      } else if (lowerCommand.includes('iphone')) {
        products = products.filter((p: any) => 
          p.name && p.name.toLowerCase().includes('iphone')
        );
        filtered = true;
        console.log(`[Name Filter] Filtered to ${products.length} iPhone products`);
      } else if (lowerCommand.includes('laptop')) {
        products = products.filter((p: any) => 
          p.name && p.name.toLowerCase().includes('laptop')
        );
        filtered = true;
        console.log(`[Name Filter] Filtered to ${products.length} Laptop products`);
      }
      
      // Update the result if filtering was applied
      if (filtered) {
        mcpResult = {
          jsonrpc: "2.0",
          id: mcpResult.id,
          result: products
        };
      }
    }
    
    // 7. Return result
    res.json({ result: mcpResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}
