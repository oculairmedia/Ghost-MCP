/**
 * Tool handler for listing posts from Ghost blog with pagination and filtering options
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

export async function handleListGhostPosts(server, args) {
    try {
        // Set default values
        const page = args.page || 1;
        const limit = args.limit || 15;
        const status = args.status || null;
        const include = args.include || "tags,authors";

        try {
            // Create API client with shared utilities
            const { client, apiUrl } = createApiClient();

            // Build API URL
            const url = buildApiUrl(apiUrl, 'posts');

            // Prepare request parameters
            const params = {
                page: page,
                limit: limit,
                include: include
            };
            
            if (status) {
                params.filter = `status:${status}`;
            }

            console.log(`Making request to: ${url}`);
            console.log(`Params: ${JSON.stringify(params, null, 2)}`);

            // Make the API request with retry logic
            const response = await client.get(url, {
                params: params,
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
 * Tool definition for list_ghost_posts
 */
export const listGhostPostsToolDefinition = {
    name: 'list_ghost_posts',
    description: 'Lists posts from Ghost blog with pagination and filtering options',
    inputSchema: {
        type: 'object',
        properties: {
            page: {
                type: 'integer',
                description: 'Page number for pagination',
                default: 1
            },
            limit: {
                type: 'integer',
                description: 'Number of posts per page',
                default: 15
            },
            status: {
                type: 'string',
                description: 'Filter by post status (draft, published, scheduled)',
            },
            include: {
                type: 'string',
                description: 'Related data to include (comma-separated: tags,authors)',
                default: 'tags,authors'
            },
        },
        required: [],
    },
};
