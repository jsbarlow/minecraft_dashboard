# ComputerCraft Dashboard - Development Guide

## 🎯 Project Overview

This dashboard connects to ComputerCraft computers and turtles via WebSocket, providing real-time communication and control capabilities. It demonstrates modern React development patterns, TypeScript usage, and real-time web technologies.

## 📁 Project Structure

```
src/
├── App.tsx              # Main dashboard component
├── App.css              # Dashboard styling
├── hooks/
│   └── useWebSocket.ts  # Custom hook for WebSocket management
├── types/
│   └── messages.ts      # TypeScript interfaces for message communication
└── components/          # Future custom components
```

## 🔧 Key Technologies & Learning Topics

### React Hooks (Learning Focus: State Management)
- **useState**: Managing component state
- **useEffect**: Side effects and lifecycle management
- **useCallback**: Function memoization for performance
- **Custom Hooks**: Encapsulating complex logic

### TypeScript (Learning Focus: Type Safety)
```typescript
// Interface definition
interface ChatMessage extends BaseMessage {
  type: 'chat';
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Union types for flexible message handling
type Message = ChatMessage | CommandMessage | StatusUpdateMessage;

// Generic types for reusable patterns
type CreateMessage<T extends Message> = Omit<T, 'id' | 'timestamp'>;
```

### WebSocket Communication (Learning Focus: Real-time Data)
```typescript
// Connection management with error handling
const connect = useCallback((url: string) => {
  const ws = new WebSocket(url);
  
  ws.onopen = () => setConnectionState('connected');
  ws.onmessage = (event) => {
    const message: Message = JSON.parse(event.data);
    setMessages(prev => [...prev, message]);
  };
  ws.onclose = () => attemptReconnect();
}, []);
```

### CSS Grid Layout (Learning Focus: Modern Layouts)
```css
.dashboard {
  display: grid;
  grid-template-rows: auto 1fr;  /* Header + content */
  height: 100vh;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 300px 1fr;  /* Sidebar + main */
}
```

## 🎮 ComputerCraft Integration

### Message Types Supported

1. **Chat Messages** - Priority-based messaging system
   ```json
   {
     "type": "chat",
     "content": "Mining operation completed",
     "priority": "medium",
     "category": "mining"
   }
   ```

2. **API Registration** - Dynamic UI generation
   ```json
   {
     "type": "api_registration",
     "computerName": "MiningTurtle_1",
     "functions": [
       {
         "name": "startMining",
         "description": "Start automated mining",
         "parameters": [...]
       }
     ]
   }
   ```

3. **Commands** - Send instructions to computers
   ```json
   {
     "type": "command",
     "targetComputer": "MiningTurtle_1",
     "functionName": "startMining",
     "parameters": {"depth": 10}
   }
   ```

### Setting Up ComputerCraft Connection

Since ComputerCraft doesn't natively support WebSockets, you'll need a bridge:

1. **Option A: HTTP Bridge Server**
   - Create a simple Node.js server that converts HTTP requests to WebSocket messages
   - ComputerCraft uses HTTP API to send messages to the bridge
   - Bridge forwards messages to the dashboard

2. **Option B: HTTP Long Polling**
   - Dashboard polls an HTTP endpoint for new messages
   - ComputerCraft posts messages to the same endpoint
   - Less real-time but simpler setup

3. **Option C: File-based Communication**
   - ComputerCraft writes messages to shared files
   - Dashboard watches files for changes
   - Good for local testing

## 🛠 Development Tasks

### Completed ✅
- Dashboard layout and styling
- WebSocket communication system
- TypeScript message interfaces
- Priority-based chat display
- Connection status management
- Message filtering and display

### Next Steps 🚀
- **Dynamic UI Generation**: Create components based on API registration
- **Command Builder**: UI for creating and sending commands
- **Data Visualization**: Charts for computer status and metrics
- **Configuration Management**: Save/load dashboard layouts
- **Multi-computer Management**: Handle multiple connected computers

## 🎓 Learning Exercises

### Beginner
1. **Add new message priorities**: Extend the priority system
2. **Custom themes**: Create light/dark theme toggle
3. **Message filtering**: Add category-based message filtering

### Intermediate
1. **Persistence**: Save messages to localStorage
2. **Sound notifications**: Add audio alerts for critical messages
3. **Export functionality**: Export message logs as JSON/CSV

### Advanced
1. **Dynamic components**: Build UI components from API definitions
2. **Real-time charts**: Add charts for computer metrics
3. **Multi-room support**: Connect to multiple Minecraft servers

## 📚 Code Patterns to Study

### Custom Hook Pattern
```typescript
// Encapsulate complex logic in reusable hooks
function useWebSocket(config: UseWebSocketConfig) {
  const [state, setState] = useState(initialState);
  
  // Complex logic here...
  
  return { state, actions };
}
```

### Type-safe Message Handling
```typescript
// Use type guards for safe message processing
const chatMessages = messages.filter((msg): msg is ChatMessage => 
  msg.type === 'chat'
);
```

### Event Handler Optimization
```typescript
// Prevent unnecessary re-renders with useCallback
const handleSend = useCallback(() => {
  if (inputMessage.trim() && isConnected) {
    sendMessage(inputMessage);
    setInputMessage('');
  }
}, [inputMessage, isConnected, sendMessage]);
```

## 🐛 Common Issues & Solutions

### WebSocket Connection Failed
- Check if WebSocket server is running
- Verify the URL format (ws:// not http://)
- Check browser console for error details

### Messages Not Displaying
- Verify message format matches TypeScript interfaces
- Check browser dev tools Network tab for WebSocket messages
- Ensure message type filtering is working correctly

### Styling Issues
- Use browser dev tools to inspect CSS
- Check for CSS specificity conflicts
- Verify responsive design at different screen sizes

## 🚀 Next Development Steps

1. **Create a simple WebSocket server** for testing
2. **Build the dynamic UI system** based on API registration
3. **Add computer management features** (list, filter, group)
4. **Implement data persistence** for messages and configuration
5. **Add visualization components** for computer metrics

Happy coding! This project is an excellent way to learn modern web development while building something genuinely useful for Minecraft automation.
