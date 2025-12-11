/**
 * Tool handler for creating a new tag in Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleCreateGhostTag(server, args) {
    try {
        // Validate required parameters
        if (!args.name) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ error: "Tag name is required" }, null, 2),
                }],
                isError: true
            };
        }

        // Set default values
        const description = args.description || null;
        const accentColor = args.accent_color || null;
        const visibility = args.visibility || "public";

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // Build API URL
            const url = buildApiUrl(apiUrl, 'tags');

            // Build tag data
            const tagData = {
                tags: [{
                    name: args.name,
                    visibility: visibility
                }]
            };

            if (description) {
                tagData.tags[0].description = description;
            }
            
            if (accentColor) {
                tagData.tags[0].accent_color = accentColor;
            }

            console.log(`Making request to: ${url}`);
            console.log(`Payload: ${JSON.stringify(tagData, null, 2)}`);

            // Make the API request with retry logic
            const response = await client.post(url, tagData, {
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
 * Tool definition for create_ghost_tag
 */
export const createGhostTagToolDefinition = {
    name: 'create_ghost_tag',
    description: 'Creates a new tag in Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'The name of the tag',
            },
            description: {
                type: 'string',
                description: 'Description of the tag',
            },
            accent_color: {
                type: 'string',
                description: 'The accent color for the tag (hex code)',
            },
            visibility: {
                type: 'string',
                description: 'Tag visibility (public or internal)',
                default: 'public'
            },
        },
        required: ['name'],
    },
};