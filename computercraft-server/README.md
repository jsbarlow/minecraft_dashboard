# ComputerCraft Dashboard Server

A professional WebSocket server for connecting ComputerCraft computers and turtles to a web-based dashboard. This server provides real-time communication, command routing, and API management for ComputerCraft automation systems.

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket     ┌──────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   Dashboard     │ ◄──────────────► │   Server         │ ◄──────────────────► │  ComputerCraft  │
│   (React)       │                  │   (Node.js)      │                      │   (Lua Scripts) │
└─────────────────┘                  └──────────────────┘                      └─────────────────┘
```

### Components

- **Express HTTP Server**: API endpoints for ComputerCraft integration
- **WebSocket Server**: Real-time communication with dashboards
- **Client Manager**: Tracks connected dashboards and computers
- **Message Router**: Routes messages between different client types
- **TypeScript Types**: Shared message interfaces with frontend

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

### Server Endpoints

The server runs on `http://localhost:8080` by default:

- **WebSocket**: `ws://localhost:8080/ws` (for dashboards)
- **Health Check**: `GET /health`
- **API Endpoints**: `POST /api/computercraft/*`

## 📡 WebSocket Communication (Dashboards)

Dashboards connect via WebSocket for real-time communication:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

// Send a chat message
ws.send(JSON.stringify({
  type: 'chat',
  source: 'dashboard',
  content: 'Hello from dashboard!',
  priority: 'medium'
}));
```

## 🤖 ComputerCraft Integration

Since ComputerCraft doesn't have native WebSocket support, computers use HTTP endpoints:

### 1. Register Computer

```lua
-- Register your computer with available functions
local registrationData = {
    computerName = "MiningTurtle_1",
    computerType = "turtle",
    functions = {
        {
            name = "startMining",
            description = "Start automated mining",
            parameters = {},
            category = "mining"
        }
    },
    status = {
        fuel = turtle.getFuelLevel(),
        position = {x = 100, y = 64, z = 200}
    }
}

http.post(
    "http://localhost:8080/api/computercraft/register",
    textutils.serializeJSON(registrationData),
    {["Content-Type"] = "application/json"}
)
```

### 2. Send Messages

```lua
-- Send a chat message
local message = {
    id = "cc_" .. os.epoch("utc"),
    timestamp = os.epoch("utc"),
    type = "chat",
    source = "MiningTurtle_1",
    content = "Found diamond ore!",
    priority = "high",
    category = "mining"
}

http.post(
    "http://localhost:8080/api/computercraft/message",
    textutils.serializeJSON(message),
    {["Content-Type"] = "application/json"}
)
```

### 3. Send Status Updates

```lua
-- Send periodic status updates
local statusMessage = {
    id = "status_" .. os.epoch("utc"),
    timestamp = os.epoch("utc"),
    type = "status_update",
    source = "MiningTurtle_1",
    computerName = "MiningTurtle_1",
    status = {
        isActive = true,
        currentTask = "Mining diamonds",
        fuel = turtle.getFuelLevel(),
        position = {x = 105, y = 12, z = 205},
        inventory = {
            {slot = 1, item = "minecraft:diamond", count = 3}
        }
    }
}
```

## 📊 API Endpoints

### Health Check
```
GET /health
```
Returns server status and connection statistics.

### Computer Registration
```
POST /api/computercraft/register
Content-Type: application/json

{
  "computerName": "string",
  "computerType": "computer|turtle|pocket",
  "functions": [APIFunction[]],
  "status": {object}
}
```

### Send Message
```
POST /api/computercraft/message
Content-Type: application/json

{
  "id": "string",
  "timestamp": number,
  "type": "chat|status_update|command_response",
  "source": "string",
  ...messageData
}
```

### Send Command (Testing)
```
POST /api/computercraft/command
Content-Type: application/json

{
  "targetComputer": "string",
  "functionName": "string",
  "parameters": {object}
}
```

### List Computers
```
GET /api/computers
```
Returns list of connected computers and their capabilities.

## 🎮 ComputerCraft Client Script

Use the provided `computercraft_client.lua` script to connect your ComputerCraft computers:

1. Copy `computercraft_client.lua` to your ComputerCraft computer
2. Edit the `SERVER_URL` if needed
3. Run: `lua computercraft_client.lua`

The script provides:
- Automatic registration with the dashboard
- Periodic status updates
- Basic function execution (sayHello, getInfo, etc.)
- Error handling and graceful shutdown

## 📝 Message Types

### Chat Message
```typescript
{
  type: 'chat',
  content: string,
  priority: 'low' | 'medium' | 'high' | 'critical',
  category?: string
}
```

### Command Message
```typescript
{
  type: 'command',
  targetComputer: string,
  functionName: string,
  parameters: Record<string, any>
}
```

### API Registration
```typescript
{
  type: 'api_registration',
  computerName: string,
  computerType: 'computer' | 'turtle' | 'pocket',
  functions: APIFunction[],
  status: object
}
```

### Status Update
```typescript
{
  type: 'status_update',
  computerName: string,
  status: {
    isActive: boolean,
    currentTask?: string,
    fuel?: number,
    position?: {x: number, y: number, z: number},
    inventory?: Array<{slot: number, item: string, count: number}>
  }
}
```

## 🛠️ Development

### Project Structure
```
src/
├── index.ts              # Main server entry point
├── types/
│   └── messages.ts       # Shared TypeScript interfaces
├── services/
│   ├── ClientManager.ts  # Connection management
│   └── MessageRouter.ts  # Message routing logic
└── utils/
    └── messageUtils.ts   # Utility functions
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run type-check` - Type check without compilation

### Environment Variables
- `PORT` - Server port (default: 8080)
- `HOST` - Server host (default: localhost)

## 🔧 Configuration

### CORS Setup
The server allows connections from common development ports:
- http://localhost:5173 (Vite)
- http://localhost:3000 (Create React App)

### ComputerCraft HTTP API
Ensure ComputerCraft has HTTP API enabled in `computercraft.cfg`:
```
B:http_enable=true
```

## 🚦 Testing

1. Start the server: `npm run dev`
2. Connect your dashboard to `ws://localhost:8080/ws`
3. Run the ComputerCraft client script
4. Watch real-time communication in both the dashboard and server logs

## 🔐 Production Considerations

For production deployment:

1. **Security**: Add authentication, rate limiting, input validation
2. **Persistence**: Add database for message history and configuration
3. **Scaling**: Consider Redis for session management across multiple instances
4. **Monitoring**: Add proper logging, metrics, and health checks
5. **SSL/TLS**: Use HTTPS/WSS for secure connections

## 🐛 Troubleshooting

### Common Issues

**ComputerCraft can't connect:**
- Check if HTTP API is enabled
- Verify server URL and port
- Check firewall settings

**WebSocket connection fails:**
- Ensure correct WebSocket URL (`ws://` not `http://`)
- Check CORS configuration
- Verify server is running

**Messages not appearing:**
- Check message format matches TypeScript interfaces
- Verify message type and required fields
- Check server logs for validation errors

### Debug Mode
Enable verbose logging by setting:
```bash
NODE_ENV=development npm run dev
```

## 📚 Learning Resources

This server demonstrates several important concepts:

- **WebSocket Programming**: Real-time bidirectional communication
- **HTTP API Design**: RESTful endpoints for integration
- **TypeScript**: Type-safe message handling
- **Event-Driven Architecture**: Message routing and client management
- **Error Handling**: Graceful degradation and recovery
- **Production Patterns**: Logging, health checks, graceful shutdown

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.
