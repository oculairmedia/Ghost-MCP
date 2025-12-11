/**
 * Ghost Blog Tools for MCP Server
 * 
 * This file exports all Ghost blog tool handlers and definitions
 */

// Import refactored post tools
import {
    handleCreateGhostPost,
    handleListGhostPosts,
    handleUpdateGhostPost,
    handleDeleteGhostPost,
    createGhostPostToolDefinition,
    listGhostPostsToolDefinition,
    updateGhostPostToolDefinition,
    deleteGhostPostToolDefinition
} from './post-tools.js';

// Import refactored page tools
import {
    handleCreateGhostPage,
    handleListGhostPages,
    handleUpdateGhostPage,
    handleDeleteGhostPage,
    createGhostPageToolDefinition,
    listGhostPagesToolDefinition,
    updateGhostPageToolDefinition,
    deleteGhostPageToolDefinition
} from './page-tools.js';

// Import refactored tag tools
import {
    handleCreateGhostTag,
    handleListGhostTags,
    handleUpdateGhostTag,
    handleDeleteGhostTag,
    createGhostTagToolDefinition,
    listGhostTagsToolDefinition,
    updateGhostTagToolDefinition,
    deleteGhostTagToolDefinition
} from './tag-tools.js';

// Export all tool handlers
export const ghostToolHandlers = {
    // Posts
    create_ghost_post: handleCreateGhostPost,
    list_ghost_posts: handleListGhostPosts,
    update_ghost_post: handleUpdateGhostPost,
    delete_ghost_post: handleDeleteGhostPost,
    // Pages
    create_ghost_page: handleCreateGhostPage,
    list_ghost_pages: handleListGhostPages,
    update_ghost_page: handleUpdateGhostPage,
    delete_ghost_page: handleDeleteGhostPage,
    // Tags
    create_ghost_tag: handleCreateGhostTag,
    list_ghost_tags: handleListGhostTags,
    update_ghost_tag: handleUpdateGhostTag,
    delete_ghost_tag: handleDeleteGhostTag,
};

// Export all tool definitions
export const ghostToolDefinitions = [
    // Posts
    createGhostPostToolDefinition,
    listGhostPostsToolDefinition,
    updateGhostPostToolDefinition,
    deleteGhostPostToolDefinition,
    // Pages
    createGhostPageToolDefinition,
    listGhostPagesToolDefinition,
    updateGhostPageToolDefinition,
    deleteGhostPageToolDefinition,
    // Tags
    createGhostTagToolDefinition,
    listGhostTagsToolDefinition,
    updateGhostTagToolDefinition,
    deleteGhostTagToolDefinition,
];

// Re-export shared API utilities for backward compatibility
export { 
    createApiClient as createGhostApiClient,
    createGhostToken,
    buildApiUrl,
    formatErrorResponse,
    formatSuccessResponse 
} from '../core/api-client.js';
