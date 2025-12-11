/**
 * Tool handler for updating an existing page in Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleUpdateGhostPage(server, args) {
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

            // First get the current page to get its updated_at timestamp
            const getUrl = `${apiUrl}/ghost/api/admin/pages/${args.page_id}`;
            console.log(`Fetching current page from: ${getUrl}`);
            
            const getResponse = await client.get(getUrl, {
                retry: 3,
                retryDelay: 1000
            });
            
            const currentPage = getResponse.data;
            
            if (!currentPage.pages || currentPage.pages.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ error: `Page ${args.page_id} not found` }, null, 2),
                    }],
                    isError: true
                };
            }
            
            const updatedAt = currentPage.pages[0].updated_at;

            // Ghost Admin API endpoint for update
            const url = `${apiUrl}/ghost/api/admin/pages/${args.page_id}`;

            // Build update payload with only provided fields
            const pageData = {
                pages: [{ updated_at: updatedAt }]  // Include updated_at for collision detection
            };
            
            const updateFields = {
                title: args.title,
                html: args.content,
                status: args.status,
                featured: args.featured
            };
            
            for (const [field, value] of Object.entries(updateFields)) {
                if (value !== undefined) {
                    pageData.pages[0][field] = value;
                }
            }

            console.log(`Making update request to: ${url}`);
            console.log(`Payload: ${JSON.stringify(pageData, null, 2)}`);

            // Make the API request with retry logic
            const response = await client.put(url, pageData, {
                retry: 3,
                retryDelay: 1000
            });

            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    } catch (error) {
        return server.createErrorResponse(error);
    }
}

/**
 * Tool definition for update_ghost_page
 */
export const updateGhostPageToolDefinition = {
    name: 'update_ghost_page',
    description: 'Updates an existing page in Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            page_id: {
                type: 'string',
                description: 'The ID of the page to update',
            },
            title: {
                type: 'string',
                description: 'New title for the page',
            },
            content: {
                type: 'string',
                description: 'New content/body for the page',
            },
            status: {
                type: 'string',
                description: 'New status (draft, published, scheduled)',
            },
            featured: {
                type: 'boolean',
                description: 'Whether this is a featured page',
            },
        },
        required: ['page_id'],
    },
};