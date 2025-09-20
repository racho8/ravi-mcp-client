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


## STEPS:
export MCP_SERVER_URL='https://ravi-mcp-server-256110662801.europe-west3.run.app/mcp'
export PORT=3001