# Bulk Operations Guide

This guide explains how to use bulk update and bulk delete operations in the MCP Client.

## 🔄 Bulk Update Operations

### Overview
The system can update multiple products at once by matching products based on:
- Product name patterns (e.g., "all MacBook products")
- Category filters (e.g., "all products in Electronics")
- Segment filters (e.g., "all home office products")
- Combinations of the above

### Trigger Keywords
Use these keywords to trigger bulk updates:
- `all` - Update all matching products
- `every` - Update every matching product
- `entire` - Update entire set of matching products

### Update Keywords
- `update` - Standard update command
- `change` - Alternative update phrasing
- `set` - Direct price setting
- `modify` - Formal update term

### Examples

#### Update by Name Pattern
```
Update all MacBook products to price 2800
→ Finds all products containing "MacBook" and updates their prices to 2800

Change all iPhone prices to 900
→ Finds all products containing "iPhone" and updates their prices to 900

Set all Laptop1 prices to 1500
→ Finds all products containing "Laptop1" and updates their prices to 1500
```

#### Update by Segment
```
Update price of all home office products to 400
→ Finds all products with segment="home office" or "HomeOffice"

Change every laptop price to 1200
→ Finds all products with segment="Laptops"

Set all mobile product prices to 800
→ Finds all products with segment="mobiles"
```

#### Update by Category
```
Update every product in Furniture category to 500
→ Finds all products with category="Furniture"

Change all Electronics prices to 1000
→ Finds all products with category="Electronics"
```

### How It Works
1. **LLM interprets command** → Returns `list_products` tool call
2. **Routes handler detects update intent** → Looks for update keywords + "all"
3. **Filters products** → Matches by name pattern, category, or segment
4. **Resolves UUIDs** → Gets actual product IDs from matched products
5. **Calls update_products** → Updates all matching products in one operation
6. **Invalidates cache** → Clears response cache to show fresh data
7. **Returns enhanced response** → Shows which products were updated

## 🗑️ Bulk Delete Operations

### Overview
The system can delete multiple products at once using similar matching logic to bulk updates.

### Trigger Keywords
Use these keywords to trigger bulk deletes:
- `all` - Delete all matching products
- `every` - Delete every matching product  
- `entire` - Delete entire set of matching products

### Delete Keywords
- `delete` - Standard delete command
- `remove` - Alternative delete phrasing
- `erase` - Formal delete term
- `cleanup` - Used for duplicate cleanup

### Examples

#### Delete by Name Pattern
```
Delete all MacBook products
→ Finds all products containing "MacBook" and deletes them

Remove all iPhone models
→ Finds all products containing "iPhone" and deletes them

Erase all iPad products
→ Finds all products containing "iPad" and deletes them
```

#### Delete by Segment
```
Remove all laptops in Electronics category
→ Finds all products with segment="Laptops" in category="Electronics"

Delete all home office products
→ Finds all products with segment="home office" or "HomeOffice"

Erase all mobile devices
→ Finds all products with segment="mobiles"
```

#### Delete by Category
```
Delete all products in Furniture category
→ Finds all products with category="Furniture"

Remove all Electronics items
→ Finds all products with category="Electronics"
```

#### Special: Duplicate Cleanup
```
Clean up duplicate products
→ Identifies duplicates and deletes recommended ones

Remove duplicate products
→ Same as cleanup - analyzes and removes duplicates

Delete all duplicates
→ Finds and removes duplicate products
```

### How It Works
1. **LLM interprets command** → Returns `list_products` tool call
2. **Routes handler detects delete intent** → Looks for delete keywords + "all"
3. **Filters products** → Matches by name pattern, category, or segment
4. **Resolves UUIDs** → Gets actual product IDs from matched products
5. **Calls delete_products** → Deletes all matching products in one operation
6. **Invalidates cache** → Clears response cache to show fresh data
7. **Returns enhanced response** → Shows which products were deleted

## ⚙️ Implementation Details

### Name Resolution Pattern
Both bulk update and bulk delete use the same name resolution pattern:

```typescript
// 1. Get all products from database
const allProducts = await callMCP({ tool: 'list_products' });

// 2. Filter by name pattern (case-insensitive)
const matchingProducts = allProducts.filter(p => 
  p.name.toLowerCase().includes(searchTerm.toLowerCase())
);

// 3. Optionally filter by category
if (categoryFilter) {
  matchingProducts = matchingProducts.filter(p => 
    p.category.toLowerCase() === categoryFilter.toLowerCase()
  );
}

// 4. Optionally filter by segment
if (segmentFilter) {
  matchingProducts = matchingProducts.filter(p => 
    p.segment?.toLowerCase() === segmentFilter.toLowerCase()
  );
}

// 5. Extract UUIDs
const productIds = matchingProducts.map(p => p.id);

// 6. Call bulk operation
await callMCP({ 
  tool: 'update_products' | 'delete_products',
  parameters: { product_ids: productIds, ... }
});
```

### Cache Invalidation
After any mutation operation (create, update, delete), the system invalidates:
- All cached query responses (30-second cache)
- Specific category/segment caches if applicable

This ensures subsequent queries return fresh data.

### Error Handling
- **No matches found** → Returns error message indicating no products matched
- **Product not found** → Tries partial name matching as fallback
- **MCP server error** → Returns detailed error message with troubleshooting info

## 🎯 Best Practices

### For Bulk Updates
1. **Be specific with patterns** - "Update all MacBook Pro 16-inch" is better than "Update all Mac"
2. **Use consistent pricing** - Bulk updates set all products to the same price
3. **Verify before updating** - Use queries to see which products will be affected
4. **Check results** - Review the response to confirm expected products were updated

### For Bulk Deletes
1. **Double-check before deleting** - Bulk deletes are permanent
2. **Start with queries** - Use "Show all X products" to see what will be deleted
3. **Use specific filters** - Combine name + category for precision
4. **Review confirmation** - Check the deleted products list in the response

### Testing Commands
Before running bulk operations, test with queries:

```bash
# Check what will be affected
Show all MacBook products
→ See which products match

# Then run bulk operation
Delete all MacBook products
→ Deletes the products you just saw
```

## 📝 Common Patterns

### Update All Products in a Category
```
Update all products in Electronics to 500
Update every Furniture item to 300
Set all Office furniture prices to 250
```

### Update All Products with Name Pattern
```
Update all iPhone products to 899
Change every MacBook price to 2500
Set all iPad prices to 799
```

### Delete All Products in a Segment
```
Delete all home office products
Remove all laptop products
Erase all mobile devices
```

### Delete All Products with Name Pattern
```
Delete all MacBook products
Remove all iPhone models
Erase all discontinued items
```

## 🚀 Quick Reference

| Operation | Single Item | Bulk Operation |
|-----------|-------------|----------------|
| **Update** | `Update iPhone 15 to 899` | `Update all iPhone products to 899` |
| **Delete** | `Delete Acer Laptop` | `Delete all Acer products` |
| **Trigger Words** | Specific product name | `all`, `every`, `entire` |
| **MCP Tool Used** | `update_product` / `delete_product` | `update_products` / `delete_products` |
| **Name Resolution** | Exact match → Partial match | Pattern matching + filtering |

## 🔍 Troubleshooting

### "No products found matching pattern"
- Check product names with: `Show all products`
- Verify spelling and case sensitivity
- Try broader search terms

### "Bulk operation not yet implemented"
- Only delete_products might show this error
- Fallback to single deletes or wait for implementation

### "Could not find product"
- Product name might be misspelled
- Use `Show all products` to see exact names
- Try partial name matching

### Updates/Deletes Don't Appear
- Cache might still show old data (30 seconds)
- Refresh your query or wait a moment
- Check MCP server logs for errors
