# ravi-mcp-client

A Backend-for-Frontend (BFF) that leverages a local LLM (Ollama/Google) to interpret user natural language commands and communicates with a remote MCP server to invoke tools and return results.

## Architecture

```mermaid
flowchart TD
    User[User (Web/Chatbot)]
    Frontend[Frontend (Web App/Chatbot UI)]
    BFF[BFF Backend (Node.js/Express)]
    LLM[Local LLM (Ollama/Google LLM)]
    MCP[Remote MCP Server]
    Tools[Remote Tools/Services]

    User --> Frontend
    Frontend -->|Natural Language Command| BFF
    BFF -->|Prompt| LLM
    LLM -->|Parsed Intent/Tool Call| BFF
    BFF -->|API Call| MCP
    MCP -->|Tool Invocation| Tools
    Tools --> MCP
    MCP -->|Result| BFF
    BFF -->|Response| Frontend
    Frontend --> User
```

## Stack
- Node.js (Express)
- Ollama/Google LLM client
- REST API to MCP server

## Usage

## Running the Application

### 1. Install dependencies
```sh
npm install
```

### 2. Build the project (TypeScript -> JavaScript)
```sh
npm run build
```

### 3. Run the compiled backend (production mode)
```sh
node dist/bff/index.js
```

### 4. Run in development mode (hot-reload, ES Modules)
```sh
npx ts-node --loader ts-node/esm src/bff/index.ts
```
Or update your `package.json` dev script to:
```
"dev": "ts-node --loader ts-node/esm src/bff/index.ts"
```
Then run:
```sh
npm run dev
```

### 5. Environment Variables
Set the MCP server URL and port as needed:
```sh
export MCP_SERVER_URL='http://your-mcp-server/mcp'
export PORT=3001
```

### 6. Test the API
Send a POST request to `/api/command`:
```sh
curl -X POST http://localhost:3001/api/command \
    -H "Content-Type: application/json" \
    -d '{"command": "Show me the welcome message."}'
```

### 7. (Optional) Add a frontend or chatbot UI


# Ravi MCP Client 🚀

Modern AI-powered product management system with natural language interface, built with TypeScript, Express, and the Model Context Protocol (MCP). Features intelligent product search, bulk operations, duplicate management, and a sleek modern UI with gradients and animations.

## ✨ Features

### 🤖 AI-Powered Natural Language Interface
- **Intelligent Command Processing**: "Update the price of all iPhones to 999"
- **Smart Product Search**: "Find all MacBook products", "Show me laptops"
- **Counting Queries**: "How many products are there?", "Count iPhone models"
- **Bulk Operations**: "Update all MacBook Pro 16-inch products to price 2900"

### 🎨 Modern UI & UX
- **Sleek Design**: Modern gradients, animations, and responsive layout
- **Recent Commands**: Last 5 commands saved and clickable for quick access
- **Enhanced Formatting**: Beautiful product cards with clear information hierarchy
- **Mobile Responsive**: Works seamlessly across all device sizes

### 📦 Comprehensive Product Management
- **CRUD Operations**: Create, read, update, delete products with intelligent handling
- **Smart Filtering**: Name-based filtering with substring matching
- **Duplicate Detection**: Advanced algorithms to find and recommend cleanup of duplicates
- **Bulk Updates**: Update multiple products at once with pattern matching

### 🔧 Technical Excellence
- **TypeScript**: Full type safety throughout the application
- **MCP Protocol**: Modern Model Context Protocol for AI-tool communication
- **Express BFF**: Backend-for-Frontend pattern with intelligent routing
- **Google Cloud Integration**: Hosted MCP server on Google Cloud Run
- **Advanced Error Handling**: Comprehensive logging and user-friendly error messages

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Modern UI     │    │   Express BFF    │    │  MCP Server     │
│                 │    │                  │    │                 │
│ • Gradients     │◄──►│ • LLM Client     │◄──►│ • Product CRUD  │
│ • Animations    │    │ • Route Handler  │    │ • Bulk Ops      │
│ • Recent Cmds   │    │ • Smart Parsing  │    │ • Google Cloud  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to Ollama (for local LLM) or configure cloud LLM
- MCP server endpoint (Google Cloud Run)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ravi-mcp-client.git
   cd ravi-mcp-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3001` to access the modern UI

### Environment Configuration

Create a `.env` file (optional):
```bash
MCP_SERVER_URL=https://your-mcp-server.run.app/mcp
PORT=3001
```

## 🎯 Usage Examples

### Natural Language Commands

**Product Search:**
```
"Show all products"
"Find all MacBook products"
"Show me products in Electronics category"
"Get iPhone models"
```

**Counting Queries:**
```
"How many products are there?"
"Count MacBook products"
"How many items in Electronics?"
```

**Updates:**
```
"Update the price of iPhone 15 to 899"
"Update all iPhones to price 999"
"Change MacBook Pro 16-inch price to 2500"
```

**Bulk Operations:**
```
"Update all MacBook Pro 16-inch products to price 2900"
"Set all laptop prices to 1500"
```

**Duplicate Management:**
```
"Find duplicates"
"Clean up duplicate products"
"Show duplicate analysis"
```

## 🔌 API Endpoints

### POST `/api/command`
Process natural language commands

**Request:**
```json
{
  "command": "Find all MacBook products"
}
```

**Response:**
```json
{
  "result": [
    {
      "id": "uuid-123",
      "name": "MacBook Pro 16-inch",
      "price": 2499,
      "category": "Electronics",
      "segment": "Laptops"
    }
  ]
}
```

## 🛠️ Development

### Project Structure
```
src/
├── bff/
│   ├── index.ts          # Express server setup
│   ├── routes.ts         # Main request routing logic
│   ├── llmClient.ts      # LLM integration (Ollama)
│   ├── mcpClient.ts      # MCP protocol client
│   └── mcpSchemaCache.ts # Tool schema caching
├── types/
│   └── index.ts          # TypeScript type definitions
└── utils/                # Utility functions

public/
└── index.html           # Modern UI with gradients & animations
```

### Key Components

**routes.ts**: Intelligent command processing with:
- LLM intent parsing
- MCP tool execution
- Smart filtering for product searches
- Bulk operation handling
- Duplicate detection and cleanup

**llmClient.ts**: Advanced prompt engineering for:
- Tool selection guidance
- Parameter extraction
- Context-aware responses

**mcpClient.ts**: Clean MCP protocol integration with:
- Google Cloud authentication
- Error handling and retries
- Tool schema validation

### Scripts
```bash
npm run build     # Compile TypeScript
npm start         # Start production server
npm run dev       # Development mode (if configured)
```

## 🎨 UI Features

### Modern Design Elements
- **Gradient Backgrounds**: Eye-catching purple-to-blue gradients
- **Smooth Animations**: Hover effects and transitions
- **Recent Commands**: Quick access to last 5 commands
- **Responsive Layout**: Mobile-first design approach
- **Enhanced Typography**: Clear hierarchy and readability

### User Experience
- **Instant Feedback**: Real-time command processing
- **Error Handling**: User-friendly error messages
- **Loading States**: Clear indication of processing
- **Command History**: Easy command repetition

## 🔍 Advanced Features

### Smart Product Matching
- **Substring Search**: "iPhone" matches "iPhone 14", "iPhone 15 Pro"
- **Case Insensitive**: Works with any capitalization
- **Fuzzy Logic**: Intelligent name resolution

### Duplicate Management
- **Detection Algorithm**: Finds products with identical names
- **Smart Recommendations**: Suggests which duplicates to keep/delete
- **Bulk Cleanup**: One-click duplicate removal

### Counting Queries
- **Natural Language**: "How many", "Count", "Number of"
- **Contextual Filtering**: Applies same filters as regular searches
- **Enhanced Responses**: Clear count with context

## 🚀 Deployment

### Local Development
```bash
npm run build
node dist/bff/index.js
```

### Production Deployment
The application can be deployed to any Node.js hosting platform:
- Heroku, Railway, Render
- AWS, Google Cloud, Azure
- Docker containers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with comprehensive tests
4. Submit a pull request with detailed description

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Model Context Protocol (MCP)**: For enabling seamless AI-tool communication
- **Ollama**: For local LLM capabilities
- **Google Cloud**: For reliable MCP server hosting
- **TypeScript**: For excellent developer experience and type safety

---

**Built with ❤️ using modern web technologies and AI-first design principles.**