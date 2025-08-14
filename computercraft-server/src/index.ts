/**
 * ComputerCraft Dashboard WebSocket Server
 * 
 * This server provides:
 * - WebSocket connections for real-time dashboard communication
 * - HTTP endpoints for ComputerCraft integration
 * - Message routing between dashboards and ComputerCraft computers
 * - Client connection management
 * 
 * Architecture:
 * - Express.js for HTTP server and API endpoints
 * - ws library for WebSocket server
 * - TypeScript for type safety
 * - Modular services for scalability
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

import { ClientManager } from './services/ClientManager';
import { MessageRouter } from './services/MessageRouter';
import { Message } from './types/messages';
import { isValidMessage, createMessage, logMessage } from './utils/messageUtils';

// Configuration from environment variables
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Docker
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// CORS origins - configurable for different environments
const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      // Add your production dashboard URL here
      // 'https://your-dashboard-domain.com'
    ];

console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🔗 CORS Origins: ${CORS_ORIGINS.join(', ')}`);
console.log(`📡 Server will bind to: ${HOST}:${PORT}`);

// Create Express app
const app = express();
const server = createServer(app);

// Initialize services
const clientManager = new ClientManager();
const messageRouter = new MessageRouter(clientManager);

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware (only in development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} from ${req.ip}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = clientManager.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stats
  });
});

// Get connected computers endpoint
app.get('/api/computers', (req, res) => {
  const computerSummary = messageRouter.getComputerSummary();
  res.json(computerSummary);
});

// HTTP endpoint for ComputerCraft (since it doesn't have native WebSocket support)
app.post('/api/computercraft/message', (req, res) => {
  try {
    const message = req.body;
    
    // Validate message
    if (!isValidMessage(message)) {
      return res.status(400).json({ 
        error: 'Invalid message format',
        required: ['id', 'timestamp', 'type', 'source']
      });
    }

    console.log(`📨 HTTP message from ComputerCraft: ${message.type}`);
    
    // Create a virtual client ID for HTTP requests
    const virtualClientId = `http_${message.source}_${Date.now()}`;
    
    // Route the message
    messageRouter.routeMessage(message, virtualClientId);
    
    res.json({ 
      success: true, 
      timestamp: Date.now(),
      message: 'Message received and processed'
    });
    
  } catch (error) {
    console.error('❌ Error processing HTTP message:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ComputerCraft registration endpoint
app.post('/api/computercraft/register', (req, res) => {
  try {
    const { computerName, computerType, functions, status } = req.body;
    
    if (!computerName || !computerType || !functions) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['computerName', 'computerType', 'functions']
      });
    }

    // Create registration message
    const registrationMessage = createMessage({
      type: 'api_registration',
      source: computerName,
      computerName,
      computerType,
      functions,
      status: status || {}
    });

    // Process registration
    const virtualClientId = `http_${computerName}_register`;
    messageRouter.routeMessage(registrationMessage, virtualClientId);
    
    res.json({
      success: true,
      message: `Computer ${computerName} registered successfully`,
      registeredFunctions: functions.length
    });
    
  } catch (error) {
    console.error('❌ Error registering computer:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send command to ComputerCraft endpoint (for testing)
app.post('/api/computercraft/command', (req, res) => {
  try {
    const { targetComputer, functionName, parameters } = req.body;
    
    if (!targetComputer || !functionName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['targetComputer', 'functionName']
      });
    }

    const commandMessage = createMessage({
      type: 'command',
      source: 'http_api',
      targetComputer,
      functionName,
      parameters: parameters || {}
    });

    const virtualClientId = `http_command_${Date.now()}`;
    messageRouter.routeMessage(commandMessage, virtualClientId);
    
    res.json({
      success: true,
      message: `Command sent to ${targetComputer}`,
      command: functionName
    });
    
  } catch (error) {
    console.error('❌ Error sending command:', error);
    res.status(500).json({ 
      error: 'Command failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'  // WebSocket endpoint at ws://localhost:8080/ws
});

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`🔌 New WebSocket connection from ${clientIP}`);
  
  // Default to dashboard type - can be changed based on first message
  const clientId = clientManager.addClient(ws, 'dashboard', {
    userAgent: req.headers['user-agent']
  });

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message: Message = JSON.parse(data.toString());
      
      if (!isValidMessage(message)) {
        console.warn(`❌ Invalid message from client ${clientId}:`, message);
        return;
      }

      // Check if this is a ComputerCraft client based on message content
      const client = clientManager.getClient(clientId);
      if (client && message.type === 'api_registration') {
        // This is a ComputerCraft client registering
        clientManager.updateClient(clientId, { type: 'computercraft' });
        console.log(`🔄 Updated client ${clientId} to ComputerCraft type`);
      }

      // Route the message
      messageRouter.routeMessage(message, clientId);
      
    } catch (error) {
      console.error(`❌ Error parsing message from client ${clientId}:`, error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clientManager.removeClient(clientId);
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
    clientManager.removeClient(clientId);
  });

  // Handle ping/pong for connection health
  ws.on('pong', () => {
    const client = clientManager.getClient(clientId);
    if (client) {
      client.lastPing = Date.now();
    }
  });

  // Send welcome message
  const welcomeMessage = createMessage({
    type: 'chat',
    source: 'server',
    content: `Connected to ComputerCraft server! Client ID: ${clientId}`,
    priority: 'low' as const,
    category: 'system'
  });
  
  ws.send(JSON.stringify(welcomeMessage));
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log('\n🚀 ComputerCraft Dashboard Server Started!');
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📡 WebSocket: ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/ws`);
  console.log(`🌐 HTTP API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api`);
  console.log(`💚 Health: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
  
  if (NODE_ENV === 'development') {
    console.log('\n📋 Available endpoints:');
    console.log('  • GET  /health - Server health check');
    console.log('  • GET  /api/computers - List connected computers');
    console.log('  • POST /api/computercraft/register - Register a computer');
    console.log('  • POST /api/computercraft/message - Send message from computer');
    console.log('  • POST /api/computercraft/command - Send command to computer');
    console.log('\n🎮 Ready for ComputerCraft connections!');
    console.log(`💡 Connect your dashboard to ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/ws`);
  }
  
  console.log(`\n🐳 Running in Docker: ${process.env.DOCKER ? 'Yes' : 'No'}`);
  console.log(`📊 Process ID: ${process.pid}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  messageRouter.sendServerMessage('Server shutting down', 'high');
  
  setTimeout(() => {
    wss.close(() => {
      console.log('✅ WebSocket server closed');
    });
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      clientManager.destroy();
      process.exit(0);
    });
  }, 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
