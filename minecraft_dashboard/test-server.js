/**
 * Simple WebSocket Test Server for ComputerCraft Dashboard
 * 
 * This server simulates ComputerCraft computers sending messages to test the dashboard.
 * Run this alongside your React app to see real-time communication in action.
 * 
 * Usage: node test-server.js
 */

const WebSocket = require('ws');

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ 
    port: 8080,
    cors: {
        origin: "http://localhost:5173", // Allow connections from Vite dev server
        credentials: true
    }
});

console.log('🚀 ComputerCraft Test Server running on ws://localhost:8080');
console.log('📱 Connect your dashboard and watch the magic happen!\n');

// Helper function to create messages
function createMessage(type, source, data) {
    return {
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: type,
        source: source,
        ...data
    };
}

// Simulate different types of ComputerCraft computers
const simulatedComputers = [
    {
        name: 'MiningTurtle_1',
        type: 'turtle',
        position: { x: 100, y: 12, z: 200 },
        fuel: 1000
    },
    {
        name: 'QuarryController',
        type: 'computer', 
        position: { x: 150, y: 64, z: 180 },
        fuel: null
    },
    {
        name: 'SortingSystem',
        type: 'computer',
        position: { x: 75, y: 64, z: 120 },
        fuel: null
    }
];

// Handle client connections
wss.on('connection', function connection(ws, req) {
    console.log('📡 Dashboard connected from:', req.socket.remoteAddress);
    
    // Send welcome message
    const welcomeMsg = createMessage('chat', 'TestServer', {
        content: 'Welcome to the ComputerCraft Test Server! Simulated computers will start sending messages.',
        priority: 'medium',
        category: 'system'
    });
    ws.send(JSON.stringify(welcomeMsg));

    // Register all simulated computers
    setTimeout(() => {
        simulatedComputers.forEach((computer, index) => {
            setTimeout(() => {
                const apiRegMsg = createMessage('api_registration', computer.name, {
                    computerName: computer.name,
                    computerType: computer.type,
                    functions: [
                        {
                            name: 'getStatus',
                            description: 'Get current status',
                            parameters: [],
                            category: 'system'
                        },
                        {
                            name: 'sendMessage',
                            description: 'Send a custom message',
                            parameters: [
                                {
                                    name: 'message',
                                    type: 'string',
                                    required: true,
                                    description: 'Message to send'
                                },
                                {
                                    name: 'priority',
                                    type: 'select',
                                    required: false,
                                    description: 'Message priority',
                                    options: ['low', 'medium', 'high', 'critical'],
                                    defaultValue: 'medium'
                                }
                            ],
                            category: 'communication'
                        }
                    ],
                    status: {
                        fuel: computer.fuel,
                        position: computer.position,
                        inventorySlots: computer.type === 'turtle' ? 16 : null
                    }
                });
                
                ws.send(JSON.stringify(apiRegMsg));
                console.log(`🤖 Registered ${computer.name}`);
            }, index * 1000);
        });
    }, 2000);

    // Start sending simulated messages
    setTimeout(() => {
        startSimulation(ws);
    }, 5000);

    // Handle messages from dashboard
    ws.on('message', function message(data) {
        try {
            const msg = JSON.parse(data);
            console.log('📨 Received from dashboard:', msg.type, msg);
            
            // Simulate command responses
            if (msg.type === 'command') {
                setTimeout(() => {
                    const response = createMessage('command_response', 'TestServer', {
                        originalCommandId: msg.id,
                        success: Math.random() > 0.2, // 80% success rate
                        result: `Command '${msg.functionName}' executed on ${msg.targetComputer}`,
                        error: Math.random() > 0.8 ? 'Simulated random error' : undefined
                    });
                    ws.send(JSON.stringify(response));
                }, 1000 + Math.random() * 2000); // 1-3 second delay
            }
        } catch (error) {
            console.error('❌ Failed to parse message:', error);
        }
    });

    ws.on('close', function close() {
        console.log('📱 Dashboard disconnected');
    });
});

// Simulation functions
function startSimulation(ws) {
    console.log('🎭 Starting message simulation...\n');
    
    // Send periodic status updates
    setInterval(() => {
        const computer = simulatedComputers[Math.floor(Math.random() * simulatedComputers.length)];
        const statusMsg = createMessage('status_update', computer.name, {
            computerName: computer.name,
            status: {
                isActive: Math.random() > 0.1,
                currentTask: getRandomTask(),
                fuel: computer.fuel ? Math.max(0, computer.fuel - Math.floor(Math.random() * 10)) : undefined,
                position: computer.position,
                inventory: computer.type === 'turtle' ? generateRandomInventory() : undefined,
                customData: {
                    uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
                    itemsProcessed: Math.floor(Math.random() * 10000)
                }
            }
        });
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(statusMsg));
        }
    }, 15000); // Every 15 seconds

    // Send random chat messages
    setInterval(() => {
        const computer = simulatedComputers[Math.floor(Math.random() * simulatedComputers.length)];
        const messages = getRandomMessages();
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        
        const chatMsg = createMessage('chat', computer.name, {
            content: randomMsg.content,
            priority: randomMsg.priority,
            category: randomMsg.category
        });
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(chatMsg));
            console.log(`💬 ${computer.name}: ${randomMsg.content} [${randomMsg.priority}]`);
        }
    }, 8000); // Every 8 seconds
}

function getRandomTask() {
    const tasks = [
        'Mining diamonds',
        'Sorting inventory',
        'Building structure',
        'Collecting resources',
        'Processing items',
        'Idle',
        'Charging fuel',
        'Moving to location'
    ];
    return tasks[Math.floor(Math.random() * tasks.length)];
}

function generateRandomInventory() {
    const items = [
        { item: 'minecraft:diamond', maxCount: 10 },
        { item: 'minecraft:cobblestone', maxCount: 64 },
        { item: 'minecraft:coal', maxCount: 64 },
        { item: 'minecraft:iron_ore', maxCount: 32 },
        { item: 'minecraft:gold_ore', maxCount: 16 },
        { item: 'minecraft:redstone', maxCount: 64 }
    ];
    
    const inventory = [];
    const numItems = Math.floor(Math.random() * 8) + 1; // 1-8 items
    
    for (let i = 0; i < numItems; i++) {
        const item = items[Math.floor(Math.random() * items.length)];
        inventory.push({
            slot: i + 1,
            item: item.item,
            count: Math.floor(Math.random() * item.maxCount) + 1
        });
    }
    
    return inventory;
}

function getRandomMessages() {
    return [
        { content: 'Mining operation started successfully', priority: 'medium', category: 'mining' },
        { content: 'Found diamond ore at depth 12!', priority: 'high', category: 'mining' },
        { content: 'Inventory is full, returning to base', priority: 'medium', category: 'logistics' },
        { content: 'WARNING: Low fuel detected - 15% remaining', priority: 'high', category: 'system' },
        { content: 'CRITICAL: Turtle stuck, manual intervention needed!', priority: 'critical', category: 'system' },
        { content: 'Task completed: Sorted 500 items', priority: 'low', category: 'logistics' },
        { content: 'Detected mob nearby, pausing operations', priority: 'medium', category: 'security' },
        { content: 'Successfully crafted 64 stone bricks', priority: 'low', category: 'crafting' },
        { content: 'ERROR: Cannot reach destination', priority: 'high', category: 'navigation' },
        { content: 'System startup complete, all modules online', priority: 'medium', category: 'system' },
        { content: 'Performance optimal - 99.2% uptime achieved', priority: 'low', category: 'system' },
        { content: 'ALERT: Unauthorized access detected!', priority: 'critical', category: 'security' }
    ];
}

console.log('💡 Tips:');
console.log('  • Your React dashboard should connect to ws://localhost:8080');
console.log('  • Try sending messages from the dashboard chat');
console.log('  • Watch the console for real-time message flow');
console.log('  • Press Ctrl+C to stop the server\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test server...');
    wss.close(() => {
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });
});
