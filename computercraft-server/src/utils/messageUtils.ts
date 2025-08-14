/**
 * Utility functions for message handling and validation
 */

import { Message, CreateMessage, BaseMessage } from '../types/messages';

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a complete message with metadata
 */
export function createMessage<T extends Message>(partialMessage: CreateMessage<T>): T {
  return {
    ...partialMessage,
    id: partialMessage.id || generateMessageId(),
    timestamp: partialMessage.timestamp || Date.now(),
  } as T;
}

/**
 * Validate that a message has required fields
 */
export function isValidMessage(obj: any): obj is Message {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.timestamp === 'number' &&
    typeof obj.type === 'string' &&
    typeof obj.source === 'string'
  );
}

/**
 * Validate specific message types
 */
export function validateMessageType(message: Message): boolean {
  switch (message.type) {
    case 'chat':
      return 'content' in message && 'priority' in message;
    case 'command':
      return 'targetComputer' in message && 'functionName' in message && 'parameters' in message;
    case 'api_registration':
      return 'computerName' in message && 'computerType' in message && 'functions' in message;
    case 'status_update':
      return 'computerName' in message && 'status' in message;
    case 'command_response':
      return 'originalCommandId' in message && 'success' in message;
    default:
      return false;
  }
}

/**
 * Sanitize message content to prevent XSS
 */
export function sanitizeMessage(message: Message): Message {
  // For now, just ensure strings are properly encoded
  // In production, you might want to use a library like DOMPurify
  if (message.type === 'chat') {
    return {
      ...message,
      content: String(message.content).replace(/[<>]/g, ''),
    };
  }
  return message;
}

/**
 * Log message for debugging
 */
export function logMessage(direction: 'incoming' | 'outgoing', message: Message, clientId?: string): void {
  const timestamp = new Date().toISOString();
  const client = clientId ? ` [${clientId}]` : '';
  console.log(`[${timestamp}] ${direction.toUpperCase()}${client}: ${message.type} from ${message.source}`);
}
