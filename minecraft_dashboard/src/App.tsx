import { useState, useCallback } from 'react'
import './App.css'
import { useWebSocket } from './hooks/useWebSocket'
import { Message, ChatMessage } from './types/messages'

// Define the main App component - this is the root of our ComputerCraft dashboard
function App() {
  // State for WebSocket server configuration
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080/ws')
  const [inputMessage, setInputMessage] = useState('')

  // Use our custom WebSocket hook for ComputerCraft communication
  // This handles all the real-time messaging with your Minecraft computers
  const {
    isConnected,
    connectionState,
    messages,
    sendMessage,
    sendChatMessage,
    connect,
    disconnect,
    clearMessages
  } = useWebSocket({
    url: serverUrl,
    autoConnect: false, // Manual connection for better user control
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    onConnect: () => {
      console.log('Successfully connected to ComputerCraft server!')
      // Send a welcome message when connected
      sendChatMessage('Dashboard connected and ready!', 'medium')
    },
    onDisconnect: () => {
      console.log('Disconnected from ComputerCraft server')
    },
    onError: (error) => {
      console.error('WebSocket connection error:', error)
    }
  })

  // Filter messages to only show chat messages in the main display
  // Other message types (commands, status updates) can be handled separately
  const chatMessages = messages.filter((msg): msg is ChatMessage => msg.type === 'chat')

  // Handle manual connection with user-provided URL
  const handleConnect = useCallback(() => {
    if (!isConnected) {
      connect(serverUrl)
    } else {
      disconnect()
    }
  }, [isConnected, serverUrl, connect, disconnect])

  // Handle sending messages from the chat input
  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && isConnected) {
      // Send as a chat message with medium priority
      sendChatMessage(inputMessage.trim(), 'medium')
      setInputMessage('')
    }
  }, [inputMessage, isConnected, sendChatMessage])

  // Handle Enter key in chat input
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }, [handleSendMessage])

  // Format message timestamp for display
  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }, [])

  return (
    <div className="dashboard">
      {/* Header section with title and connection status */}
      <header className="dashboard-header">
        <h1>ComputerCraft Dashboard</h1>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-indicator"></span>
          {isConnected ? 'Connected' : connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      </header>

      {/* Main content area - split between chat and controls */}
      <div className="dashboard-content">
        {/* Left sidebar for controls and future dynamic UI */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <h3>Connection</h3>
            
            {/* Server URL input */}
            <div className="input-group">
              <label htmlFor="server-url">Server URL:</label>
              <input 
                id="server-url"
                type="text" 
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={isConnected}
                placeholder="ws://localhost:8080/ws"
                className="url-input"
              />
            </div>
            
            {/* Connect/Disconnect button */}
            <button 
              className="connect-btn" 
              onClick={handleConnect}
              disabled={connectionState === 'connecting'}
            >
              {connectionState === 'connecting' ? 'Connecting...' : 
               isConnected ? 'Disconnect' : 'Connect to Server'}
            </button>
            
            {/* Connection status details */}
            <div className="connection-details">
              <p>Status: <strong>{connectionState}</strong></p>
              <p>Messages: <strong>{messages.length}</strong></p>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Controls</h3>
            <button 
              onClick={clearMessages} 
              className="clear-btn"
              disabled={messages.length === 0}
            >
              Clear Messages
            </button>
            <p className="placeholder-text">
              Dynamic controls will appear here based on your ComputerCraft API
            </p>
          </div>
        </aside>

        {/* Main chat area for priority messages */}
        <main className="dashboard-main">
          <div className="chat-container">
            <div className="chat-header">
              <h2>Priority Messages</h2>
              <span className="message-count">{chatMessages.length} chat messages</span>
            </div>
            
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <div className="no-messages">
                  <p>
                    {!isConnected 
                      ? 'Connect to your ComputerCraft server to see messages'
                      : 'No messages yet. Waiting for ComputerCraft computers...'
                    }
                  </p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className={`chat-message priority-${message.priority}`}>
                    <div className="message-header">
                      <span className="message-timestamp">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <span className="message-source">
                        {message.source}
                      </span>
                      <span className={`priority-badge priority-${message.priority}`}>
                        {message.priority}
                      </span>
                    </div>
                    <div className="message-text">{message.content}</div>
                    {message.category && (
                      <div className="message-category">
                        Category: {message.category}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Input area for sending messages back to ComputerCraft */}
            <div className="chat-input">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Send message to ComputerCraft..." 
                disabled={!isConnected}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!isConnected || !inputMessage.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
