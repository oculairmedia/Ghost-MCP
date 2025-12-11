/**
 * Tag-specific CRUD operations for Ghost
 * 
 * Tags have different fields than posts/pages:
 * - name (required)
 * - description
 * - accent_color
 * - visibility (public/internal)
 */
import { createApiClient, buildApiUrl, formatErrorResponse, formatSuccessResponse } from './api-client.js';

/**
 * Create a validation error response
 */
function validationError(message) {
    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
        }],
        isError: true
    };
}

/**
 * Create tag handler
 */
export function createTagHandler() {
    return async function(server, args) {
        if (!args.name) {
            return validationError("Tag name is required");
        }

        const visibility = args.visibility || "public";

        try {
            const { client, apiUrl } = createApiClient();
            const url = buildApiUrl(apiUrl, 'tags');

            const payload = {
                tags: [{
                    name: args.name,
                    visibility
                }]
            };

            // Add optional fields
            if (args.description) {
                payload.tags[0].description = args.description;
            }
            if (args.accent_color) {
                payload.tags[0].accent_color = args.accent_color;
            }

            console.log(`Creating tag at: ${url}`);

            const response = await client.post(url, payload, {
                retry: 3,
                retryDelay: 1000
            });

            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    };
}

/**
 * List tags handler
 */
export function listTagsHandler() {
    return async function(server, args) {
        const page = args.page || 1;
        const limit = args.limit || 15;
        const filter = args.filter || null;
        const include = args.include || "count.posts";

        try {
            const { client, apiUrl } = createApiClient();
            const url = buildApiUrl(apiUrl, 'tags');

            const params = { page, limit, include };
            if (filter) {
                params.filter = filter;
            }

            console.log(`Listing tags from: ${url}`);

            const response = await client.get(url, {
                params,
                retry: 3,
                retryDelay: 1000
            });

            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    };
}

/**
 * Update tag handler
 */
export function updateTagHandler() {
    return async function(server, args) {
        if (!args.tag_id) {
            return validationError("Tag ID is required");
        }

        try {
            const { client, apiUrl } = createApiClient();
            
            // Fetch current tag to get updated_at for collision detection
            const getUrl = buildApiUrl(apiUrl, `tags/${args.tag_id}`);
            console.log(`Fetching current tag from: ${getUrl}`);
            
            const getResponse = await client.get(getUrl, {
                retry: 3,
                retryDelay: 1000
            });

            const currentTag = getResponse.data.tags?.[0];
            if (!currentTag) {
                return validationError(`Tag ${args.tag_id} not found`);
            }

            // Build update payload
            const updateUrl = buildApiUrl(apiUrl, `tags/${args.tag_id}`);
            const payload = {
                tags: [{
                    updated_at: currentTag.updated_at
                }]
            };

            // Add optional fields
            const fieldMappings = {
                name: 'name',
                description: 'description',
                accent_color: 'accent_color',
                visibility: 'visibility'
            };

            for (const [argField, payloadField] of Object.entries(fieldMappings)) {
                if (args[argField] !== undefined) {
                    payload.tags[0][payloadField] = args[argField];
                }
            }

            console.log(`Updating tag at: ${updateUrl}`);

            const response = await client.put(updateUrl, payload, {
                retry: 3,
                retryDelay: 1000
            });

            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    };
}

/**
 * Delete tag handler
 */
export function deleteTagHandler() {
    return async function(server, args) {
        if (!args.tag_id) {
            return validationError("Tag ID is required");
        }

        try {
            const { client, apiUrl } = createApiClient();
            const url = buildApiUrl(apiUrl, `tags/${args.tag_id}`);

            console.log(`Deleting tag at: ${url}`);

            const response = await client.delete(url, {
                retry: 3,
                retryDelay: 1000
            });

            // Ghost returns 204 No Content for successful deletion
            if (response.status === 204) {
                return formatSuccessResponse({
                    success: true,
                    message: `Tag ${args.tag_id} deleted successfully`
                });
            }

            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    };
}

/**
 * Tool definitions for tag operations
 */
export const createTagToolDefinition = {
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
                description: 'The accent color for the tag (hex code without #)',
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

export const listTagsToolDefinition = {
    name: 'list_ghost_tags',
    description: 'Lists tags from Ghost blog with pagination',
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
                description: 'Number of tags per page',
                default: 15
            },
            filter: {
                type: 'string',
                description: 'Filter expression (e.g., visibility:public)',
            },
            include: {
                type: 'string',
                description: 'Related data to include (e.g., count.posts)',
                default: 'count.posts'
            },
        },
        required: [],
    },
};

export const updateTagToolDefinition = {
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
                description: 'New accent color (hex code without #)',
            },
            visibility: {
                type: 'string',
                description: 'New visibility setting (public or internal)',
            },
        },
        required: ['tag_id'],
    },
};

export const deleteTagToolDefinition = {
    name: 'delete_ghost_tag',
    description: 'Deletes a tag from Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            tag_id: {
                type: 'string',
                description: 'The ID of the tag to delete',
            }
        },
        required: ['tag_id'],
    },
};
