/**
 * Tool handler for updating an existing post in Ghost blog
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from '../core/api-client.js';

/**
 * Creates a new draft post in Ghost blog (helper for testing)
 */
async function createDraftPost(client, apiUrl) {
    const url = buildApiUrl(apiUrl, 'posts', { source: 'html' });
    const postData = {
        posts: [{
            title: "New Draft Post",
            status: "draft",
            html: "<p>This is the initial content of the draft post.</p>"
        }]
    };
    
    const response = await client.post(url, postData);
    return response.data.posts[0].id;
}

export async function handleUpdateGhostPost(server, args) {
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

            // Ghost Admin API endpoint for fetching current post
            const getUrl = buildApiUrl(apiUrl, `posts/${args.post_id}`);

            console.log(`Fetching current post from: ${getUrl}`);

            // Fetch the current post to get updated_at
            const getResponse = await client.get(getUrl, {
                retry: 3,
                retryDelay: 1000
            });

            const currentPost = getResponse.data.posts[0];
            console.log(`Current post updated_at: ${currentPost.updated_at}`);

            // Build update URL
            const updateUrl = buildApiUrl(apiUrl, `posts/${args.post_id}`, { source: 'html' });

            // Prepare update payload
            const updatePayload = {
                posts: [{
                    updated_at: currentPost.updated_at
                }]
            };

            // Add optional fields if provided
            if (args.title !== undefined) {
                updatePayload.posts[0].title = args.title;
            }
            if (args.content !== undefined) {
                updatePayload.posts[0].html = args.content;
            }
            if (args.status !== undefined) {
                updatePayload.posts[0].status = args.status;
            }
            if (args.featured !== undefined) {
                updatePayload.posts[0].featured = args.featured;
            }
            if (args.tags !== undefined) {
                updatePayload.posts[0].tags = args.tags;
            }

            console.log(`Updating post at: ${updateUrl}`);
            console.log(`Payload: ${JSON.stringify(updatePayload, null, 2)}`);

            // Make the update request
            const response = await client.put(updateUrl, updatePayload, {
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
 * Tool definition for update_ghost_post
 */
export const updateGhostPostToolDefinition = {
    name: 'update_ghost_post',
    description: 'Updates an existing post in Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            post_id: {
                type: 'string',
                description: 'The ID of the post to update',
            },
            title: {
                type: 'string',
                description: 'New title for the post (optional)',
            },
            content: {
                type: 'string',
                description: 'New content/body for the post in HTML (optional)',
            },
            status: {
                type: 'string',
                description: 'New status for the post (draft, published, scheduled) (optional)',
            },
            featured: {
                type: 'boolean',
                description: 'Whether this should be a featured post (optional)',
            },
            tags: {
                type: 'array',
                items: {
                    type: 'object'
                },
                description: 'List of tag objects (each with \'name\') (optional)',
            },
        },
        required: ['post_id'],
    },
};
