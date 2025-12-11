/**
 * Shared Ghost API Client Module
 * 
 * Provides centralized API client creation with dependency injection for testing.
 * All credentials are loaded from environment variables.
 */
import axios from 'axios';
import crypto from 'crypto';

/**
 * Configuration loaded from environment variables
 */
export function getConfig() {
    return {
        apiUrl: process.env.GHOST_API_URL || 'https://blog.emmanuelu.com',
        adminKey: process.env.GHOST_ADMIN_KEY || '',
    };
}

/**
 * Parse Admin API key into ID and Secret
 * Format: {id}:{secret}
 */
export function parseAdminKey(adminKey) {
    if (!adminKey) {
        throw new Error('GHOST_ADMIN_KEY environment variable is required');
    }
    
    const parts = adminKey.split(':');
    if (parts.length !== 2) {
        throw new Error('GHOST_ADMIN_KEY must be in format {id}:{secret}');
    }
    
    return {
        id: parts[0],
        secret: parts[1]
    };
}

/**
 * Create a JWT token for Ghost Admin API
 * 
 * @param {string} keyId - The Admin API key ID
 * @param {string} keySecret - The Admin API key secret (hex encoded)
 * @returns {string} - JWT token
 */
export function createGhostToken(keyId, keySecret) {
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

    // Base64url encode function
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
 * Add retry interceptor to axios instance
 * 
 * @param {object} axiosInstance - Axios instance to add retry logic to
 * @returns {object} - The same axios instance with retry logic added
 */
export function addRetryInterceptor(axiosInstance) {
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
    
    return axiosInstance;
}

/**
 * Create a Ghost API client with authentication and retry logic
 * 
 * @param {object} options - Configuration options
 * @param {object} options.axiosInstance - Optional axios instance for dependency injection (testing)
 * @param {string} options.token - Optional pre-generated token
 * @param {string} options.adminKey - Optional admin key (overrides env var)
 * @param {string} options.apiUrl - Optional API URL (overrides env var)
 * @returns {object} - Object containing { client, apiUrl, token }
 */
export function createApiClient(options = {}) {
    const config = getConfig();
    const apiUrl = options.apiUrl || config.apiUrl;
    const adminKey = options.adminKey || config.adminKey;
    
    // Parse admin key if not providing a pre-made token
    let token = options.token;
    if (!token) {
        const { id, secret } = parseAdminKey(adminKey);
        token = createGhostToken(id, secret);
    }
    
    // Use injected axios instance or create new one
    let client;
    if (options.axiosInstance) {
        client = options.axiosInstance;
    } else {
        client = axios.create({
            timeout: 30000,
            headers: {
                'Authorization': `Ghost ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        addRetryInterceptor(client);
    }
    
    return {
        client,
        apiUrl: apiUrl.replace(/\/$/, ''),  // Remove trailing slash
        token
    };
}

/**
 * Build Ghost Admin API URL for a specific endpoint
 * 
 * @param {string} baseUrl - Base API URL
 * @param {string} endpoint - API endpoint (e.g., 'posts', 'pages', 'tags')
 * @param {object} params - Optional query parameters
 * @returns {string} - Full URL
 */
export function buildApiUrl(baseUrl, endpoint, params = {}) {
    let url = `${baseUrl}/ghost/api/admin/${endpoint}/`;
    
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value);
        }
    }
    
    const queryString = queryParams.toString();
    if (queryString) {
        url += `?${queryString}`;
    }
    
    return url;
}

/**
 * Format error response for MCP tools
 * 
 * @param {Error} error - Error object
 * @returns {object} - Formatted error response
 */
export function formatErrorResponse(error) {
    let errorMsg = error.message;
    
    if (error.response) {
        errorMsg += `\nResponse: ${JSON.stringify(error.response.data)}`;
    }
    
    return {
        content: [{
            type: 'text',
            text: JSON.stringify({ error: errorMsg }, null, 2),
        }],
        isError: true
    };
}

/**
 * Format success response for MCP tools
 * 
 * @param {object} data - Response data
 * @returns {object} - Formatted success response
 */
export function formatSuccessResponse(data) {
    return {
        content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
        }],
    };
}
