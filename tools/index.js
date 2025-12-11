import { ghostToolDefinitions, ghostToolHandlers } from './ghost-tools.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Register all tool handlers with the server
 * @param {Object} server - The GhostServer instance
 */
export function registerToolHandlers(server) {
    // Register tool definitions
    server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: ghostToolDefinitions,
    }));

    // Register tool call handler
    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === 'list_tools') {
            return {
                tools: ghostToolDefinitions,
            };
        }

        const handler = ghostToolHandlers[request.params.name];
        
        if (handler) {
            return handler(server, request.params.arguments);
        } else {
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
            );
        }
    });
}

// Export all tool definitions
export const toolDefinitions = ghostToolDefinitions;

// Export all tool handlers
export const toolHandlers = ghostToolHandlers;

/**
 * Returns a formatted list of all available Ghost tools with their descriptions
 * @returns {Array} Array of objects containing tool name and description
 */
export function getToolsList() {
    return ghostToolDefinitions.map(tool => ({
        name: tool.name,
        description: tool.description
   }));
}

/**
 * Logs all available Ghost tools to the console
 */
export function showTools() {
    console.log('Available Ghost Tools:');
    console.log('=====================');
    
    ghostToolDefinitions.forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description}`);
    });
}