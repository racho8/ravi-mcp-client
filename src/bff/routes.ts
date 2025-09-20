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
    
    // 3.5. Apply name-based filtering for regular "find" commands
    if (!isCountingQuery && llmResult.tool === 'list_products' && mcpResult.result && Array.isArray(mcpResult.result)) {
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
    
    // 5. Handle update commands: convert to list_products + filter for updates
    if (command.toLowerCase().includes('update') && 
        (llmResult.tool === 'get_product_by_name' || llmResult.tool === 'list_products' || 
         llmResult.tool === 'update_product' || llmResult.tool === 'update_products')) {
      
      console.log(`[Update Flow] Detected update command, finding product first`);
      
      // Get all products first
      let allProducts = [];
      if (llmResult.tool === 'get_product_by_name') {
        // Convert to list_products to avoid get_product_by_name issues
        const listResult = await callMCP({ tool: 'list_products', parameters: {} });
        if (listResult.result && Array.isArray(listResult.result)) {
          allProducts = listResult.result;
        }
      } else if (llmResult.tool === 'update_product') {
        // For direct update_product calls, get all products to resolve names to IDs
        const listResult = await callMCP({ tool: 'list_products', parameters: {} });
        if (listResult.result && Array.isArray(listResult.result)) {
          allProducts = listResult.result;
        }
      } else if (llmResult.tool === 'update_products') {
        // For bulk update_products calls, get all products to resolve names to IDs
        const listResult = await callMCP({ tool: 'list_products', parameters: {} });
        if (listResult.result && Array.isArray(listResult.result)) {
          allProducts = listResult.result;
        }
      } else if (mcpResult.result && Array.isArray(mcpResult.result)) {
        allProducts = mcpResult.result;
      }
      
      if (allProducts.length > 0) {
        // Handle single product updates
        if (llmResult.tool === 'get_product_by_name' || llmResult.tool === 'update_product') {
          // Extract product name and price from the original command
          const priceMatch = command.match(/(\d+\.?\d*)/);
          let productName = '';
          
          if (llmResult.tool === 'get_product_by_name' && llmResult.parameters.name) {
            productName = llmResult.parameters.name;
          } else if (llmResult.tool === 'update_product' && llmResult.parameters.id) {
            // LLM passed product name as 'id'
            productName = llmResult.parameters.id;
          } else {
            // Try to extract product name from command
            const updateMatch = command.match(/update.*?(?:price of|product)\s+([^0-9]+?)\s+(?:to|with)/i);
            if (updateMatch) {
              productName = updateMatch[1].trim();
            }
          }
          
          if (priceMatch && productName) {
            let newPrice = parseFloat(priceMatch[1]);
            
            // If LLM already extracted price, use that instead
            if (llmResult.tool === 'update_product' && llmResult.parameters.price) {
              newPrice = llmResult.parameters.price;
            }
            
            // Find matching product (case-insensitive)
            const matchingProduct = allProducts.find((product: any) => 
              product.name && product.name.toLowerCase() === productName.toLowerCase()
            );
            
            if (matchingProduct) {
              console.log(`[Update Flow] Found product ${matchingProduct.id} (${matchingProduct.name}), updating price to ${newPrice}`);
              console.log(`[Update Flow] Product details:`, JSON.stringify(matchingProduct, null, 2));
              
              // Call update_product with the actual product ID
              const updateResult = await callMCP({
                tool: 'update_product',
                parameters: {
                  id: matchingProduct.id,
                  price: newPrice
                }
              });
              
              // Enhance response with meaningful information
              if (updateResult.result) {
                const updatedProduct = {
                  ...matchingProduct,
                  price: newPrice
                };
                
                mcpResult = {
                  jsonrpc: "2.0",
                  id: updateResult.id,
                  result: {
                    success: true,
                    message: `Successfully updated '${matchingProduct.name}' price to ${newPrice}`,
                    productName: matchingProduct.name,
                    oldPrice: matchingProduct.price,
                    newPrice: newPrice,
                    updatedProduct: updatedProduct
                  }
                };
              } else {
                mcpResult = updateResult;
              }
            } else {
              console.warn(`[Update Flow] Could not find product named '${productName}'`);
              mcpResult = { error: `Product '${productName}' not found` };
            }
          } else {
            console.warn('[Update Flow] Could not extract price or product name from command:', command);
            mcpResult = { error: 'Could not extract price or product name from update command' };
          }
        }
        // Handle bulk product updates
        else if (llmResult.tool === 'update_products' && llmResult.parameters.products) {
          console.log(`[Update Flow] Processing bulk update for ${llmResult.parameters.products.length} product types`);
          
          const productsToUpdate = [];
          for (const productUpdate of llmResult.parameters.products) {
            if (productUpdate.id) {
              // Find ALL matching products by name (case-insensitive) - this handles "all" scenarios
              // Use contains search for bulk updates (e.g., "iPhone" matches "iPhone 14", "iPhone 15")
              const searchTerm = productUpdate.id.toLowerCase();
              const matchingProducts = allProducts.filter((product: any) => 
                product.name && product.name.toLowerCase().includes(searchTerm)
              );
              
              if (matchingProducts.length > 0) {
                console.log(`[Update Flow] Found ${matchingProducts.length} products containing '${productUpdate.id}'`);
                
                for (const matchingProduct of matchingProducts) {
                  productsToUpdate.push({
                    id: matchingProduct.id,
                    price: productUpdate.price,
                    ...(productUpdate.name && { name: productUpdate.name }),
                    ...(productUpdate.category && { category: productUpdate.category })
                  });
                  console.log(`[Update Flow] Resolved '${productUpdate.id}' to UUID: ${matchingProduct.id} (${matchingProduct.name}, current price: ${matchingProduct.price})`);
                }
              } else {
                console.warn(`[Update Flow] Could not find any products containing '${productUpdate.id}'`);
              }
            }
          }
          
          if (productsToUpdate.length > 0) {
            console.log(`[Update Flow] Updating ${productsToUpdate.length} products`);
            const updateResult = await callMCP({
              tool: 'update_products',
              parameters: {
                products: productsToUpdate
              }
            });
            
            // Enhance response with meaningful information and show updated products
            if (updateResult.result) {
              const productName = llmResult.parameters.products[0].id;
              const newPrice = llmResult.parameters.products[0].price;
              
              // Get the updated products to show in response
              const updatedProducts = productsToUpdate.map(product => {
                const originalProduct = allProducts.find((p: any) => p.id === product.id);
                return {
                  ...originalProduct,
                  price: product.price
                };
              });
              
              mcpResult = {
                jsonrpc: "2.0",
                id: updateResult.id,
                result: {
                  success: true,
                  message: `Successfully updated ${productsToUpdate.length} products named '${productName}' to price ${newPrice}`,
                  updatedCount: productsToUpdate.length,
                  productName: productName,
                  newPrice: newPrice,
                  updatedProducts: updatedProducts
                }
              };
            } else {
              mcpResult = updateResult;
            }
          } else {
            mcpResult = { error: 'No matching products found for bulk update' };
          }
        }
      }
    }
    
    // 5. Handle partial name matching fallback for non-update commands
    else if (llmResult.tool === 'get_product_by_name' && 
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
    
    // 6. Return result
    res.json({ result: mcpResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}
