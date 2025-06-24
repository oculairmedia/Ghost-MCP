/**
 * Tool handler for updating an existing post in Ghost blog
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

/**
 * Creates a new draft post in Ghost blog
 */
async function createDraftPost(axiosInstance, apiUrl) {
    const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/posts/?source=html`;
    const postData = {
        posts: [{
            title: "New Draft Post",
            status: "draft",
            html: "<p>This is the initial content of the draft post.</p>"
        }]
    };
    
    const response = await axiosInstance.post(url, postData);
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

            // First get the current post to get its updated_at timestamp
            const getUrl = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/posts/${args.post_id}`;
            console.log(`Fetching current post from: ${getUrl}`);
            
            const getResponse = await axiosInstance.get(getUrl, {
                retry: 3,
                retryDelay: 1000
            });
            
            const currentPost = getResponse.data;
            
            if (!currentPost.posts || currentPost.posts.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ error: `Post ${args.post_id} not found` }, null, 2),
                    }],
                    isError: true
                };
            }
            
            const updatedAt = currentPost.posts[0].updated_at;

            // Ghost Admin API endpoint for update
            const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/admin/posts/${args.post_id}/?source=html`;

            // Build update payload with only provided fields
            const postData = {
                posts: [{ updated_at: updatedAt }]  // Include updated_at for collision detection
            };
            
            const updateFields = {
                title: args.title,
                html: args.content,
                status: args.status,
                featured: args.featured
            };
            
            for (const [field, value] of Object.entries(updateFields)) {
                if (value !== undefined) {
                    postData.posts[0][field] = value;
                }
            }

            if (args.tags !== undefined) {
                postData.posts[0].tags = args.tags;
            }

            console.log(`Making update request to: ${url}`);
            console.log(`Headers: ${JSON.stringify(axiosInstance.defaults.headers)}`);
            console.log(`Payload: ${JSON.stringify(postData, null, 2)}`);

            // Make the API request
            const response = await axiosInstance.put(url, postData, {
                retry: 3,
                retryDelay: 1000
            });

            const updatedPost = response.data;
            
            // Extract both Lexical and HTML content from the response
            if (updatedPost.posts && updatedPost.posts.length > 0) {
                const post = updatedPost.posts[0];
                const lexicalContent = post.lexical || '';
                const htmlContent = post.html || '';
                post.lexical = lexicalContent;
                post.html = htmlContent;
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(updatedPost, null, 2),
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
                description: 'New title for the post',
            },
            content: {
                type: 'string',
                description: 'New content/body for the post',
            },
            status: {
                type: 'string',
                description: 'New status (draft, published, scheduled)',
            },
            tags: {
                type: 'array',
                items: {
                    type: 'object'
                },
                description: 'New list of tag objects (each with \'name\')',
            },
            featured: {
                type: 'boolean',
                description: 'Whether this is a featured post',
            },
        },
        required: ['post_id'],
    },
};