import { config } from 'dotenv';

// Load environment variables
config();

export const CONFIG = {
  ULRIK_API_URL: process.env.ULRIK_API_URL || 'http://localhost:3000',
  MCP_SERVER_PORT: parseInt(process.env.MCP_SERVER_PORT || '3001', 10),
} as const;

export function validateConfig() {
  if (!CONFIG.ULRIK_API_URL) {
    throw new Error('ULRIK_API_URL is required');
  }
  
  console.error(`[Config] Ulrik API URL: ${CONFIG.ULRIK_API_URL}`);
  console.error(`[Config] MCP Server Port: ${CONFIG.MCP_SERVER_PORT}`);
}
