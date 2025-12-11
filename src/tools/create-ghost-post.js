/**
 * Tool handler for creating a new post in Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleCreateGhostPost(server, args) {
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
        const tags = args.tags || null;
        const featured = args.featured !== undefined ? args.featured : false;

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // Build API URL
            const url = buildApiUrl(apiUrl, 'posts', { source: 'html' });

            // Prepare request payload
            const requestPayload = {
                posts: [{
                    title: args.title,
                    html: args.content,
                    status: status,
                    featured: featured
                }]
            };

            if (tags) {
                requestPayload.posts[0].tags = tags;
            }

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
 * Tool definition for create_ghost_post
 */
export const createGhostPostToolDefinition = {
    name: 'create_ghost_post',
    description: 'Creates a new post in Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'The title of the post',
            },
            content: {
                type: 'string',
                description: 'The content/body of the post (HTML)',
            },
            status: {
                type: 'string',
                description: 'Post status (draft, published, scheduled)',
                default: 'draft'
            },
            tags: {
                type: 'array',
                items: {
                    type: 'object'
                },
                description: 'List of tag objects (each with \'name\')',
            },
            featured: {
                type: 'boolean',
                description: 'Whether this is a featured post',
                default: false
            },
        },
        required: ['title', 'content'],
    },
};
