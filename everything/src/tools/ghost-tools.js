/**
 * Ghost Blog Tools for MCP Server
 * 
 * This file exports all Ghost blog tool handlers and definitions
 */
import axios from 'axios';
import crypto from 'crypto';

// Import tool handlers and definitions
import { handleCreateGhostPost, createGhostPostToolDefinition } from './create-ghost-post.js';
import { handleListGhostPosts, listGhostPostsToolDefinition } from './list-ghost-posts.js';
import { handleUpdateGhostPost, updateGhostPostToolDefinition } from './update-ghost-post.js';
import { handleDeleteGhostPost, deleteGhostPostToolDefinition } from './delete-ghost-post.js';
import { handleCreateGhostPage, createGhostPageToolDefinition } from './create-ghost-page.js';
import { handleListGhostPages, listGhostPagesToolDefinition } from './list-ghost-pages.js';
import { handleUpdateGhostPage, updateGhostPageToolDefinition } from './update-ghost-page.js';
import { handleDeleteGhostPage, deleteGhostPageToolDefinition } from './delete-ghost-page.js';
import { handleCreateGhostTag, createGhostTagToolDefinition } from './create-ghost-tag.js';
import { handleUpdateGhostTag, updateGhostTagToolDefinition } from './update-ghost-tag.js';

// Export all tool handlers
export const ghostToolHandlers = {
    create_ghost_post: handleCreateGhostPost,
    list_ghost_posts: handleListGhostPosts,
    update_ghost_post: handleUpdateGhostPost,
    delete_ghost_post: handleDeleteGhostPost,
    create_ghost_page: handleCreateGhostPage,
    list_ghost_pages: handleListGhostPages,
    update_ghost_page: handleUpdateGhostPage,
    delete_ghost_page: handleDeleteGhostPage,
    create_ghost_tag: handleCreateGhostTag,
    update_ghost_tag: handleUpdateGhostTag,
    // Add other Ghost tool handlers as they are converted
};

// Export all tool definitions
export const ghostToolDefinitions = [
    createGhostPostToolDefinition,
    listGhostPostsToolDefinition,
    updateGhostPostToolDefinition,
    deleteGhostPostToolDefinition,
    createGhostPageToolDefinition,
    listGhostPagesToolDefinition,
    updateGhostPageToolDefinition,
    deleteGhostPageToolDefinition,
    createGhostTagToolDefinition,
    updateGhostTagToolDefinition,
    // Add other Ghost tool definitions as they are converted
];

// Helper function to create a JWT token for Ghost Admin API
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

// Helper function to create an axios instance with retry logic for Ghost API
export function createGhostApiClient(token) {
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

    return axiosInstance;
}