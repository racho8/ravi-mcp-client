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
Create Desk Lamp 45 in Office furniture, HomeOffice segment
```

### Create Multiple Products (with Category and Segment)
```
Add 3 laptops: Dell XPS 1200, HP Spectre 1100, Lenovo Yoga 900 in Electronics category and Laptops segment
Create products: Chair 150 Furniture and Desk 300 Furniture
Add Office Desk 400, Office Chair 200, Monitor Stand 100, Desk Lamp 45 in Office furniture category and HomeOffice segment
Create iPhone 14 at 799, iPhone 15 at 999, iPhone 16 at 1199 in Electronics category with mobiles segment
Add Wireless Mouse 25, Keyboard 75 in Electronics category, Accessories segment
```

**Format Tips for Multiple Products:**
- List products with name, price, and optionally category + segment
- Segment information helps organize products better
- You can use various natural phrasings:
  - "Add X, Y, and Z in [category]"
  - "Create products: X for price, Y for price in category"
  - "Add X at price, Y at price in category with segment"
  - "Create X price, Y price in [category] category and [segment] segment"

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
Add Dell XPS 1200, HP Spectre 1100, Lenovo Yoga 900 in Electronics category and Laptops segment
```

**What it does:** Creates 3 laptop products in Electronics category with Laptops segment.

### Example 3: Office Furniture with Category and Segment
**Command:**
```
Create Office Desk 400, Office Chair 200, Monitor Stand 100, Desk Lamp 45 in Office furniture category and HomeOffice segment
```

**What it does:** Creates a complete office furniture set with category and segment for better organization.

### Example 4: Mixed Format
**Command:**
```
Create products: Gaming Mouse at 80 in Electronics, Keyboard at 120 in Electronics, Monitor at 350 in Electronics
```

**What it does:** Creates 3 electronics products with detailed pricing.

### Example 5: iPhone Series with Category and Segment
**Command:**
```
Add iPhone 14 799, iPhone 15 999, iPhone 16 1199 in Electronics category and mobiles segment
```

**What it does:** Creates multiple iPhone models with their prices in Electronics category under mobiles segment.

### Example 6: Accessories with Segment
**Command:**
```
Add Wireless Mouse 25, USB Cable 10, Phone Case 15 in Electronics category, Accessories segment
```

**What it does:** Creates multiple accessory products properly categorized and segmented.

---

## Tips for Best Results

1. **Be specific**: Include product name, price, and optionally category + segment
2. **Use numbers**: Always specify prices as numbers (not "expensive" or "cheap")
3. **List format**: For multiple products, list them clearly with commas or "and"
4. **Category consistency**: Try to keep category names consistent (e.g., "Electronics" not "electronic" or "tech")
5. **Segment usage**: Add segment for better product organization (e.g., "Laptops", "mobiles", "HomeOffice", "Accessories")
6. **Natural language**: The system understands various phrasings, so use what feels natural

## Common Patterns

- **Pattern 1:** `Create [product] in [category] for [price]`
- **Pattern 2:** `Add [product1] [price1], [product2] [price2] in [category]`
- **Pattern 3:** `Create products: [product1] at [price1], [product2] at [price2] in [category]`
- **Pattern 4:** `Add [product] [price] in [category] category and [segment] segment`
- **Pattern 5:** `Create [product1] [price1], [product2] [price2] in [category] category, [segment] segment`

## Product Structure Fields

When creating products, you can include:
- **name** (required): Product name
- **price** (required): Product price (numeric value)
- **category** (optional): Product category (e.g., "Electronics", "Furniture", "Office furniture")
- **segment** (optional): Product segment for sub-categorization (e.g., "Laptops", "mobiles", "HomeOffice", "Accessories")

