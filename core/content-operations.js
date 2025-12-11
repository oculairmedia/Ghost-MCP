/**
 * Generic CRUD operations factory for Ghost content types (posts, pages)
 * 
 * This module provides factory functions that generate handlers for
 * create, read, update, delete, and list operations on Ghost content.
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
 * Factory to create a "create content" handler
 * 
 * @param {string} contentType - 'posts' or 'pages'
 * @param {object} options - Configuration options
 * @param {boolean} options.supportsTags - Whether this content type supports tags
 */
export function createContentHandler(contentType, options = {}) {
    const { supportsTags = false } = options;
    const singularType = contentType.slice(0, -1); // posts -> post, pages -> page
    
    return async function(server, args) {
        // Validate required parameters
        if (!args.title || !args.content) {
            return validationError("Title and content are required");
        }

        const status = args.status || "draft";
        const featured = args.featured !== undefined ? args.featured : false;

        try {
            const { client, apiUrl } = createApiClient();
            const url = buildApiUrl(apiUrl, contentType, { source: 'html' });

            const payload = {
                [contentType]: [{
                    title: args.title,
                    html: args.content,
                    status,
                    featured
                }]
            };

            if (supportsTags && args.tags) {
                payload[contentType][0].tags = args.tags;
            }

            console.log(`Creating ${singularType} at: ${url}`);

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
 * Factory to create a "list content" handler
 * 
 * @param {string} contentType - 'posts' or 'pages'
 */
export function listContentHandler(contentType) {
    return async function(server, args) {
        const page = args.page || 1;
        const limit = args.limit || 15;
        const status = args.status || null;
        const include = args.include || "tags,authors";

        try {
            const { client, apiUrl } = createApiClient();
            const url = buildApiUrl(apiUrl, contentType);

            const params = { page, limit, include };
            if (status) {
                params.filter = `status:${status}`;
            }

            console.log(`Listing ${contentType} from: ${url}`);

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
 * Factory to create an "update content" handler
 * 
 * @param {string} contentType - 'posts' or 'pages'
 * @param {string} idField - Name of the ID field in args (e.g., 'post_id', 'page_id')
 * @param {object} options - Configuration options
 * @param {boolean} options.supportsTags - Whether this content type supports tags
 */
export function updateContentHandler(contentType, idField, options = {}) {
    const { supportsTags = false } = options;
    const singularType = contentType.slice(0, -1);
    
    return async function(server, args) {
        const id = args[idField];
        
        if (!id) {
            return validationError(`${singularType.charAt(0).toUpperCase() + singularType.slice(1)} ID is required`);
        }

        try {
            const { client, apiUrl } = createApiClient();
            
            // Fetch current content to get updated_at for collision detection
            const getUrl = buildApiUrl(apiUrl, `${contentType}/${id}`);
            console.log(`Fetching current ${singularType} from: ${getUrl}`);
            
            const getResponse = await client.get(getUrl, {
                retry: 3,
                retryDelay: 1000
            });

            const currentContent = getResponse.data[contentType]?.[0];
            if (!currentContent) {
                return validationError(`${singularType.charAt(0).toUpperCase() + singularType.slice(1)} ${id} not found`);
            }

            // Build update payload
            const updateUrl = buildApiUrl(apiUrl, `${contentType}/${id}`, { source: 'html' });
            const payload = {
                [contentType]: [{
                    updated_at: currentContent.updated_at
                }]
            };

            // Add optional fields
            const fieldMappings = {
                title: 'title',
                content: 'html',
                status: 'status',
                featured: 'featured'
            };
            
            if (supportsTags) {
                fieldMappings.tags = 'tags';
            }

            for (const [argField, payloadField] of Object.entries(fieldMappings)) {
                if (args[argField] !== undefined) {
                    payload[contentType][0][payloadField] = args[argField];
                }
            }

            console.log(`Updating ${singularType} at: ${updateUrl}`);

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
 * Factory to create a "delete content" handler
 * 
 * @param {string} contentType - 'posts' or 'pages'
 * @param {string} idField - Name of the ID field in args
 */
export function deleteContentHandler(contentType, idField) {
    const singularType = contentType.slice(0, -1);
    
    return async function(server, args) {
        const id = args[idField];
        
        if (!id) {
            return validationError(`${singularType.charAt(0).toUpperCase() + singularType.slice(1)} ID is required`);
        }

        try {
            const { client, apiUrl } = createApiClient();
            const url = buildApiUrl(apiUrl, `${contentType}/${id}`);

            console.log(`Deleting ${singularType} at: ${url}`);

            const response = await client.delete(url, {
                retry: 3,
                retryDelay: 1000
            });

            // Ghost returns 204 No Content for successful deletion
            if (response.status === 204) {
                return formatSuccessResponse({
                    success: true,
                    message: `${singularType.charAt(0).toUpperCase() + singularType.slice(1)} ${id} deleted successfully`
                });
            }

            return formatSuccessResponse(response.data);
        } catch (error) {
            return formatErrorResponse(error);
        }
    };
}

/**
 * Generate tool definition for create operations
 */
export function createToolDefinition(contentType, options = {}) {
    const singularType = contentType.slice(0, -1);
    const { supportsTags = false } = options;
    
    const properties = {
        title: {
            type: 'string',
            description: `The title of the ${singularType}`,
        },
        content: {
            type: 'string',
            description: `The content/body of the ${singularType} (HTML)`,
        },
        status: {
            type: 'string',
            description: `${singularType.charAt(0).toUpperCase() + singularType.slice(1)} status (draft, published, scheduled)`,
            default: 'draft'
        },
        featured: {
            type: 'boolean',
            description: `Whether this is a featured ${singularType}`,
            default: false
        },
    };

    if (supportsTags) {
        properties.tags = {
            type: 'array',
            items: { type: 'object' },
            description: "List of tag objects (each with 'name')",
        };
    }

    return {
        name: `create_ghost_${singularType}`,
        description: `Creates a new ${singularType} in Ghost blog`,
        inputSchema: {
            type: 'object',
            properties,
            required: ['title', 'content'],
        },
    };
}

/**
 * Generate tool definition for list operations
 */
export function listToolDefinition(contentType) {
    const singularType = contentType.slice(0, -1);
    
    return {
        name: `list_ghost_${contentType}`,
        description: `Lists ${contentType} from Ghost blog with pagination and filtering options`,
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
                    description: `Number of ${contentType} per page`,
                    default: 15
                },
                status: {
                    type: 'string',
                    description: `Filter by ${singularType} status (draft, published, scheduled)`,
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
}

/**
 * Generate tool definition for update operations
 */
export function updateToolDefinition(contentType, options = {}) {
    const singularType = contentType.slice(0, -1);
    const { supportsTags = false } = options;
    
    const properties = {
        [`${singularType}_id`]: {
            type: 'string',
            description: `The ID of the ${singularType} to update`,
        },
        title: {
            type: 'string',
            description: `New title for the ${singularType}`,
        },
        content: {
            type: 'string',
            description: `New content/body for the ${singularType} in HTML`,
        },
        status: {
            type: 'string',
            description: `New status for the ${singularType} (draft, published, scheduled)`,
        },
        featured: {
            type: 'boolean',
            description: `Whether this should be a featured ${singularType}`,
        },
    };

    if (supportsTags) {
        properties.tags = {
            type: 'array',
            items: { type: 'object' },
            description: "List of tag objects (each with 'name')",
        };
    }

    return {
        name: `update_ghost_${singularType}`,
        description: `Updates an existing ${singularType} in Ghost blog`,
        inputSchema: {
            type: 'object',
            properties,
            required: [`${singularType}_id`],
        },
    };
}

/**
 * Generate tool definition for delete operations
 */
export function deleteToolDefinition(contentType) {
    const singularType = contentType.slice(0, -1);
    
    return {
        name: `delete_ghost_${singularType}`,
        description: `Deletes a ${singularType} from Ghost blog`,
        inputSchema: {
            type: 'object',
            properties: {
                [`${singularType}_id`]: {
                    type: 'string',
                    description: `The ID of the ${singularType} to delete`,
                }
            },
            required: [`${singularType}_id`],
        },
    };
}
