/**
 * TypeScript interfaces for ComputerCraft Dashboard JSON Communication
 * 
 * These types define the structure of messages sent between the dashboard
 * and ComputerCraft computers/turtles via WebSocket connection.
 * 
 * The goal is to allow dynamic UI generation based on API data from the game.
 */

// Base message structure - all messages will extend this
export interface BaseMessage {
  id: string;          // Unique message identifier
  timestamp: number;   // Unix timestamp when message was created
  type: string;        // Message type for routing/handling
  source: string;      // Source computer/turtle ID or "dashboard"
}

// Priority chat message - the main feature per README
export interface ChatMessage extends BaseMessage {
  type: 'chat';
  content: string;     // The actual message text
  priority: 'low' | 'medium' | 'high' | 'critical';  // Message importance
  category?: string;   // Optional category like "mining", "building", etc.
}

// API function definition sent from ComputerCraft
// This allows the game to tell the dashboard what functions are available
export interface APIFunction {
  name: string;        // Function name (e.g., "startMining", "moveForward")
  description: string; // Human-readable description
  parameters: APIParameter[];  // Required/optional parameters
  category: string;    // UI grouping (e.g., "movement", "mining", "inventory")
  cooldown?: number;   // Optional cooldown in seconds
}

// Parameter definition for API functions
export interface APIParameter {
  name: string;        // Parameter name
  type: 'string' | 'number' | 'boolean' | 'select';  // Input type
  required: boolean;   // Whether this parameter is required
  description: string; // Help text for the user
  defaultValue?: any;  // Optional default value
  options?: string[];  // For 'select' type - available options
  min?: number;        // For 'number' type - minimum value
  max?: number;        // For 'number' type - maximum value
}

// API registration message - sent when a computer connects
export interface APIRegistrationMessage extends BaseMessage {
  type: 'api_registration';
  computerName: string;    // Friendly name for this computer/turtle
  computerType: 'computer' | 'turtle' | 'pocket';  // ComputerCraft device type
  functions: APIFunction[]; // Available functions this computer provides
  status: {
    fuel?: number;          // For turtles - current fuel level
    position?: {            // For turtles - current coordinates
      x: number;
      y: number;
      z: number;
    };
    inventorySlots?: number; // Available inventory slots
  };
}

// Command message - sent from dashboard to ComputerCraft
export interface CommandMessage extends BaseMessage {
  type: 'command';
  targetComputer: string;  // Which computer should execute this
  functionName: string;    // Which function to call
  parameters: Record<string, any>;  // Function parameters as key-value pairs
}

// Status update message - periodic updates from computers
export interface StatusUpdateMessage extends BaseMessage {
  type: 'status_update';
  computerName: string;
  status: {
    isActive: boolean;
    currentTask?: string;
    fuel?: number;
    position?: { x: number; y: number; z: number };
    inventory?: Array<{
      slot: number;
      item: string;
      count: number;
    }>;
    customData?: Record<string, any>;  // For custom data from user scripts
  };
}

// Response message - sent back after executing a command
export interface CommandResponseMessage extends BaseMessage {
  type: 'command_response';
  originalCommandId: string;  // Reference to the command that was executed
  success: boolean;
  result?: any;              // Command result data
  error?: string;            // Error message if command failed
}

// Union type of all possible messages
export type Message = 
  | ChatMessage 
  | APIRegistrationMessage 
  | CommandMessage 
  | StatusUpdateMessage 
  | CommandResponseMessage;

// UI Component configuration - for dynamic UI generation
export interface UIComponent {
  id: string;
  type: 'button' | 'display' | 'input' | 'chart';
  title: string;
  position: { x: number; y: number };  // Grid position in dashboard
  size: { width: number; height: number };  // Component size
  config: Record<string, any>;  // Component-specific configuration
}

// Dashboard configuration - how the user has customized their dashboard
export interface DashboardConfig {
  layout: 'grid' | 'flexible';
  components: UIComponent[];
  theme: 'dark' | 'light';
  autoConnect: boolean;
  defaultServer?: {
    host: string;
    port: number;
  };
}

// WebSocket connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Helper type for creating new messages
export type CreateMessage<T extends Message> = Omit<T, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: number;
};
