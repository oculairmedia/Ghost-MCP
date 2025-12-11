/**
 * Ghost Tag Tools Tests
 * 
 * Tests for create and update tag operations
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
const { 
    handleCreateGhostTag, 
    handleListGhostTags,
    handleUpdateGhostTag, 
    handleDeleteGhostTag,
    createGhostTagToolDefinition,
    listGhostTagsToolDefinition,
    updateGhostTagToolDefinition,
    deleteGhostTagToolDefinition
} = await import('../tools/tag-tools.js');

// Mock server object
const mockServer = createMockServer();

describe('Tool Definitions', () => {
    describe('createGhostTagToolDefinition', () => {
        it('should have correct name', () => {
            expect(createGhostTagToolDefinition.name).toBe('create_ghost_tag');
        });

        it('should require name field', () => {
            expect(createGhostTagToolDefinition.inputSchema.required).toContain('name');
        });

        it('should have name property', () => {
            const props = createGhostTagToolDefinition.inputSchema.properties;
            expect(props.name).toBeDefined();
            expect(props.name.type).toBe('string');
        });

        it('should have optional description and accent_color fields', () => {
            const props = createGhostTagToolDefinition.inputSchema.properties;
            expect(props.description).toBeDefined();
            expect(props.accent_color).toBeDefined();
            expect(props.visibility).toBeDefined();
        });
    });

    describe('updateGhostTagToolDefinition', () => {
        it('should have correct name', () => {
            expect(updateGhostTagToolDefinition.name).toBe('update_ghost_tag');
        });

        it('should require tag_id', () => {
            expect(updateGhostTagToolDefinition.inputSchema.required).toContain('tag_id');
        });
    });
});

describe('handleCreateGhostTag', () => {
    it('should return error when name is missing', async () => {
        const result = await handleCreateGhostTag(mockServer, {});

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Tag name is required');
    });

    it('should create tag with valid name', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        const result = await handleCreateGhostTag(mockServer, {
            name: 'Test Tag'
        });

        expect(result.isError).toBeUndefined();
        expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    it('should create tag with description and accent color', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        await handleCreateGhostTag(mockServer, {
            name: 'Test Tag',
            description: 'A test tag description',
            accent_color: '#FF5733'
        });

        const callArgs = mockClient.post.mock.calls[0];
        const payload = callArgs[1];
        expect(payload.tags[0].description).toBe('A test tag description');
        expect(payload.tags[0].accent_color).toBe('#FF5733');
    });

    it('should use public visibility by default', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        await handleCreateGhostTag(mockServer, {
            name: 'Test Tag'
        });

        const callArgs = mockClient.post.mock.calls[0];
        const payload = callArgs[1];
        expect(payload.tags[0].visibility).toBe('public');
    });

    it('should call correct API endpoint', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        await handleCreateGhostTag(mockServer, {
            name: 'Test Tag'
        });

        const callArgs = mockClient.post.mock.calls[0];
        expect(callArgs[0]).toContain('/tags/');
    });

    it('should handle API errors gracefully', async () => {
        mockClient.post.mockRejectedValueOnce(new Error('Duplicate tag'));

        const result = await handleCreateGhostTag(mockServer, {
            name: 'Existing Tag'
        });

        expect(result.isError).toBe(true);
    });
});

describe('handleUpdateGhostTag', () => {
    it('should return error when tag_id is missing', async () => {
        const result = await handleUpdateGhostTag(mockServer, {
            name: 'Updated Tag'
        });

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Tag ID is required');
    });

    it('should fetch current tag before updating', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                tags: [{
                    id: 'tag-123',
                    updated_at: '2025-01-15T12:00:00Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        await handleUpdateGhostTag(mockServer, {
            tag_id: 'tag-123',
            name: 'Updated Tag'
        });

        expect(mockClient.get).toHaveBeenCalledTimes(1);
        expect(mockClient.put).toHaveBeenCalledTimes(1);
    });

    it('should include updated_at for collision detection', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                tags: [{
                    id: 'tag-123',
                    updated_at: '2025-01-15T12:00:00Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        await handleUpdateGhostTag(mockServer, {
            tag_id: 'tag-123',
            name: 'Updated Tag'
        });

        const putCall = mockClient.put.mock.calls[0];
        const payload = putCall[1];
        expect(payload.tags[0].updated_at).toBe('2025-01-15T12:00:00Z');
    });

    it('should update tag successfully', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                tags: [{
                    id: 'tag-123',
                    updated_at: '2025-01-15T12:00:00Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        const result = await handleUpdateGhostTag(mockServer, {
            tag_id: 'tag-123',
            name: 'Updated Tag'
        });

        expect(result.isError).toBeUndefined();
    });

    it('should return error when tag not found', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: { tags: [] }
        });

        const result = await handleUpdateGhostTag(mockServer, {
            tag_id: 'non-existent',
            name: 'Updated Tag'
        });

        expect(result.isError).toBe(true);
    });

    it('should handle API errors', async () => {
        mockClient.get.mockRejectedValueOnce(new Error('API Error'));

        const result = await handleUpdateGhostTag(mockServer, {
            tag_id: 'tag-123',
            name: 'Updated Tag'
        });

        expect(result.isError).toBe(true);
    });

    it('should only send provided update fields', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                tags: [{
                    id: 'tag-123',
                    updated_at: '2025-01-15T12:00:00Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: mockResponses.tag
        });

        await handleUpdateGhostTag(mockServer, {
            tag_id: 'tag-123',
            name: 'Updated Tag'
            // description not provided
        });

        const putCall = mockClient.put.mock.calls[0];
        const payload = putCall[1];
        expect(payload.tags[0].name).toBe('Updated Tag');
        expect(payload.tags[0].description).toBeUndefined();
    });
});

describe('Tool Definitions - List and Delete', () => {
    describe('listGhostTagsToolDefinition', () => {
        it('should have correct name', () => {
            expect(listGhostTagsToolDefinition.name).toBe('list_ghost_tags');
        });

        it('should have no required fields', () => {
            expect(listGhostTagsToolDefinition.inputSchema.required).toEqual([]);
        });

        it('should have pagination fields', () => {
            const props = listGhostTagsToolDefinition.inputSchema.properties;
            expect(props.page).toBeDefined();
            expect(props.limit).toBeDefined();
        });
    });

    describe('deleteGhostTagToolDefinition', () => {
        it('should have correct name', () => {
            expect(deleteGhostTagToolDefinition.name).toBe('delete_ghost_tag');
        });

        it('should require tag_id', () => {
            expect(deleteGhostTagToolDefinition.inputSchema.required).toContain('tag_id');
        });
    });
});

describe('handleListGhostTags', () => {
    it('should list tags with default parameters', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.tags
        });

        const result = await handleListGhostTags(mockServer, {});

        expect(result.isError).toBeUndefined();
        expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it('should pass pagination parameters', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.tags
        });

        await handleListGhostTags(mockServer, { page: 2, limit: 10 });

        const callArgs = mockClient.get.mock.calls[0];
        expect(callArgs[1].params.page).toBe(2);
        expect(callArgs[1].params.limit).toBe(10);
    });

    it('should include count.posts by default', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: mockResponses.tags
        });

        await handleListGhostTags(mockServer, {});

        const callArgs = mockClient.get.mock.calls[0];
        expect(callArgs[1].params.include).toBe('count.posts');
    });

    it('should handle API errors gracefully', async () => {
        mockClient.get.mockRejectedValueOnce(new Error('Network error'));

        const result = await handleListGhostTags(mockServer, {});

        expect(result.isError).toBe(true);
    });
});

describe('handleDeleteGhostTag', () => {
    it('should return error when tag_id is missing', async () => {
        const result = await handleDeleteGhostTag(mockServer, {});
        
        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.error).toContain('Tag ID is required');
    });

    it('should delete tag successfully', async () => {
        mockClient.delete.mockResolvedValueOnce({
            status: 204,
            data: null
        });

        const result = await handleDeleteGhostTag(mockServer, { tag_id: 'tag-123' });

        expect(result.isError).toBeUndefined();
        expect(mockClient.delete).toHaveBeenCalledTimes(1);
    });

    it('should call correct API endpoint', async () => {
        mockClient.delete.mockResolvedValueOnce({
            status: 204,
            data: null
        });

        await handleDeleteGhostTag(mockServer, { tag_id: 'tag-abc123' });

        const callArgs = mockClient.delete.mock.calls[0];
        expect(callArgs[0]).toContain('/tags/tag-abc123');
    });

    it('should handle API errors gracefully', async () => {
        mockClient.delete.mockRejectedValueOnce(new Error('Not found'));

        const result = await handleDeleteGhostTag(mockServer, { tag_id: 'tag-123' });

        expect(result.isError).toBe(true);
    });
});
