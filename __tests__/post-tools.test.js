/**
 * Ghost Post Tools Tests
 * 
 * Tests for create, list, update, delete post operations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockServer, mockResponses } from './helpers/test-utils.js';

// Create mock client with spies
const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
};

// Mock the api-client module
vi.mock('../core/api-client.js', () => ({
    createApiClient: vi.fn(() => ({
        client: mockClient,
        apiUrl: 'https://test-ghost.example.com',
        token: 'mock-token'
    })),
    buildApiUrl: vi.fn((baseUrl, endpoint, params) => {
        let url = `${baseUrl}/ghost/api/admin/${endpoint}/`;
        if (params && Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value);
                }
            }
            const queryString = queryParams.toString();
            if (queryString) url += `?${queryString}`;
        }
        return url;
    }),
    formatSuccessResponse: vi.fn((data) => ({
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    })),
    formatErrorResponse: vi.fn((error) => ({
        content: [{ type: 'text', text: JSON.stringify({ error: error.message }, null, 2) }],
        isError: true
    }))
}));

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
    vi.clearAllMocks();
    mockClient.get.mockReset();
    mockClient.post.mockReset();
    mockClient.put.mockReset();
    mockClient.delete.mockReset();
    
    process.env = {
        ...originalEnv,
        GHOST_API_URL: 'https://test-ghost.example.com',
        GHOST_ADMIN_KEY: 'test-key-id:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    };
});

afterEach(() => {
    process.env = originalEnv;
});

// Import handlers after mocking
const { handleCreateGhostPost, createGhostPostToolDefinition } = await import('../tools/create-ghost-post.js');
const { handleListGhostPosts, listGhostPostsToolDefinition } = await import('../tools/list-ghost-posts.js');
const { handleUpdateGhostPost, updateGhostPostToolDefinition } = await import('../tools/update-ghost-post.js');
const { handleDeleteGhostPost, deleteGhostPostToolDefinition } = await import('../tools/delete-ghost-post.js');

// Mock server object
const mockServer = createMockServer();

describe('Tool Definitions', () => {
    describe('createGhostPostToolDefinition', () => {
        it('should have correct name', () => {
            expect(createGhostPostToolDefinition.name).toBe('create_ghost_post');
        });

        it('should have description', () => {
            expect(createGhostPostToolDefinition.description).toBeDefined();
            expect(typeof createGhostPostToolDefinition.description).toBe('string');
        });

        it('should have required fields for title and content', () => {
            expect(createGhostPostToolDefinition.inputSchema.required).toContain('title');
            expect(createGhostPostToolDefinition.inputSchema.required).toContain('content');
        });

        it('should have optional status, tags, and featured fields', () => {
            const props = createGhostPostToolDefinition.inputSchema.properties;
            expect(props.status).toBeDefined();
            expect(props.tags).toBeDefined();
            expect(props.featured).toBeDefined();
        });

        it('should have correct property types', () => {
            const props = createGhostPostToolDefinition.inputSchema.properties;
            expect(props.title.type).toBe('string');
            expect(props.content.type).toBe('string');
            expect(props.status.type).toBe('string');
            expect(props.featured.type).toBe('boolean');
            expect(props.tags.type).toBe('array');
        });
    });

    describe('listGhostPostsToolDefinition', () => {
        it('should have correct name', () => {
            expect(listGhostPostsToolDefinition.name).toBe('list_ghost_posts');
        });

        it('should have no required fields', () => {
            expect(listGhostPostsToolDefinition.inputSchema.required).toEqual([]);
        });

        it('should have pagination fields', () => {
            const props = listGhostPostsToolDefinition.inputSchema.properties;
            expect(props.page).toBeDefined();
            expect(props.limit).toBeDefined();
        });

        it('should have filter fields', () => {
            const props = listGhostPostsToolDefinition.inputSchema.properties;
            expect(props.status).toBeDefined();
            expect(props.include).toBeDefined();
        });
    });

    describe('updateGhostPostToolDefinition', () => {
        it('should have correct name', () => {
            expect(updateGhostPostToolDefinition.name).toBe('update_ghost_post');
        });

        it('should require post_id', () => {
            expect(updateGhostPostToolDefinition.inputSchema.required).toContain('post_id');
        });

        it('should have update fields', () => {
            const props = updateGhostPostToolDefinition.inputSchema.properties;
            expect(props.title).toBeDefined();
            expect(props.content).toBeDefined();
            expect(props.status).toBeDefined();
        });
    });

    describe('deleteGhostPostToolDefinition', () => {
        it('should have correct name', () => {
            expect(deleteGhostPostToolDefinition.name).toBe('delete_ghost_post');
        });

        it('should require post_id', () => {
            expect(deleteGhostPostToolDefinition.inputSchema.required).toContain('post_id');
        });
    });
});

describe('handleCreateGhostPost', () => {
    it('should return error when title is missing', async () => {
        const result = await handleCreateGhostPost(mockServer, { content: 'Test content' });
        
        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.error).toContain('Title and content are required');
    });

    it('should return error when content is missing', async () => {
        const result = await handleCreateGhostPost(mockServer, { title: 'Test Title' });
        
        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.error).toContain('Title and content are required');
    });

    it('should create post with valid data', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.post
        });

        const result = await handleCreateGhostPost(mockServer, {
            title: 'Test Post',
            content: '<p>Test content</p>'
        });

        expect(result.isError).toBeUndefined();
        expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    it('should include tags when provided', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.post
        });

        await handleCreateGhostPost(mockServer, {
            title: 'Test Post',
            content: '<p>Test content</p>',
            tags: [{ name: 'test-tag' }]
        });

        const callArgs = mockClient.post.mock.calls[0];
        const payload = callArgs[1];
        expect(payload.posts[0].tags).toEqual([{ name: 'test-tag' }]);
    });

    it('should use draft status by default', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.post
        });

        await handleCreateGhostPost(mockServer, {
            title: 'Test Post',
            content: '<p>Test content</p>'
        });

        const callArgs = mockClient.post.mock.calls[0];
        const payload = callArgs[1];
        expect(payload.posts[0].status).toBe('draft');
    });

    it('should handle API errors gracefully', async () => {
        const error = new Error('API Error');
        error.response = { data: { errors: [{ message: 'Validation failed' }] } };
        mockClient.post.mockRejectedValueOnce(error);

        const result = await handleCreateGhostPost(mockServer, {
            title: 'Test Post',
            content: '<p>Test content</p>'
        });

        expect(result.isError).toBe(true);
    });
});

describe('handleListGhostPosts', () => {
    it('should list posts with default parameters', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.posts
        });

        const result = await handleListGhostPosts(mockServer, {});

        expect(result.isError).toBeUndefined();
        expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it('should pass pagination parameters', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.posts
        });

        await handleListGhostPosts(mockServer, { page: 2, limit: 10 });

        const callArgs = mockClient.get.mock.calls[0];
        expect(callArgs[1].params.page).toBe(2);
        expect(callArgs[1].params.limit).toBe(10);
    });

    it('should pass status filter when provided', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.posts
        });

        await handleListGhostPosts(mockServer, { status: 'published' });

        const callArgs = mockClient.get.mock.calls[0];
        expect(callArgs[1].params.filter).toBe('status:published');
    });

    it('should include tags and authors by default', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.posts
        });

        await handleListGhostPosts(mockServer, {});

        const callArgs = mockClient.get.mock.calls[0];
        expect(callArgs[1].params.include).toBe('tags,authors');
    });

    it('should handle API errors gracefully', async () => {
        const error = new Error('Network error');
        mockClient.get.mockRejectedValueOnce(error);

        const result = await handleListGhostPosts(mockServer, {});

        expect(result.isError).toBe(true);
    });
});

describe('handleUpdateGhostPost', () => {
    it('should return error when post_id is missing', async () => {
        const result = await handleUpdateGhostPost(mockServer, { title: 'New Title' });
        
        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.error).toContain('Post ID is required');
    });

    it('should fetch current post before updating', async () => {
        // First call: get current post
        mockClient.get.mockResolvedValueOnce({
            data: {
                posts: [{
                    id: '123',
                    title: 'Old Title',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }]
            }
        });
        // Second call: update post
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.post
        });

        await handleUpdateGhostPost(mockServer, {
            post_id: '123',
            title: 'New Title'
        });

        expect(mockClient.get).toHaveBeenCalledTimes(1);
        expect(mockClient.put).toHaveBeenCalledTimes(1);
    });

    it('should include updated_at for collision detection', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                posts: [{
                    id: '123',
                    title: 'Old Title',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.post
        });

        await handleUpdateGhostPost(mockServer, {
            post_id: '123',
            title: 'New Title'
        });

        const putCall = mockClient.put.mock.calls[0];
        const payload = putCall[1];
        expect(payload.posts[0].updated_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should return error when post not found', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: { posts: [] }
        });

        const result = await handleUpdateGhostPost(mockServer, {
            post_id: 'nonexistent',
            title: 'New Title'
        });

        // Current implementation doesn't explicitly check for empty posts array,
        // so it fails when trying to access updated_at on undefined
        expect(result.isError).toBe(true);
    });

    it('should only send provided update fields', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                posts: [{
                    id: '123',
                    updated_at: '2024-01-01T00:00:00.000Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.post
        });

        await handleUpdateGhostPost(mockServer, {
            post_id: '123',
            title: 'New Title'
            // content not provided
        });

        const putCall = mockClient.put.mock.calls[0];
        const payload = putCall[1];
        expect(payload.posts[0].title).toBe('New Title');
        expect(payload.posts[0].html).toBeUndefined();
    });
});

describe('handleDeleteGhostPost', () => {
    it('should return error when post_id is missing', async () => {
        const result = await handleDeleteGhostPost(mockServer, {});
        
        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.error).toContain('Post ID is required');
    });

    it('should delete post successfully', async () => {
        mockClient.delete.mockResolvedValueOnce({
            status: 204,
            data: null
        });

        const result = await handleDeleteGhostPost(mockServer, { post_id: '123' });

        expect(result.isError).toBeUndefined();
        expect(mockClient.delete).toHaveBeenCalledTimes(1);
    });

    it('should call correct API endpoint', async () => {
        mockClient.delete.mockResolvedValueOnce({
            status: 204,
            data: null
        });

        await handleDeleteGhostPost(mockServer, { post_id: 'abc123' });

        const callArgs = mockClient.delete.mock.calls[0];
        expect(callArgs[0]).toContain('/posts/abc123');
    });

    it('should handle API errors gracefully', async () => {
        const error = new Error('Not found');
        error.response = { data: { errors: [{ message: 'Post not found' }] } };
        mockClient.delete.mockRejectedValueOnce(error);

        const result = await handleDeleteGhostPost(mockServer, { post_id: '123' });

        expect(result.isError).toBe(true);
    });
});
