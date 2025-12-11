/**
 * Tool handler for deleting a post from Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse } from '../core/api-client.js';

export async function handleDeleteGhostPost(server, args) {
    try {
        // Validate required parameters
        if (!args.post_id) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ error: "Post ID is required" }, null, 2),
                }],
                isError: true
            };
        }

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // Build API URL
            const url = buildApiUrl(apiUrl, `posts/${args.post_id}`);

            console.log(`Making request to: ${url}`);

            // Make the API request with retry logic
            const response = await client.delete(url, {
                retry: 3,
                retryDelay: 1000
            });
            
            // Ghost returns 204 No Content for successful deletion
            if (response.status === 204) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ 
                            success: true, 
                            message: `Post ${args.post_id} deleted successfully` 
                        }, null, 2),
                    }],
                };
            }
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response.data, null, 2),
                }],
            };
        } catch (error) {
            return formatErrorResponse(error);
        }
    } catch (error) {
        return server.createErrorResponse(error);
    }
}

/**
 * Tool definition for delete_ghost_post
 */
export const deleteGhostPostToolDefinition = {
    name: 'delete_ghost_post',
    description: 'Deletes a post from Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            post_id: {
                type: 'string',
                description: 'The ID of the post to delete',
            }
        },
        required: ['post_id'],
    },
};
