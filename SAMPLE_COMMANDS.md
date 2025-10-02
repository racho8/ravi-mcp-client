# Sample Natural Language Commands for Product Management

## Query Products

### List All Products
```
Show all products
List all products
Get all products
```

### Filter by Category
```
Show me all products in Electronics category
Show me Furniture
Get products from Electronics category
```

### Filter by Segment
```
Show me Laptops
Find laptops
Show me mobiles segment
```

### Search by Name
```
Find iPhone
Show me MacBook products
Get product named Laptop1
```

### Count Products
```
How many products are there?
Count all products
How many products in Electronics category?
Count Laptops
```

## Create Products

### Create Single Product
```
Create product iPad Air in Electronics for 599
Add new product Office Chair in Furniture category priced at 250
Create Gaming Mouse in Electronics category for 80
```

### Create Multiple Products
```
Add 3 laptops: Dell XPS 1200, HP Spectre 1100, Lenovo Yoga 900 in Electronics
Create products: Chair 150 Furniture and Desk 300 Furniture
Add Office Desk 400, Office Chair 200, Monitor Stand 100 in Office furniture category
Create iPhone 14 at 799, iPhone 15 at 999, iPhone 16 at 1199 in Electronics with mobiles segment
```

**Format Tips for Multiple Products:**
- List products with name, price, and category
- Optionally add segment information
- You can use various natural phrasings:
  - "Add X, Y, and Z in [category]"
  - "Create products: X for price, Y for price in category"
  - "Add X at price, Y at price in category with segment"

## Update Products

### Update Single Product
```
Update iPhone 17 price to 799
Change Laptop1 price to 1200
Set MacBook Pro price to 2999
Update the price of iPhone 15 Pro to 1100
```

### Update Multiple Products (Bulk)
```
Update all MacBook products to price 2800
Update price of all home office products to 400
Set all Laptop prices to 1500
Change all iPhone prices to 900
Update all products in Furniture category to 250
```

## 🗑️ Delete Products

### Single Delete
```
Delete Acer Laptop
Remove iPhone 15 Pro
Erase the MacBook Air product
```

### Bulk Delete (Multiple Products)
```
Delete all MacBook products
Remove all laptops in Electronics category
Delete all home office products
Erase all iPhone models
Remove all products in Laptops segment
Delete all furniture items
```

## Duplicate Management

### Find Duplicates
```
Show me duplicate products
Find duplicates
Identify duplicate products
```

### Clean Up Duplicates
```
Clean up duplicate products
Remove duplicate products
Delete duplicates
```

## Complex Queries

### Grouped Results
```
Show all products grouped by category
```

### Combined Filters
```
Show me all MacBook products
Find all iPhone models
Get Laptop products in Electronics
```

---

## Examples for create_multiple_products Tool

The `create_multiple_products` tool is perfect when you need to add several products at once. Here are working examples:

### Example 1: Simple Multiple Products
**Command:**
```
Add Chair 150, Desk 300, and Lamp 50 in Furniture category
```

**What it does:** Creates 3 furniture items with their respective prices.

### Example 2: Laptops with Segment
**Command:**
```
Add Dell XPS 1200, HP Spectre 1100, Lenovo Yoga 900 in Electronics category with Laptops segment
```

**What it does:** Creates 3 laptop products in Electronics category with Laptops segment.

### Example 3: Mixed Format
**Command:**
```
Create products: Gaming Mouse at 80 in Electronics, Keyboard at 120 in Electronics, Monitor at 350 in Electronics
```

**What it does:** Creates 3 electronics products with detailed pricing.

### Example 4: iPhone Series
**Command:**
```
Add iPhone 14 799, iPhone 15 999, iPhone 16 1199 in Electronics with mobiles segment
```

**What it does:** Creates multiple iPhone models with their prices in the mobiles segment.

### Example 5: Office Furniture Set
**Command:**
```
Create Office Desk 400, Office Chair 200, Monitor Stand 100, Desk Lamp 45 in Office furniture
```

**What it does:** Creates a complete office furniture set.

---

## Tips for Best Results

1. **Be specific**: Include product name, price, and category
2. **Use numbers**: Always specify prices as numbers (not "expensive" or "cheap")
3. **List format**: For multiple products, list them clearly with commas or "and"
4. **Category consistency**: Try to keep category names consistent (e.g., "Electronics" not "electronic" or "tech")
5. **Natural language**: The system understands various phrasings, so use what feels natural

## Common Patterns

- **Pattern 1:** `Create [product] in [category] for [price]`
- **Pattern 2:** `Add [product1] [price1], [product2] [price2] in [category]`
- **Pattern 3:** `Create products: [product1] at [price1], [product2] at [price2] in [category]`
- **Pattern 4:** `Add [product] [price] [category] and [product] [price] [category]`

