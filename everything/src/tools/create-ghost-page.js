/**
 * Tool handler for creating a new page in Ghost blog
 */
import axios from 'axios';
import crypto from 'crypto';

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
            const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/pages`;

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
            console.log(`Headers: ${JSON.stringify(axiosInstance.defaults.headers)}`);
            console.log(`Payload: ${JSON.stringify(requestPayload, null, 2)}`);

            // Make the API request
            const response = await axiosInstance.post(url, requestPayload, {
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
                description: 'The content/body of the page (HTML or Markdown)',
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