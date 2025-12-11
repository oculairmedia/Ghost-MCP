/**
 * Ghost Tools Tests
 * 
 * Tests for JWT token creation and helper functions from the shared api-client module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// Import directly from api-client since that's where the implementation lives
import { createGhostToken, buildApiUrl, formatSuccessResponse, formatErrorResponse } from '../core/api-client.js';

describe('createGhostToken', () => {
    const testKeyId = 'test-key-id-123';
    // 64 hex characters = 32 bytes for HMAC-SHA256
    const testKeySecret = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create a valid JWT token with three parts', () => {
        const token = createGhostToken(testKeyId, testKeySecret);
        
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
    });

    it('should include correct header with kid', () => {
        const token = createGhostToken(testKeyId, testKeySecret);
        
        const [headerB64] = token.split('.');
        // Convert base64url to base64
        const headerBase64 = headerB64.replace(/-/g, '+').replace(/_/g, '/');
        const header = JSON.parse(Buffer.from(headerBase64, 'base64').toString());
        
        expect(header).toEqual({
            alg: 'HS256',
            typ: 'JWT',
            kid: testKeyId
        });
    });

    it('should include correct payload with iat, exp, and aud', () => {
        const token = createGhostToken(testKeyId, testKeySecret);
        
        const [, payloadB64] = token.split('.');
        const payloadBase64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
        
        const expectedIat = Math.floor(new Date('2025-01-15T12:00:00Z').getTime() / 1000);
        
        expect(payload.iat).toBe(expectedIat);
        expect(payload.exp).toBe(expectedIat + 300); // 5 minutes
        expect(payload.aud).toBe('/admin/');
    });

    it('should create different tokens for different key IDs', () => {
        const token1 = createGhostToken('key-1', testKeySecret);
        const token2 = createGhostToken('key-2', testKeySecret);
        
        expect(token1).not.toBe(token2);
    });

    it('should create different tokens for different secrets', () => {
        const secret1 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
        const secret2 = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3';
        
        const token1 = createGhostToken(testKeyId, secret1);
        const token2 = createGhostToken(testKeyId, secret2);
        
        expect(token1).not.toBe(token2);
    });

    it('should use base64url encoding (no +, /, or = characters)', () => {
        const token = createGhostToken(testKeyId, testKeySecret);
        
        expect(token).not.toMatch(/[+/=]/);
    });

    it('should create verifiable signature', () => {
        const token = createGhostToken(testKeyId, testKeySecret);
        
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        const message = `${headerB64}.${payloadB64}`;
        
        // Recreate signature
        const key = Buffer.from(testKeySecret, 'hex');
        const expectedSignature = crypto.createHmac('sha256', key)
            .update(message)
            .digest('base64')
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
        
        expect(signatureB64).toBe(expectedSignature);
    });
});

describe('buildApiUrl', () => {
    it('should build URL for posts endpoint', () => {
        const url = buildApiUrl('https://test.com', 'posts');
        expect(url).toBe('https://test.com/ghost/api/admin/posts/');
    });

    it('should build URL for pages endpoint', () => {
        const url = buildApiUrl('https://test.com', 'pages');
        expect(url).toBe('https://test.com/ghost/api/admin/pages/');
    });

    it('should build URL for tags endpoint', () => {
        const url = buildApiUrl('https://test.com', 'tags');
        expect(url).toBe('https://test.com/ghost/api/admin/tags/');
    });

    it('should add query parameters', () => {
        const url = buildApiUrl('https://test.com', 'posts', {
            limit: 10,
            page: 2
        });
        expect(url).toBe('https://test.com/ghost/api/admin/posts/?limit=10&page=2');
    });

    it('should skip null and undefined parameters', () => {
        const url = buildApiUrl('https://test.com', 'posts', {
            limit: 10,
            filter: null,
            include: undefined
        });
        expect(url).toBe('https://test.com/ghost/api/admin/posts/?limit=10');
    });
});

describe('formatSuccessResponse', () => {
    it('should format success response correctly', () => {
        const data = { posts: [{ id: '123', title: 'Test' }] };
        const response = formatSuccessResponse(data);
        
        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);
        expect(response.content[0].type).toBe('text');
        expect(JSON.parse(response.content[0].text)).toEqual(data);
    });

    it('should format response as pretty JSON', () => {
        const data = { test: 'data' };
        const response = formatSuccessResponse(data);
        
        // Check that it's formatted with indentation
        expect(response.content[0].text).toContain('\n');
    });
});

describe('formatErrorResponse', () => {
    it('should format error response correctly', () => {
        const error = new Error('Test error');
        const response = formatErrorResponse(error);
        
        expect(response).toHaveProperty('isError', true);
        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);
        
        const parsedContent = JSON.parse(response.content[0].text);
        expect(parsedContent.error).toContain('Test error');
    });

    it('should include response data if available', () => {
        const error = new Error('Request failed');
        error.response = {
            data: { errors: [{ message: 'Detailed error' }] }
        };
        
        const response = formatErrorResponse(error);
        const parsedContent = JSON.parse(response.content[0].text);
        
        expect(parsedContent.error).toContain('Request failed');
        expect(parsedContent.error).toContain('Detailed error');
    });

    it('should handle errors without response data', () => {
        const error = new Error('Network error');
        const response = formatErrorResponse(error);
        
        expect(response.isError).toBe(true);
        const parsedContent = JSON.parse(response.content[0].text);
        expect(parsedContent.error).toBe('Network error');
    });
});
