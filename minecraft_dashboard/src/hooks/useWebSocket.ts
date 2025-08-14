/**
 * WebSocket Hook for ComputerCraft Communication
 * 
 * This custom React hook manages the WebSocket connection to ComputerCraft,
 * handles message sending/receiving, and provides connection state management.
 * 
 * Usage: const { isConnected, sendMessage, messages } = useWebSocket(serverUrl);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, CreateMessage, ConnectionState, ChatMessage, CommandMessage } from '../types/messages';

interface UseWebSocketConfig {
  url?: string;                    // WebSocket server URL
  autoConnect?: boolean;           // Whether to connect automatically
  reconnectAttempts?: number;      // Number of reconnection attempts
  reconnectDelay?: number;         // Delay between reconnection attempts (ms)
  onConnect?: () => void;          // Callback when connected
  onDisconnect?: () => void;       // Callback when disconnected
  onError?: (error: Event) => void; // Callback for errors
}

interface UseWebSocketReturn {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  
  // Message handling
  messages: Message[];
  sendMessage: (message: CreateMessage<Message>) => boolean;
  clearMessages: () => void;
  
  // Connection control
  connect: (url?: string) => void;
  disconnect: () => void;
  
  // Convenience methods for common message types
  sendChatMessage: (content: string, priority?: ChatMessage['priority']) => boolean;
  sendCommand: (targetComputer: string, functionName: string, parameters: Record<string, any>) => boolean;
}

export function useWebSocket(config: UseWebSocketConfig = {}): UseWebSocketReturn {
  const {
    url,
    autoConnect = false,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    onConnect,
    onDisconnect,
    onError
  } = config;

  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Refs for managing WebSocket and reconnection
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlRef = useRef<string | undefined>(url);

  // Helper function to generate unique message IDs
  const generateMessageId = useCallback((): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Helper function to create a complete message with metadata
  const createCompleteMessage = useCallback((partialMessage: CreateMessage<Message>): Message => {
    return {
      ...partialMessage,
      id: partialMessage.id || generateMessageId(),
      timestamp: partialMessage.timestamp || Date.now(),
    } as Message;
  }, [generateMessageId]);

  // Clean up function to close WebSocket and clear timeouts
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectCountRef.current < reconnectAttempts && urlRef.current) {
      reconnectCountRef.current++;
      const delay = reconnectDelay * Math.pow(1.5, reconnectCountRef.current - 1); // Exponential backoff
      
      console.log(`Attempting reconnection ${reconnectCountRef.current}/${reconnectAttempts} in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(urlRef.current);
      }, delay);
    } else {
      console.log('Max reconnection attempts reached');
      setConnectionState('error');
    }
  }, [reconnectAttempts, reconnectDelay]);

  // Connect to WebSocket server
  const connect = useCallback((connectUrl?: string) => {
    const targetUrl = connectUrl || urlRef.current;
    
    if (!targetUrl) {
      console.error('No WebSocket URL provided');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    urlRef.current = targetUrl;
    setConnectionState('connecting');
    cleanup(); // Clean up any existing connections

    try {
      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      // Connection opened successfully
      ws.onopen = () => {
        console.log('WebSocket connected to', targetUrl);
        setConnectionState('connected');
        reconnectCountRef.current = 0; // Reset reconnection counter
        onConnect?.();
      };

      // Message received from ComputerCraft
      ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          
          // Validate message structure (basic validation)
          if (!message.type || !message.source) {
            console.warn('Received invalid message format:', message);
            return;
          }

          console.log('Received message:', message);
          setMessages(prev => [...prev, message]);
        } catch (error) {
          console.error('Failed to parse message:', error, event.data);
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionState('disconnected');
        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnection if it wasn't a manual close
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          attemptReconnect();
        }
      };

      // Connection error
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
        onError?.(error);
        
        // Attempt reconnection on error
        if (reconnectCountRef.current < reconnectAttempts) {
          attemptReconnect();
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionState('error');
    }
  }, [cleanup, onConnect, onDisconnect, onError, attemptReconnect, reconnectAttempts]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup, reconnectAttempts]);

  // Send a message to ComputerCraft
  const sendMessage = useCallback((partialMessage: CreateMessage<Message>): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      const completeMessage = createCompleteMessage(partialMessage);
      const messageString = JSON.stringify(completeMessage);
      
      wsRef.current.send(messageString);
      console.log('Sent message:', completeMessage);
      
      // Add sent message to our message history for debugging
      setMessages(prev => [...prev, completeMessage]);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, [createCompleteMessage]);

  // Convenience method for sending chat messages
  const sendChatMessage = useCallback((content: string, priority: ChatMessage['priority'] = 'medium'): boolean => {
    return sendMessage({
      type: 'chat',
      source: 'dashboard',
      content,
      priority
    });
  }, [sendMessage]);

  // Convenience method for sending commands to computers
  const sendCommand = useCallback((targetComputer: string, functionName: string, parameters: Record<string, any>): boolean => {
    return sendMessage({
      type: 'command',
      source: 'dashboard',
      targetComputer,
      functionName,
      parameters
    });
  }, [sendMessage]);

  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-connect on mount if configured
  useEffect(() => {
    if (autoConnect && url) {
      connect(url);
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [autoConnect, url, connect, cleanup]);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === 'connected',
    
    // Message handling
    messages,
    sendMessage,
    clearMessages,
    
    // Connection control
    connect,
    disconnect,
    
    // Convenience methods
    sendChatMessage,
    sendCommand
  };
}
