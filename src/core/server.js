#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import crypto from 'crypto';

/**
 * Core GhostServer class that handles initialization and API communication
 */
export class GhostServer {
    /**
     * Initialize the Ghost MCP server
     */
    constructor() {
        // Initialize MCP server
        this.server = new Server({
            name: 'ghost-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });

        // Set up error handler
        this.server.onerror = (error) => console.error('[MCP Error]', error);

        // Initialize API configuration
        this.baseUrl = process.env.GHOST_URL || 'https://blog.emmanuelu.com';
        this.keyId = process.env.GHOST_KEY_ID;
        this.keySecret = process.env.GHOST_KEY_SECRET;
        
        if (!this.keyId || !this.keySecret) {
            console.warn('Warning: GHOST_KEY_ID or GHOST_KEY_SECRET environment variables not set');
        }
        
        // Initialize axios instance for API requests
        this.api = axios.create({
            baseURL: `${this.baseUrl}/ghost/api/admin`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
    }

    /**
     * Create a JWT token for Ghost Admin API authentication
     * @returns {string} JWT token
     */
    createGhostToken() {
        const header = {
            alg: "HS256",
            typ: "JWT",
            kid: this.keyId
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
        const key = Buffer.from(this.keySecret, 'hex');
        const signature = crypto.createHmac('sha256', key)
            .update(message)
            .digest('base64')
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        
        return `${headerEncoded}.${payloadEncoded}.${signature}`;
    }

    /**
     * Get API headers with authentication
     * @returns {Object} Headers object
     */
    getApiHeaders() {
        return {
            'Authorization': `Ghost ${this.createGhostToken()}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    /**
     * Create a standard error response
     * @param {Error} error - The error object
     * @returns {Object} Formatted error response
     */
    createErrorResponse(error) {
        console.error('Error in tool handler:', error);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    details: error.response?.data || error,
                }, null, 2),
            }],
            isError: true,
        };
    }
}