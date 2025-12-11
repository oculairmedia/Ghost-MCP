/**
 * Tool handler for updating an existing tag in Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleUpdateGhostTag(server, args) {
    try {
        // Validate required parameters
        if (!args.tag_id) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ error: "Tag ID is required" }, null, 2),
                }],
                isError: true
            };
        }

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // First get the current tag to get its updated_at timestamp
            const getUrl = `${apiUrl}/ghost/api/admin/tags/${args.tag_id}`;
            console.log(`Fetching current tag from: ${getUrl}`);
            
            const getResponse = await client.get(getUrl, {
                retry: 3,
                retryDelay: 1000
            });
            
            const currentTag = getResponse.data;
            
            if (!currentTag.tags || currentTag.tags.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ error: `Tag ${args.tag_id} not found` }, null, 2),
                    }],
                    isError: true
                };
            }
            
            const updatedAt = currentTag.tags[0].updated_at;

            // Ghost Admin API endpoint for update
            const url = `${apiUrl}/ghost/api/admin/tags/${args.tag_id}`;

            // Build update payload with only provided fields
            const tagData = {
                tags: [{ updated_at: updatedAt }]  // Include updated_at for collision detection
            };
            
            const updateFields = {
                name: args.name,
                description: args.description,
                accent_color: args.accent_color,
                visibility: args.visibility
            };
            
            for (const [field, value] of Object.entries(updateFields)) {
                if (value !== undefined) {
                    tagData.tags[0][field] = value;
                }
            }

            console.log(`Making update request to: ${url}`);
            console.log(`Payload: ${JSON.stringify(tagData, null, 2)}`);

            // Make the API request with retry logic
            const response = await client.put(url, tagData, {
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
 * Tool definition for update_ghost_tag
 */
export const updateGhostTagToolDefinition = {
    name: 'update_ghost_tag',
    description: 'Updates an existing tag in Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            tag_id: {
                type: 'string',
                description: 'The ID of the tag to update',
            },
            name: {
                type: 'string',
                description: 'New name for the tag',
            },
            description: {
                type: 'string',
                description: 'New description for the tag',
            },
            accent_color: {
                type: 'string',
                description: 'New accent color (hex code)',
            },
            visibility: {
                type: 'string',
                description: 'New visibility setting (public or internal)',
            },
        },
        required: ['tag_id'],
    },
};