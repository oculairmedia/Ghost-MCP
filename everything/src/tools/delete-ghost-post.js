/**
 * Tool handler for deleting a post from Ghost blog
 */
import axios from 'axios';
import crypto from 'crypto';

/**
 * Creates a Ghost Admin API JWT token
 * Uses base64 encoding and HMAC-SHA256 for manual JWT creation
 * 
 * @param {string} keyId - The Ghost Admin API key ID
 * @param {string} keySecret - The Ghost Admin API key secret
 * @returns {string} The JWT token
 */
function createToken(keyId, keySecret) {
    // Create header
    const header = {
        alg: "HS256",
        typ: "JWT",
        kid: keyId
    };

    // Create payload
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

    // Base64 encode header and payload
    const headerEncoded = b64encode(header);
    const payloadEncoded = b64encode(payload);

    // Create signature
    const message = `${headerEncoded}.${payloadEncoded}`;
    const key = Buffer.from(keySecret, 'hex');
    const signature = crypto.createHmac('sha256', key)
        .update(message)
        .digest('base64')
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    // Combine all parts
    return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

export async function handleDeleteGhostPost(server, args) {
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

            // Ghost Admin API endpoint
            const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/posts/${args.post_id}`;

            console.log(`Making request to: ${url}`);
            console.log(`Headers: ${JSON.stringify(axiosInstance.defaults.headers)}`);

            // Make the API request
            const response = await axiosInstance.delete(url, {
                retry: 3,
                retryDelay: 1000
            });
            
            // Ghost returns 204 No Content for successful deletion
            if (response.status === 204) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ 
                            success: true, 
                            message: `Post ${args.post_id} deleted successfully` 
                        }, null, 2),
                    }],
                };
            }
            
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
 * Tool definition for delete_ghost_post
 */
export const deleteGhostPostToolDefinition = {
    name: 'delete_ghost_post',
    description: 'Deletes a post from Ghost blog',
    inputSchema: {
        type: 'object',
        properties: {
            post_id: {
                type: 'string',
                description: 'The ID of the post to delete',
            }
        },
        required: ['post_id'],
    },
};