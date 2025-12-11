/**
 * Tool handler for deleting a page from Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleDeleteGhostPage(server, args) {
    try {
        // Validate required parameters
        if (!args.page_id) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ error: "Page ID is required" }, null, 2),
                }],
                isError: true
            };
        }

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // Build API URL with page ID
            const url = `${apiUrl}/ghost/api/admin/pages/${args.page_id}`;

            console.log(`Making request to: ${url}`);

            // Make the API request with retry logic
            const response = await client.delete(url, {
                retry: 3,
                retryDelay: 1000
            });
            
            // Ghost returns 204 No Content for successful deletion
            if (response.status === 204) {
                return formatSuccessResponse({ 
                    success: true, 
                    message: `Page ${args.page_id} deleted successfully` 
                });
            }
            
            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    } catch (error) {
        return server.createErrorResponse(error);
    }
}

/**
 * Tool definition for delete_ghost_page
 */
export const deleteGhostPageToolDefinition = {
    name: 'delete_ghost_page',
    description: 'Deletes a page from Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            page_id: {
                type: 'string',
                description: 'The ID of the page to delete',
            }
        },
        required: ['page_id'],
    },
};