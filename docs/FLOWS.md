# Request Flow Examples

This document provides detailed sequence diagrams showing how different types of commands flow through the system.

## 📊 Sample Flow: "Show All Products"

<details>
<summary><strong>Click to view detailed sequence diagram</strong></summary>

The following sequence diagram illustrates how the system processes a natural language command like "show all products":

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend UI<br/>(index.html)
    participant BFF as Express BFF<br/>(routes.ts)
    participant LLM as LLM Client<br/>(llmClient.ts)
    participant Ollama as Ollama LLM<br/>(Local)
    participant MCP as MCP Client<br/>(mcpClient.ts)
    participant GCP as GCP Auth
    participant Server as MCP Server<br/>(Google Cloud)
    participant DB as Product Database

    User->>Frontend: Types "show all products"
    Frontend->>BFF: POST /api/command<br/>{"command": "show all products"}
    
    Note over BFF: processNaturalLanguageCommand()
    BFF->>LLM: callLLM("show all products")
    
    Note over LLM: Fetch MCP tool schemas
    LLM->>Server: GET tool definitions (cached)
    Server-->>LLM: Available tools & schemas
    
    Note over LLM: Build dynamic prompt with tools
    LLM->>Ollama: POST /api/generate<br/>{"model": "llama3", "prompt": "..."}
    Ollama-->>LLM: {"tool": "list_products", "parameters": {}}
    LLM-->>BFF: Tool invocation result
    
    Note over BFF: callMCP(toolInvocation)
    BFF->>MCP: Execute tool call
    
    Note over MCP: Authentication flow
    MCP->>GCP: execSync('gcloud auth print-identity-token')
    GCP-->>MCP: Bearer token
    
    Note over MCP: Build JSON-RPC payload
    MCP->>Server: POST /mcp<br/>{"jsonrpc": "2.0", "method": "tools/call",<br/>"params": {"name": "list_products"}}
    
    Note over Server: MCP Server processing
    Server->>DB: SELECT * FROM products
    DB-->>Server: Product records
    Server-->>MCP: {"result": [{"id": "uuid1", "name": "iPhone 15", ...}, ...]}
    
    MCP-->>BFF: MCP response with products
    
    Note over BFF: Post-processing & filtering
    alt Counting Query
        BFF->>BFF: Convert to count format
    else Name-based filtering
        BFF->>BFF: Filter by product name patterns
    else Grouping request
        BFF->>BFF: Group by category/segment
    else Duplicate management
        BFF->>BFF: Analyze duplicates
    end
    
    BFF-->>Frontend: {"result": {"result": [products...]}}
    
    Note over Frontend: formatResponse(data)
    Frontend->>Frontend: Generate product cards with<br/>clickable categories/segments
    Frontend->>User: Display formatted product list<br/>with interactive UI elements
    
    Note over User,DB: Complete flow: ~200-500ms
```

### Flow Breakdown

**1. User Input (Frontend)**
- User types natural language command in chat interface
- JavaScript captures input and sends POST request to BFF

**2. Intent Recognition (LLM)**
- Dynamically fetches MCP tool schemas for up-to-date prompting
- Builds comprehensive prompt with 200+ lines of tool definitions
- Ollama LLM converts natural language to structured tool call

**3. Authentication & MCP Call**
- Automatically handles GCP authentication via gcloud CLI
- Builds JSON-RPC payload following MCP protocol standards
- Sends authenticated request to remote MCP server

**4. Data Processing**
- MCP server executes database operations
- Returns structured product data
- BFF applies intelligent post-processing (filtering, grouping, counting)

**5. Response Formatting**
- Frontend renders products as interactive cards
- Adds clickable category/segment badges for filtering
- Displays with animations and modern UI elements

### Key Architecture Benefits

- **Separation of Concerns**: Each layer has distinct responsibilities
- **Smart Caching**: Tool schemas cached for performance
- **Flexible Authentication**: Works locally and in production
- **Intelligent Processing**: Post-processing handles complex queries
- **Modern UX**: Real-time, interactive product displays

</details>

## 🔄 Sample Flow: "Update iPhone18 price to 666"

<details>
<summary><strong>Click to view detailed update sequence diagram</strong></summary>

The following sequence diagram illustrates how the system processes an update command using the **LLM-first approach**:

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend UI<br/>(index.html)
    participant BFF as Express BFF<br/>(routes.ts)
    participant LLM as LLM Client<br/>(llmClient.ts)
    participant Ollama as Ollama LLM<br/>(Local)
    participant MCP as MCP Client<br/>(mcpClient.ts)
    participant GCP as GCP Auth
    participant Server as MCP Server<br/>(Google Cloud)
    participant DB as Product Database

    User->>Frontend: Types "Update iPhone18 price to 666"
    Frontend->>BFF: POST /api/command<br/>{"command": "Update iPhone18 price to 666"}
    
    Note over BFF: processNaturalLanguageCommand()
    BFF->>LLM: callLLM("Update iPhone18 price to 666")
    
    Note over LLM: Fetch cached MCP tool schemas
    LLM->>LLM: Build dynamic prompt with update_product tool definition
    
    Note over LLM: LLM-first natural language parsing
    LLM->>Ollama: POST /api/generate<br/>{"model": "llama3", "prompt": "...analyze and return tool call"}
    Ollama-->>LLM: {"tool": "update_product",<br/>"parameters": {"id": "iPhone18", "price": 666}}
    LLM-->>BFF: Tool invocation result
    
    Note over BFF: Handle update commands flow
    BFF->>BFF: Detect llmResult.tool === 'update_product'
    
    Note over BFF: Initial attempt (will fail for product names)
    BFF->>MCP: callMCP(update_product, {id: "iPhone18", price: 666})
    
    Note over MCP: Authentication & JSON-RPC call
    MCP->>GCP: execSync('gcloud auth print-identity-token')
    GCP-->>MCP: Bearer token
    MCP->>Server: POST /mcp<br/>{"method": "tools/call", "params": {<br/>"name": "update_product", "arguments": {"id": "iPhone18", "price": 666}}}
    
    Note over Server: UUID validation fails
    Server->>DB: No product found with ID "iPhone18"
    Server-->>MCP: {"result": {"response": "datastore: no such entity"}}
    MCP-->>BFF: Error response
    
    Note over BFF: Smart UUID resolution flow
    BFF->>BFF: Detect update_product command needs resolution
    BFF->>MCP: callMCP(list_products, {}) - Get all products
    
    MCP->>Server: POST /mcp<br/>{"method": "tools/call", "params": {"name": "list_products"}}
    Server->>DB: SELECT * FROM products
    DB-->>Server: All product records
    Server-->>MCP: {"result": [{"id": "uuid1", "name": "iPhone18", "price": 399}, ...]}
    MCP-->>BFF: Complete product list
    
    Note over BFF: Product name matching
    BFF->>BFF: Find product where name.toLowerCase() === "iphone18"
    BFF->>BFF: matchingProduct = {id: "806403a6-...", name: "iPhone18", price: 399}
    
    Note over BFF: Execute update with resolved UUID
    BFF->>MCP: callMCP(update_product, {<br/>id: "806403a6-c2c1-439c-8d9f-7d254cbf9b1b",<br/>price: 666})
    
    MCP->>Server: POST /mcp<br/>{"method": "tools/call", "params": {<br/>"name": "update_product", "arguments": {<br/>"id": "806403a6-c2c1-439c-8d9f-7d254cbf9b1b", "price": 666}}}
    
    Server->>DB: UPDATE products SET price = 666<br/>WHERE id = '806403a6-...'
    DB-->>Server: Update successful
    Server-->>MCP: {"result": {"success": true, "updated": {...}}}
    MCP-->>BFF: Success response
    
    Note over BFF: Enhanced response formatting
    BFF->>BFF: Create enhanced response:<br/>{success: true, message: "Successfully updated 'iPhone18' price to 666",<br/>productName: "iPhone18", oldPrice: 399, newPrice: 666}
    
    BFF-->>Frontend: {"result": {"success": true, "message": "...", "updatedProduct": {...}}}
    
    Note over Frontend: Display success feedback
    Frontend->>Frontend: Show success message with<br/>old price → new price transition
    Frontend->>User: "✅ Successfully updated 'iPhone18' price<br/>from 399 to 666"
    
    Note over User,DB: Complete update flow: ~300-800ms
```

### Update Flow Breakdown

**1. LLM-First Natural Language Processing**
- User provides command in any natural format: "Update iPhone18 price to 666"
- LLM intelligently parses intent and extracts: `tool: "update_product"`, `parameters: {id: "iPhone18", price: 666}`
- **No regex patterns** - pure LLM intelligence for command understanding

**2. Smart UUID Resolution**
- Initial attempt fails because "iPhone18" is a product name, not a UUID
- System automatically fetches all products via `list_products`
- Performs intelligent name matching (case-insensitive, exact + partial)
- Resolves product name → UUID: "iPhone18" → "806403a6-c2c1-439c-8d9f-7d254cbf9b1b"

**3. Successful Update Execution**
- Calls `update_product` with resolved UUID and new price
- Database update executed with proper entity identification
- Returns enhanced response with old price, new price, and success confirmation

**4. Enhanced User Feedback**
- Shows clear before/after price comparison
- Confirms which product was updated by name
- Provides detailed success messaging

### LLM-First Approach Benefits

- **Natural Language Flexibility**: Works with "Update iPhone18 price to 666", "Update the price of iPhone18 to 666", "Set iPhone18 to $666"
- **No Regex Dependency**: Eliminates brittle pattern matching - LLM handles all command variations
- **Smart Error Recovery**: Automatic UUID resolution when product names are provided
- **Enhanced UX**: Detailed feedback with price transitions and product confirmations
- **Robust Matching**: Handles exact name matches, partial matches, and case-insensitive matching

</details>
