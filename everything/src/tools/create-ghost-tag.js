/**
 * Tool handler for creating a new tag in Ghost blog
 */
import axios from 'axios';
import crypto from 'crypto';

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

        // Get API credentials
        const apiUrl = process.env.GHOST_API_URL || "https://blog.emmanuelu.com";
        const adminId = "67b2d2824fdabf0001eb99ea";
        const adminSecret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d";

        try {
            // Create JWT token manually
            const header = {
                alg: "HS256",
                typ: "JWT",
                kid: adminId
            };
            
            const iat = Math.floor(Date.now() / 1000);
            const payload = {
                iat: iat,
                exp: iat + 300,  // Token expires in 5 minutes
                aud: "/admin/"
            };

            // Base64 encode header and payload
            const headerEncoded = Buffer.from(JSON.stringify(header))
                .toString('base64')
                .replace(/=+$/, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
                
            const payloadEncoded = Buffer.from(JSON.stringify(payload))
                .toString('base64')
                .replace(/=+$/, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
            
            // Create signature
            const message = `${headerEncoded}.${payloadEncoded}`;
            const key = Buffer.from(adminSecret, 'hex');
            const signature = crypto.createHmac('sha256', key)
                .update(message)
                .digest('base64')
                .replace(/=+$/, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');
            
            // Combine into final token
            const token = `${headerEncoded}.${payloadEncoded}.${signature}`;

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
            const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/tags`;

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
            console.log(`Headers: ${JSON.stringify(axiosInstance.defaults.headers)}`);
            console.log(`Payload: ${JSON.stringify(tagData, null, 2)}`);

            // Make the API request
            const response = await axiosInstance.post(url, tagData, {
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