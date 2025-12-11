/**
 * Test utilities and helpers for Ghost MCP tests
 */
import { vi } from 'vitest';

/**
 * Create a mock server object for MCP handlers
 */
export function createMockServer() {
    return {
        createErrorResponse: vi.fn((error) => ({
            content: [{ 
                type: 'text', 
                text: JSON.stringify({ error: error.message }, null, 2) 
            }],
            isError: true
        }))
    };
}

/**
 * Sample Ghost API responses
 */
export const mockResponses = {
    post: {
        posts: [{
            id: '507f1f77bcf86cd799439011',
            title: 'Test Post',
            slug: 'test-post',
            html: '<p>Test content</p>',
            status: 'draft',
            featured: false,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
            published_at: null,
            tags: []
        }]
    },
    
    posts: {
        posts: [
            {
                id: '507f1f77bcf86cd799439011',
                title: 'Test Post 1',
                slug: 'test-post-1',
                html: '<p>Content 1</p>',
                status: 'published',
                featured: false
            },
            {
                id: '507f1f77bcf86cd799439012',
                title: 'Test Post 2',
                slug: 'test-post-2',
                html: '<p>Content 2</p>',
                status: 'draft',
                featured: true
            }
        ],
        meta: {
            pagination: {
                page: 1,
                limit: 15,
                pages: 1,
                total: 2,
                next: null,
                prev: null
            }
        }
    },
    
    page: {
        pages: [{
            id: '507f1f77bcf86cd799439013',
            title: 'Test Page',
            slug: 'test-page',
            html: '<p>Page content</p>',
            status: 'published',
            featured: false,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
        }]
    },
    
    pages: {
        pages: [
            {
                id: '507f1f77bcf86cd799439013',
                title: 'About',
                slug: 'about',
                html: '<p>About page</p>',
                status: 'published',
                featured: false
            }
        ],
        meta: {
            pagination: {
                page: 1,
                limit: 15,
                pages: 1,
                total: 1,
                next: null,
                prev: null
            }
        }
    },
    
    tag: {
        tags: [{
            id: '507f1f77bcf86cd799439014',
            name: 'Test Tag',
            slug: 'test-tag',
            description: 'A test tag',
            accent_color: '#FF5733',
            visibility: 'public',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
        }]
    },
    
    tags: {
        tags: [
            {
                id: '507f1f77bcf86cd799439014',
                name: 'Test Tag',
                slug: 'test-tag',
                visibility: 'public'
            },
            {
                id: '507f1f77bcf86cd799439015',
                name: 'Another Tag',
                slug: 'another-tag',
                visibility: 'public'
            }
        ],
        meta: {
            pagination: {
                page: 1,
                limit: 15,
                pages: 1,
                total: 2,
                next: null,
                prev: null
            }
        }
    },
    
    error: {
        errors: [{
            message: 'Resource not found',
            type: 'NotFoundError',
            statusCode: 404
        }]
    }
};

/**
 * Create a mock axios error response
 */
export function createAxiosError(status, message, data = null) {
    const error = new Error(message);
    error.response = {
        status,
        statusText: message,
        data: data || { errors: [{ message }] }
    };
    error.isAxiosError = true;
    return error;
}
