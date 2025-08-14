/**
 * Message routing service
 * Handles routing messages between dashboards and ComputerCraft clients
 */

import { Message, ChatMessage, CommandMessage, APIRegistrationMessage, StatusUpdateMessage, CommandResponseMessage } from '../types/messages';
import { ClientManager } from './ClientManager';
import { createMessage, logMessage, validateMessageType, sanitizeMessage } from '../utils/messageUtils';

export class MessageRouter {
  constructor(private clientManager: ClientManager) {}

  /**
   * Route an incoming message to appropriate destinations
   */
  routeMessage(message: Message, senderClientId: string): void {
    // Log the incoming message
    logMessage('incoming', message, senderClientId);

    // Validate message structure
    if (!validateMessageType(message)) {
      console.warn(`❌ Invalid message type or structure:`, message);
      return;
    }

    // Sanitize message content
    const sanitizedMessage = sanitizeMessage(message);

    // Route based on message type
    switch (sanitizedMessage.type) {
      case 'chat':
        this.handleChatMessage(sanitizedMessage as ChatMessage, senderClientId);
        break;
      
      case 'command':
        this.handleCommandMessage(sanitizedMessage as CommandMessage, senderClientId);
        break;
      
      case 'api_registration':
        this.handleAPIRegistration(sanitizedMessage as APIRegistrationMessage, senderClientId);
        break;
      
      case 'status_update':
        this.handleStatusUpdate(sanitizedMessage as StatusUpdateMessage, senderClientId);
        break;
      
      case 'command_response':
        this.handleCommandResponse(sanitizedMessage as CommandResponseMessage, senderClientId);
        break;
      
      default:
        console.warn(`❓ Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle chat messages - broadcast to all dashboards
   */
  private handleChatMessage(message: ChatMessage, senderClientId: string): void {
    console.log(`💬 Chat message from ${message.source}: ${message.content} [${message.priority}]`);
    
    // Broadcast to all dashboard clients
    const sentCount = this.clientManager.broadcastToType('dashboard', message);
    console.log(`📡 Broadcasted chat message to ${sentCount} dashboards`);
  }

  /**
   * Handle command messages - route to specific ComputerCraft client
   */
  private handleCommandMessage(message: CommandMessage, senderClientId: string): void {
    console.log(`⚡ Command from ${message.source} to ${message.targetComputer}: ${message.functionName}`);
    
    // Find the target computer
    const targetClient = this.clientManager.getComputerByName(message.targetComputer);
    
    if (!targetClient) {
      console.warn(`❌ Target computer not found: ${message.targetComputer}`);
      
      // Send error response back to sender
      const errorResponse = createMessage<CommandResponseMessage>({
        type: 'command_response',
        source: 'server',
        originalCommandId: message.id,
        success: false,
        error: `Computer '${message.targetComputer}' is not connected`
      });
      
      this.clientManager.sendToClient(senderClientId, errorResponse);
      return;
    }

    // Forward command to target computer
    const success = this.clientManager.sendToClient(targetClient.id, message);
    
    if (success) {
      console.log(`✅ Command forwarded to ${message.targetComputer}`);
    } else {
      console.error(`❌ Failed to forward command to ${message.targetComputer}`);
      
      // Send error response
      const errorResponse = createMessage<CommandResponseMessage>({
        type: 'command_response',
        source: 'server',
        originalCommandId: message.id,
        success: false,
        error: `Failed to communicate with computer '${message.targetComputer}'`
      });
      
      this.clientManager.sendToClient(senderClientId, errorResponse);
    }
  }

  /**
   * Handle API registration - update client info and broadcast to dashboards
   */
  private handleAPIRegistration(message: APIRegistrationMessage, senderClientId: string): void {
    console.log(`🤖 API registration from ${message.computerName} (${message.computerType})`);
    console.log(`📋 Available functions: ${message.functions.map(f => f.name).join(', ')}`);
    
    // Update client metadata
    this.clientManager.updateClient(senderClientId, {
      computerName: message.computerName,
      computerType: message.computerType,
      registeredFunctions: message.functions
    });

    // Broadcast registration to all dashboards
    const sentCount = this.clientManager.broadcastToType('dashboard', message);
    console.log(`📡 Broadcasted registration to ${sentCount} dashboards`);

    // Send welcome message back to the computer
    const welcomeMessage = createMessage<ChatMessage>({
      type: 'chat',
      source: 'server',
      content: `Welcome ${message.computerName}! Registration successful. Functions: ${message.functions.length}`,
      priority: 'medium',
      category: 'system'
    });
    
    this.clientManager.sendToClient(senderClientId, welcomeMessage);
  }

  /**
   * Handle status updates - broadcast to dashboards
   */
  private handleStatusUpdate(message: StatusUpdateMessage, senderClientId: string): void {
    console.log(`📊 Status update from ${message.computerName}: ${message.status.currentTask || 'idle'}`);
    
    // Broadcast to all dashboards
    const sentCount = this.clientManager.broadcastToType('dashboard', message);
    
    // Only log if we actually sent to someone
    if (sentCount > 0) {
      console.log(`📡 Broadcasted status update to ${sentCount} dashboards`);
    }
  }

  /**
   * Handle command responses - route back to original sender
   */
  private handleCommandResponse(message: CommandResponseMessage, senderClientId: string): void {
    const status = message.success ? '✅' : '❌';
    console.log(`${status} Command response: ${message.success ? 'success' : 'failed'}`);
    
    if (message.error) {
      console.log(`   Error: ${message.error}`);
    }

    // Broadcast response to all dashboards (they can filter by originalCommandId)
    const sentCount = this.clientManager.broadcastToType('dashboard', message);
    console.log(`📡 Broadcasted command response to ${sentCount} dashboards`);
  }

  /**
   * Send a server-generated message to all dashboards
   */
  sendServerMessage(content: string, priority: ChatMessage['priority'] = 'medium'): void {
    const message = createMessage<ChatMessage>({
      type: 'chat',
      source: 'server',
      content,
      priority,
      category: 'system'
    });

    const sentCount = this.clientManager.broadcastToType('dashboard', message);
    console.log(`📢 Server message sent to ${sentCount} dashboards: ${content}`);
  }

  /**
   * Get a summary of available computers for dashboards
   */
  getComputerSummary(): any {
    const computers = this.clientManager.getComputerList();
    const summary = {
      totalComputers: computers.length,
      onlineComputers: computers.filter(c => c.isOnline).length,
      computers: computers.map(computer => ({
        name: computer.computerName,
        type: computer.computerType,
        functionCount: computer.functions.length,
        isOnline: computer.isOnline,
        availableFunctions: computer.functions.map(f => ({
          name: f.name,
          description: f.description,
          category: f.category
        }))
      }))
    };

    return summary;
  }
}
