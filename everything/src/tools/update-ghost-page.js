/**
 * Tool handler for updating an existing page in Ghost blog
 */
import axios from 'axios';
import crypto from 'crypto';

/**
 * Creates a Ghost Admin API JWT token
 * Uses base64 encoding and HMAC-SHA256 for manual JWT creation
 */
function createToken(keyId, keySecret) {
    const header = {
        alg: "HS256",
        typ: "JWT",
        kid: keyId
    };
    
    const iat = Math.floor(Date.now() / 1000);
    const payload = {
        iat: iat,
        exp: iat + 300,  // Token expires in 5 minutes
        aud: "/admin/"
    };

    // Base64 encode function
    const b64encode = (obj) => {
        return Buffer.from(JSON.stringify(obj))
            .toString('base64')
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };

    const headerEncoded = b64encode(header);
    const payloadEncoded = b64encode(payload);
    
    const message = `${headerEncoded}.${payloadEncoded}`;
    const key = Buffer.from(keySecret, 'hex');
    const signature = crypto.createHmac('sha256', key)
        .update(message)
        .digest('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    
    return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

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

        // Get API credentials
        const apiUrl = process.env.GHOST_API_URL || "https://blog.emmanuelu.com";
        const adminId = "67b2d2824fdabf0001eb99ea";
        const adminSecret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d";

        try {
            // Create JWT token
            const token = createToken(adminId, adminSecret);

            // Set up axios instance with retry logic
            const axiosInstance = axios.create({
                timeout: 30000,
                headers: {
                    'Authorization': `Ghost ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // Add retry logic
            axiosInstance.interceptors.response.use(null, async (error) => {
                const { config } = error;
                if (!config || !config.retry) {
                    return Promise.reject(error);
                }
                
                config.retryCount = config.retryCount || 0;
                
                if (config.retryCount >= config.retry) {
                    return Promise.reject(error);
                }
                
                config.retryCount += 1;
                
                const backoff = config.retryDelay || 1000;
                await new Promise(resolve => setTimeout(resolve, backoff));
                
                return axiosInstance(config);
            });

            // First get the current page to get its updated_at timestamp
            const getUrl = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/pages/${args.page_id}`;
            console.log(`Fetching current page from: ${getUrl}`);
            
            const getResponse = await axiosInstance.get(getUrl, {
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
            const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/pages/${args.page_id}`;

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
            console.log(`Headers: ${JSON.stringify(axiosInstance.defaults.headers)}`);
            console.log(`Payload: ${JSON.stringify(pageData, null, 2)}`);

            // Make the API request
            const response = await axiosInstance.put(url, pageData, {
                retry: 3,
                retryDelay: 1000
            });

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response.data, null, 2),
                }],
            };
        } catch (error) {
            let errorMsg = error.message;
            
            if (error.response) {
                errorMsg += `\nResponse: ${JSON.stringify(error.response.data)}`;
            }
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ error: `Network or HTTP error - ${errorMsg}` }, null, 2),
                }],
                isError: true
            };
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