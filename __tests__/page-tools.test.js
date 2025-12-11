/**
 * Ghost Page Tools Tests
 * 
 * Tests for create, list, update, delete page operations
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
    handleCreateGhostPage, 
    handleListGhostPages,
    handleUpdateGhostPage,
    handleDeleteGhostPage,
    createGhostPageToolDefinition,
    listGhostPagesToolDefinition,
    updateGhostPageToolDefinition,
    deleteGhostPageToolDefinition
} = await import('../tools/page-tools.js');

// Mock server object
const mockServer = createMockServer();

describe('Tool Definitions', () => {
    describe('createGhostPageToolDefinition', () => {
        it('should have correct name', () => {
            expect(createGhostPageToolDefinition.name).toBe('create_ghost_page');
        });

        it('should have required fields for title and content', () => {
            expect(createGhostPageToolDefinition.inputSchema.required).toContain('title');
            expect(createGhostPageToolDefinition.inputSchema.required).toContain('content');
        });

        it('should have correct property types', () => {
            const props = createGhostPageToolDefinition.inputSchema.properties;
            expect(props.title.type).toBe('string');
            expect(props.content.type).toBe('string');
        });
    });

    describe('listGhostPagesToolDefinition', () => {
        it('should have correct name', () => {
            expect(listGhostPagesToolDefinition.name).toBe('list_ghost_pages');
        });

        it('should have no required fields', () => {
            expect(listGhostPagesToolDefinition.inputSchema.required).toEqual([]);
        });

        it('should have pagination fields', () => {
            const props = listGhostPagesToolDefinition.inputSchema.properties;
            expect(props.page).toBeDefined();
            expect(props.limit).toBeDefined();
        });
    });

    describe('updateGhostPageToolDefinition', () => {
        it('should have correct name', () => {
            expect(updateGhostPageToolDefinition.name).toBe('update_ghost_page');
        });

        it('should require page_id', () => {
            expect(updateGhostPageToolDefinition.inputSchema.required).toContain('page_id');
        });
    });

    describe('deleteGhostPageToolDefinition', () => {
        it('should have correct name', () => {
            expect(deleteGhostPageToolDefinition.name).toBe('delete_ghost_page');
        });

        it('should require page_id', () => {
            expect(deleteGhostPageToolDefinition.inputSchema.required).toContain('page_id');
        });
    });
});

describe('handleCreateGhostPage', () => {
    it('should return error when title is missing', async () => {
        const result = await handleCreateGhostPage(mockServer, {
            content: '<p>Test content</p>'
        });

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Title and content are required');
    });

    it('should return error when content is missing', async () => {
        const result = await handleCreateGhostPage(mockServer, {
            title: 'Test Page'
        });

        expect(result.isError).toBe(true);
    });

    it('should create page with valid parameters', async () => {
        mockClient.post.mockResolvedValueOnce({
            data: {
                pages: [{
                    id: 'page-123',
                    title: 'Test Page',
                    status: 'draft'
                }]
            }
        });

        const result = await handleCreateGhostPage(mockServer, {
            title: 'Test Page',
            content: '<p>Test content</p>'
        });

        expect(result.isError).toBeUndefined();
        expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
        mockClient.post.mockRejectedValueOnce(new Error('API Error'));

        const result = await handleCreateGhostPage(mockServer, {
            title: 'Test Page',
            content: '<p>Test content</p>'
        });

        expect(result.isError).toBe(true);
    });
});

describe('handleListGhostPages', () => {
    it('should list pages successfully', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                pages: [
                    { id: 'page-1', title: 'Page 1' },
                    { id: 'page-2', title: 'Page 2' }
                ]
            }
        });

        const result = await handleListGhostPages(mockServer, {});

        expect(result.isError).toBeUndefined();
        expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: { pages: [] }
        });

        const result = await handleListGhostPages(mockServer, {});

        expect(result.isError).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
        mockClient.get.mockRejectedValueOnce(new Error('Connection refused'));

        const result = await handleListGhostPages(mockServer, {});

        expect(result.isError).toBe(true);
    });
});

describe('handleUpdateGhostPage', () => {
    it('should return error when page_id is missing', async () => {
        const result = await handleUpdateGhostPage(mockServer, {
            title: 'Updated Title'
        });

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Page ID is required');
    });

    it('should update page successfully', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: {
                pages: [{
                    id: 'page-123',
                    updated_at: '2025-01-15T12:00:00Z'
                }]
            }
        });
        mockClient.put.mockResolvedValueOnce({
            data: {
                pages: [{
                    id: 'page-123',
                    title: 'Updated Title'
                }]
            }
        });

        const result = await handleUpdateGhostPage(mockServer, {
            page_id: 'page-123',
            title: 'Updated Title'
        });

        expect(result.isError).toBeUndefined();
        expect(mockClient.get).toHaveBeenCalledTimes(1);
        expect(mockClient.put).toHaveBeenCalledTimes(1);
    });

    it('should return error when page not found', async () => {
        mockClient.get.mockResolvedValueOnce({
            data: { pages: [] }
        });

        const result = await handleUpdateGhostPage(mockServer, {
            page_id: 'non-existent',
            title: 'Updated Title'
        });

        expect(result.isError).toBe(true);
    });
});

describe('handleDeleteGhostPage', () => {
    it('should return error when page_id is missing', async () => {
        const result = await handleDeleteGhostPage(mockServer, {});

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text);
        expect(response.error).toContain('Page ID is required');
    });

    it('should delete page successfully', async () => {
        mockClient.delete.mockResolvedValueOnce({
            status: 204
        });

        const result = await handleDeleteGhostPage(mockServer, {
            page_id: 'page-123'
        });

        expect(result.isError).toBeUndefined();
        expect(mockClient.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion errors', async () => {
        mockClient.delete.mockRejectedValueOnce(new Error('Not found'));

        const result = await handleDeleteGhostPage(mockServer, {
            page_id: 'non-existent'
        });

        expect(result.isError).toBe(true);
    });
});
