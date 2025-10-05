/**
 * productResolver.ts - Product Name to UUID Resolution
 * 
 * Purpose:
 * - Resolves product names to UUIDs for update/delete operations
 * - Supports exact matches, case-insensitive matches, and partial matches
 * - Handles both single product and bulk product operations
 */

/**
 * Finds a product by name or UUID from a list of products
 */
export function findProductByNameOrId(
  productNameOrId: string,
  allProducts: any[]
): any | null {
  // Check if this is already a UUID or a product name
  const looksLikeUUID = productNameOrId.includes('-') && productNameOrId.length > 30;
  
  if (looksLikeUUID) {
    // Search by UUID
    return allProducts.find((product: any) => product.id === productNameOrId) || null;
  } else {
    // Search by name (case-insensitive exact match first, then contains)
    let matchingProduct = allProducts.find((product: any) => 
      product.name && product.name.toLowerCase() === productNameOrId.toLowerCase()
    );
    
    if (!matchingProduct) {
      // Fallback to contains search
      matchingProduct = allProducts.find((product: any) => 
        product.name && product.name.toLowerCase().includes(productNameOrId.toLowerCase())
      );
    }
    
    return matchingProduct || null;
  }
}

/**
 * Extracts filter criteria from a bulk update/delete command
 */
export function extractFilterCriteria(command: string): {
  segment?: string;
  category?: string;
  namePattern?: string;
} {
  const lowerCommand = command.toLowerCase();
  const filterCriteria: { segment?: string; category?: string; namePattern?: string } = {};
  
  // Detect filter type and value
  if (lowerCommand.includes('home office') || lowerCommand.includes('homeoffice')) {
    filterCriteria.segment = 'HomeOffice';
  } else if (lowerCommand.includes('segment')) {
    const segmentMatch = command.match(/(\w+)\s+segment/i);
    if (segmentMatch) filterCriteria.segment = segmentMatch[1];
  } else if (lowerCommand.includes('category')) {
    const categoryMatch = command.match(/(\w+)\s+category/i);
    if (categoryMatch) filterCriteria.category = categoryMatch[1];
  } else if (lowerCommand.includes('macbook')) {
    filterCriteria.namePattern = 'macbook';
  } else if (lowerCommand.includes('iphone')) {
    filterCriteria.namePattern = 'iphone';
  } else if (lowerCommand.includes('laptop')) {
    filterCriteria.namePattern = 'laptop';
  }
  
  return filterCriteria;
}

/**
 * Filters products based on criteria (segment, category, or name pattern)
 */
export function filterProducts(
  allProducts: any[],
  filterCriteria: { segment?: string; category?: string; namePattern?: string }
): any[] {
  return allProducts.filter((product: any) => {
    if (filterCriteria.segment) {
      return product.segment && product.segment.toLowerCase() === filterCriteria.segment.toLowerCase();
    }
    if (filterCriteria.category) {
      return product.category && product.category.toLowerCase() === filterCriteria.category.toLowerCase();
    }
    if (filterCriteria.namePattern) {
      return product.name && product.name.toLowerCase().includes(filterCriteria.namePattern.toLowerCase());
    }
    return false;
  });
}
