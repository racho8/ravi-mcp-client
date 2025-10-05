# Complete Request Flow: "Show all products"

This document explains the end-to-end flow of a user request through the Product Management AI Assistant system, using "Show all products" as an example.

---

## Architecture Overview

The system follows a **BFF (Backend for Frontend)** pattern with the following components:

**Localhost Environment:**
- User (Browser)
- Frontend UI (HTML/CSS/JavaScript)
- Express BFF (Node.js/TypeScript)
- Ollama LLM (AI Model)
- MCP Client (Model Context Protocol Client)

**Google Cloud Environment:**
- MCP Server (Cloud Run Service)
- Product-Service (Business Logic)
- Product DB (Database)

---

## Complete Request Flow

### 1. User → Frontend UI

**What happens:**
- User types: "Show all products" in the chatbot interface
- User clicks "Send" button or presses Enter

**Data Flow:**
```
Input: "Show all products" (plain text)
```

**Frontend UI Actions:**
- Captures user input from the text field
- Disables the input field temporarily
- Shows a loading indicator
- Displays the user's message in the chat interface

---

### 2. Frontend UI → Express BFF

**What happens:**
- Frontend makes an HTTP POST request to the BFF

**Data Flow:**
```javascript
POST http://localhost:3000/api/chat
Headers: {
  "Content-Type": "application/json"
}
Body: {
  "message": "Show all products"
}
```

**Express BFF Receives:**
- Raw user message as a string
- No authentication required for localhost communication

---

### 3. Express BFF Processing

**What happens:**
The BFF acts as an orchestrator and does the following:

a) **Input Validation:**
   - Checks if message is non-empty
   - Sanitizes input if needed

b) **Session Management:**
   - Maintains conversation context
   - May store message history for context

c) **Prepares for LLM Processing:**
   - Formats the user message
   - Prepares system prompts
   - Gathers available tools information from MCP Client

**Data in BFF:**
```javascript
{
  userMessage: "Show all products",
  conversationHistory: [...previous messages],
  availableTools: [list of MCP tools]
}
```

---

### 4. Express BFF → Ollama LLM

**What happens:**
- BFF sends a structured prompt to Ollama LLM
- Uses LangChain library (@langchain/ollama v0.2.4)

**Data Flow - The Prompt Structure:**
```javascript
{
  // System Message (defines LLM behavior)
  systemMessage: `You are a helpful product management assistant.
    You have access to the following tools:
    - list_products: Retrieves all products from the database
    - get_product: Gets a specific product by ID
    - create_product: Creates a new product
    - update_product: Updates an existing product
    - delete_product: Deletes a product
    
    When the user asks to show products, use the list_products tool.
    Always respond in a friendly, professional manner.`,
  
  // User Message
  userMessage: "Show all products",
  
  // Available Tools (Tool Definitions)
  tools: [
    {
      name: "list_products",
      description: "Retrieves all products from the database",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of products to return"
          },
          offset: {
            type: "number", 
            description: "Number of products to skip"
          }
        }
      }
    }
    // ... other tools
  ],
  
  // Model Configuration
  model: "llama2", // or another Ollama model
  temperature: 0.7,
  stream: false
}
```

**Ollama LLM Processing:**
- Analyzes user intent: "Show all products"
- Matches intent with available tools
- Decides to use `list_products` tool
- Determines parameters (if any needed)

**LLM Response:**
```javascript
{
  // Tool Call Decision
  toolCalls: [
    {
      name: "list_products",
      parameters: {
        limit: 100,  // Default or inferred
        offset: 0
      }
    }
  ],
  // Optional: Reasoning or intermediate response
  reasoning: "User wants to see all products, I'll use list_products tool"
}
```

**No Authentication:** Ollama runs locally, no auth needed

---

### 5. Express BFF → MCP Client

**What happens:**
- BFF receives tool call decision from LLM
- Forwards the tool request to MCP Client

**Data Flow:**
```javascript
{
  tool: "list_products",
  parameters: {
    limit: 100,
    offset: 0
  }
}
```

**MCP Client Actions:**
- Validates the tool name exists
- Validates parameters against tool schema
- Prepares JSON-RPC request for MCP Server

---

### 6. MCP Client → MCP Server (Google Cloud)

**What happens:**
- MCP Client makes an authenticated HTTP request to Google Cloud Run

**Authentication Mechanism:**
```javascript
// Step 1: Get GCP Identity Token
const identityToken = await getGCPIdentityToken({
  targetAudience: "https://mcp-server-xxxxx.run.app"
});

// Step 2: Make authenticated request
POST https://mcp-server-xxxxx.run.app/rpc
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <GCP_IDENTITY_TOKEN>"
}
```

**GCP Authentication Flow:**
1. MCP Client uses Application Default Credentials (ADC)
2. Requests an Identity Token from GCP metadata server
3. Token is scoped to the specific Cloud Run service URL
4. Token is valid for 1 hour
5. MCP Server validates the token with GCP

**Data Flow - JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-12345",
  "method": "tools/call",
  "params": {
    "name": "list_products",
    "arguments": {
      "limit": 100,
      "offset": 0
    }
  }
}
```

---

### 7. MCP Server Processing

**What happens:**
- Validates incoming JWT token (GCP Identity Token)
- Validates JSON-RPC request format
- Maps tool name to internal service method

**Authentication Validation:**
```javascript
// MCP Server validates token
const decodedToken = await verifyGCPToken(bearerToken);
// Checks:
// - Token signature is valid
// - Token is not expired
// - Token audience matches this service
// - Token issuer is Google
```

**Authorization Check:**
- Ensures the caller has permission to invoke tools
- May check service account permissions

**Data Processing:**
```javascript
// MCP Server internal processing
const toolHandler = toolRegistry.get("list_products");
const result = await toolHandler({
  limit: 100,
  offset: 0
});
```

---

### 8. MCP Server → Product-Service

**What happens:**
- MCP Server forwards request to Product-Service
- Product-Service is a separate microservice handling business logic

**Data Flow:**
```javascript
POST http://product-service/api/products
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <INTERNAL_SERVICE_TOKEN>"
}
Body: {
  "action": "list",
  "params": {
    "limit": 100,
    "offset": 0
  }
}
```

**Authentication (Service-to-Service):**
- Uses internal service authentication
- Could be:
  - GCP Service Account Token
  - Mutual TLS (mTLS)
  - API Key
  - Internal JWT

**Product-Service Actions:**
- Validates request
- Applies business logic (filtering, permissions, etc.)
- Prepares database query

---

### 9. Product-Service → Product DB

**What happens:**
- Product-Service executes database query

**Data Flow - SQL Query:**
```sql
SELECT 
  id, 
  name, 
  description, 
  price, 
  category, 
  stock_quantity,
  created_at,
  updated_at
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 100 OFFSET 0;
```

**Authentication (Database):**
```javascript
// Database connection with credentials
const dbConnection = {
  host: "product-db.internal",
  port: 5432,
  database: "products",
  user: "product_service",
  password: "<DB_PASSWORD>", // From environment variable or secret manager
  ssl: {
    required: true,
    ca: "<CA_CERTIFICATE>"
  }
}
```

**Product DB Returns:**
```json
[
  {
    "id": 1,
    "name": "Laptop Pro 15",
    "description": "High-performance laptop",
    "price": 1299.99,
    "category": "Electronics",
    "stock_quantity": 25,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:22:00Z"
  },
  {
    "id": 2,
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse",
    "price": 29.99,
    "category": "Accessories",
    "stock_quantity": 150,
    "created_at": "2024-01-16T09:15:00Z",
    "updated_at": "2024-01-16T09:15:00Z"
  }
  // ... more products
]
```

---

## Response Flow (Data Returns Back)

### 10. Product DB → Product-Service

**Data Flow:**
```javascript
// Raw database results
products: [
  { id: 1, name: "Laptop Pro 15", ... },
  { id: 2, name: "Wireless Mouse", ... },
  // ... more products
]
```

---

### 11. Product-Service → MCP Server

**What happens:**
- Product-Service formats response
- Applies business rules (e.g., hide sensitive data)
- Returns to MCP Server

**Data Flow:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Laptop Pro 15",
        "description": "High-performance laptop",
        "price": 1299.99,
        "category": "Electronics",
        "stock_quantity": 25
      },
      {
        "id": 2,
        "name": "Wireless Mouse",
        "description": "Ergonomic wireless mouse",
        "price": 29.99,
        "category": "Accessories",
        "stock_quantity": 150
      }
    ],
    "total_count": 42,
    "limit": 100,
    "offset": 0
  },
  "timestamp": "2024-01-22T15:30:45Z"
}
```

---

### 12. MCP Server → MCP Client

**What happens:**
- MCP Server wraps data in JSON-RPC response format

**Data Flow - JSON-RPC Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-12345",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"products\": [{\"id\": 1, \"name\": \"Laptop Pro 15\", ...}], \"total_count\": 42}"
      }
    ]
  }
}
```

**Or in case of error:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-12345",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "details": "Database connection failed"
    }
  }
}
```

---

### 13. MCP Client → Express BFF

**What happens:**
- MCP Client receives JSON-RPC response
- Extracts the result data
- Returns to BFF

**Data Flow:**
```javascript
{
  success: true,
  data: {
    products: [
      { id: 1, name: "Laptop Pro 15", ... },
      { id: 2, name: "Wireless Mouse", ... }
    ],
    total_count: 42
  }
}
```

---

### 14. Express BFF → Ollama LLM (Second Call)

**What happens:**
- BFF sends tool result back to LLM
- LLM formats a user-friendly response

**Data Flow - Prompt with Tool Result:**
```javascript
{
  systemMessage: "You are a helpful product management assistant...",
  
  conversationHistory: [
    {
      role: "user",
      content: "Show all products"
    },
    {
      role: "assistant",
      content: null,
      toolCalls: [
        {
          name: "list_products",
          parameters: { limit: 100, offset: 0 }
        }
      ]
    },
    {
      role: "tool",
      toolCallId: "call-123",
      name: "list_products",
      content: JSON.stringify({
        products: [
          { id: 1, name: "Laptop Pro 15", price: 1299.99, ... },
          { id: 2, name: "Wireless Mouse", price: 29.99, ... }
        ],
        total_count: 42
      })
    }
  ],
  
  instruction: "Format the products list in a user-friendly way"
}
```

**LLM Response:**
```javascript
{
  content: "I found 42 products in the database. Here are the first few:\n\n" +
           "1. **Laptop Pro 15** - $1,299.99\n" +
           "   High-performance laptop\n" +
           "   Category: Electronics | Stock: 25 units\n\n" +
           "2. **Wireless Mouse** - $29.99\n" +
           "   Ergonomic wireless mouse\n" +
           "   Category: Accessories | Stock: 150 units\n\n" +
           "Would you like to see more products or filter by category?",
  
  finishReason: "stop"
}
```

---

### 15. Express BFF → Frontend UI

**What happens:**
- BFF sends final response to frontend

**Data Flow:**
```json
{
  "success": true,
  "response": "I found 42 products in the database. Here are the first few:\n\n1. **Laptop Pro 15** - $1,299.99\n   High-performance laptop\n   Category: Electronics | Stock: 25 units\n\n2. **Wireless Mouse** - $29.99\n   Ergonomic wireless mouse\n   Category: Accessories | Stock: 150 units\n\n Would you like to see more products or filter by category?",
  "metadata": {
    "timestamp": "2024-01-22T15:30:47Z",
    "processingTime": "2.3s",
    "toolsUsed": ["list_products"]
  }
}
```

---

### 16. Frontend UI → User

**What happens:**
- Frontend receives response
- Formats and displays in chat interface
- Re-enables input field
- Hides loading indicator

**User Sees:**
```
Assistant:
I found 42 products in the database. Here are the first few:

1. Laptop Pro 15 - $1,299.99
   High-performance laptop
   Category: Electronics | Stock: 25 units

2. Wireless Mouse - $29.99
   Ergonomic wireless mouse
   Category: Accessories | Stock: 150 units

Would you like to see more products or filter by category?
```

---

## Summary of Data Transformations

```
User Input: "Show all products"
    ↓
Frontend: { message: "Show all products" }
    ↓
BFF: Prepares context + system prompt
    ↓
LLM: Analyzes intent → Decides tool: "list_products"
    ↓
MCP Client: { tool: "list_products", params: {limit: 100} }
    ↓
MCP Server: JSON-RPC { method: "tools/call", params: {...} }
    ↓
Product-Service: { action: "list", params: {...} }
    ↓
Database: SQL Query → Raw product records
    ↓
Product-Service: Formatted JSON response
    ↓
MCP Server: JSON-RPC response wrapper
    ↓
MCP Client: Extracted data
    ↓
BFF: Data → LLM for formatting
    ↓
LLM: User-friendly formatted text
    ↓
Frontend: Rendered in chat UI
    ↓
User: Sees formatted product list
```

---

## Authentication Summary

### 1. **Frontend ↔ BFF** (Localhost)
- **Type:** None (local development)
- **Production:** Would use session tokens, JWT, or OAuth

### 2. **BFF ↔ Ollama LLM** (Localhost)
- **Type:** None (local process)
- **Details:** Ollama runs as local service, no auth needed

### 3. **MCP Client ↔ MCP Server** (Cloud)
- **Type:** GCP Identity Token (JWT)
- **Mechanism:**
  - MCP Client requests token from GCP metadata service
  - Token includes: issuer, audience, expiration, service account
  - MCP Server validates token with Google's public keys
  - Token valid for 1 hour
- **Security:** End-to-end encryption (HTTPS/TLS)

### 4. **MCP Server ↔ Product-Service** (Internal)
- **Type:** Internal Service Authentication
- **Options:**
  - Service Account Token
  - Mutual TLS (mTLS)
  - Internal API Key
- **Security:** Private network, encrypted communication

### 5. **Product-Service ↔ Database**
- **Type:** Database Credentials
- **Mechanism:**
  - Username/password from Secret Manager
  - SSL/TLS encrypted connection
  - Certificate-based authentication
- **Security:** Encrypted in transit, credentials rotated regularly

---

## Error Handling at Each Stage

### Frontend
- Network errors → Show "Connection failed" message
- Timeout → Show "Request taking longer than expected"

### BFF
- Invalid input → Return 400 Bad Request
- LLM timeout → Return 504 Gateway Timeout
- MCP Client error → Log and return 500 Internal Server Error

### Ollama LLM
- Tool not found → Returns error, BFF handles gracefully
- Invalid parameters → LLM retries with corrected parameters

### MCP Client
- Auth failure → Retry with new token
- Network error → Retry with exponential backoff

### MCP Server
- Auth failure → Return 401 Unauthorized
- Invalid JSON-RPC → Return 400 Bad Request
- Service error → Return 500 Internal Server Error

### Product-Service
- Database error → Return 503 Service Unavailable
- Invalid query → Return 400 Bad Request

### Database
- Connection error → Retry with connection pool
- Query timeout → Return timeout error
- Deadlock → Retry transaction

---

## Performance Considerations

**Total Request Time: ~2-3 seconds**

Breakdown:
- Frontend → BFF: ~50ms (network)
- BFF → LLM (first call): ~500ms (AI inference)
- MCP Client → MCP Server: ~100ms (network + auth)
- MCP Server → Product-Service: ~50ms (internal network)
- Product-Service → Database: ~200ms (query execution)
- Product-Service → MCP Server: ~20ms
- MCP Server → MCP Client: ~100ms
- BFF → LLM (second call): ~800ms (formatting response)
- BFF → Frontend: ~50ms

**Optimization Opportunities:**
1. Cache common queries (product list)
2. Parallel processing where possible
3. Connection pooling for database
4. Token caching (reuse GCP tokens for 1 hour)
5. Streaming responses for large datasets
6. CDN for static assets

---

## Key Technologies Used

### Localhost
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **BFF:** Node.js, Express.js, TypeScript
- **LLM:** Ollama (llama2 or similar model)
- **MCP Client:** Model Context Protocol SDK
- **Communication:** HTTP/REST, JSON

### Google Cloud
- **MCP Server:** Cloud Run (containerized service)
- **Product-Service:** Node.js microservice
- **Database:** Cloud SQL (PostgreSQL) or Firestore
- **Authentication:** GCP Identity Token (OAuth 2.0)
- **Networking:** VPC, Cloud Load Balancing
- **Security:** Cloud IAM, Secret Manager

---

## For New Developers

**Understanding the Flow:**
1. User interacts with Frontend (simple HTML form)
2. BFF orchestrates the entire flow (central hub)
3. LLM provides AI intelligence (understands natural language)
4. MCP is the protocol for tool invocation (standardized way to call functions)
5. Cloud services handle data persistence (scalable, secure)

**Key Concepts:**
- **BFF Pattern:** Backend specifically designed for frontend needs
- **Tool Calling:** LLM decides which function to call based on user intent
- **JSON-RPC:** Remote procedure call protocol used by MCP
- **GCP Identity Token:** Google's way of authenticating service-to-service calls
- **Prompt Engineering:** Crafting system prompts to guide LLM behavior

**Where to Start:**
1. Examine Frontend code (`public/index.html`)
2. Study BFF routes (`src/bff/routes.ts`)
3. Understand LLM integration (`src/bff/llmClient.ts`)
4. Review MCP Client (`src/bff/mcpClient.ts`)
5. Test with simple queries: "Show all products", "Create a product"

---

## Conclusion

This architecture provides:
- ✅ **Separation of Concerns:** Each component has a clear responsibility
- ✅ **Scalability:** Cloud components can scale independently
- ✅ **Security:** Multiple layers of authentication and authorization
- ✅ **Flexibility:** Easy to add new tools and capabilities
- ✅ **User Experience:** Natural language interface powered by AI
- ✅ **Maintainability:** Clear data flow and error handling

The system transforms natural language into structured database operations and returns user-friendly responses, all while maintaining security and performance.
