/**
 * Tool handler for creating a new page in Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleCreateGhostPage(server, args) {
    try {
        // Validate required parameters
        if (!args.title || !args.content) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ error: "Title and content are required" }, null, 2),
                }],
                isError: true
            };
        }

        // Set default values
        const status = args.status || "draft";
        const featured = args.featured !== undefined ? args.featured : false;

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // Build API URL
            const url = buildApiUrl(apiUrl, 'pages', { source: 'html' });

            // Prepare request payload
            const requestPayload = {
                pages: [{
                    title: args.title,
                    html: args.content,
                    status: status,
                    featured: featured
                }]
            };

            console.log(`Making request to: ${url}`);
            console.log(`Payload: ${JSON.stringify(requestPayload, null, 2)}`);

            // Make the API request with retry logic
            const response = await client.post(url, requestPayload, {
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
 * Tool definition for create_ghost_page
 */
export const createGhostPageToolDefinition = {
    name: 'create_ghost_page',
    description: 'Creates a new page in Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'The title of the page',
            },
            content: {
                type: 'string',
                description: 'The content/body of the page (HTML)',
            },
            status: {
                type: 'string',
                description: 'Page status (draft, published, scheduled)',
                default: 'draft'
            },
            featured: {
                type: 'boolean',
                description: 'Whether this is a featured page',
                default: false
            },
        },
        required: ['title', 'content'],
    },
};
