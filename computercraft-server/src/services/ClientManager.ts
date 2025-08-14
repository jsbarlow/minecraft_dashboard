/**
 * Client connection management service
 * Handles tracking of connected dashboards and ComputerCraft clients
 */

import { WebSocket } from 'ws';
import { ConnectedClient, APIFunction } from '../types/messages';

export class ClientManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private pingInterval?: NodeJS.Timeout;

  constructor() {
    this.startPingInterval();
  }

  /**
   * Add a new client connection
   */
  addClient(
    ws: WebSocket, 
    type: 'dashboard' | 'computercraft',
    metadata: Partial<ConnectedClient> = {}
  ): string {
    const clientId = this.generateClientId();
    
    const client: ConnectedClient = {
      id: clientId,
      ws,
      type,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      ...metadata
    };

    this.clients.set(clientId, client);
    
    console.log(`✅ ${type} client connected: ${clientId}${client.computerName ? ` (${client.computerName})` : ''}`);
    console.log(`📊 Total clients: ${this.clients.size}`);
    
    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`❌ ${client.type} client disconnected: ${clientId}${client.computerName ? ` (${client.computerName})` : ''}`);
      this.clients.delete(clientId);
      console.log(`📊 Total clients: ${this.clients.size}`);
    }
  }

  /**
   * Get a specific client
   */
  getClient(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients of a specific type
   */
  getClientsByType(type: 'dashboard' | 'computercraft'): ConnectedClient[] {
    return Array.from(this.clients.values()).filter(client => client.type === type);
  }

  /**
   * Get a ComputerCraft client by computer name
   */
  getComputerByName(computerName: string): ConnectedClient | undefined {
    return Array.from(this.clients.values()).find(
      client => client.type === 'computercraft' && client.computerName === computerName
    );
  }

  /**
   * Get all connected computers with their functions
   */
  getComputerList(): Array<{
    computerName: string;
    computerType: string;
    functions: APIFunction[];
    isOnline: boolean;
  }> {
    return this.getClientsByType('computercraft').map(client => ({
      computerName: client.computerName || 'Unknown',
      computerType: client.computerType || 'computer',
      functions: client.registeredFunctions || [],
      isOnline: this.isClientAlive(client.id)
    }));
  }

  /**
   * Update client metadata (e.g., after API registration)
   */
  updateClient(clientId: string, updates: Partial<ConnectedClient>): void {
    const client = this.clients.get(clientId);
    if (client) {
      Object.assign(client, updates);
      console.log(`🔄 Updated client ${clientId}:`, updates);
    }
  }

  /**
   * Check if a client is still alive
   */
  isClientAlive(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    
    const now = Date.now();
    const timeSinceLastPing = now - (client.lastPing || client.connectedAt);
    
    return timeSinceLastPing < this.PING_INTERVAL * 3; // 3 missed pings = dead
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: any): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Broadcast message to all clients of a specific type
   */
  broadcastToType(type: 'dashboard' | 'computercraft', message: any): number {
    const clients = this.getClientsByType(type);
    let sentCount = 0;

    for (const client of clients) {
      if (this.sendToClient(client.id, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Broadcast message to all clients
   */
  broadcastToAll(message: any): number {
    return this.broadcastToType('dashboard', message) + this.broadcastToType('computercraft', message);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalClients: number;
    dashboards: number;
    computers: number;
    aliveClients: number;
  } {
    const allClients = Array.from(this.clients.values());
    const aliveClients = allClients.filter(client => this.isClientAlive(client.id));
    
    return {
      totalClients: this.clients.size,
      dashboards: this.getClientsByType('dashboard').length,
      computers: this.getClientsByType('computercraft').length,
      aliveClients: aliveClients.length
    };
  }

  /**
   * Clean up dead connections
   */
  cleanup(): void {
    const deadClients: string[] = [];
    
    for (const [clientId, client] of this.clients) {
      if (!this.isClientAlive(clientId) || client.ws.readyState !== WebSocket.OPEN) {
        deadClients.push(clientId);
      }
    }

    for (const clientId of deadClients) {
      this.removeClient(clientId);
    }

    if (deadClients.length > 0) {
      console.log(`🧹 Cleaned up ${deadClients.length} dead connections`);
    }
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Start periodic ping to check client health
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.cleanup();
      
      // Send ping to all clients
      for (const [clientId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
            client.lastPing = Date.now();
          } catch (error) {
            console.warn(`Failed to ping client ${clientId}:`, error);
          }
        }
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Close all connections
    for (const client of this.clients.values()) {
      try {
        client.ws.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    this.clients.clear();
  }
}
