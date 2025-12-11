/**
 * Ghost Blog Tools for MCP Server
 * 
 * This file exports all Ghost blog tool handlers and definitions
 */

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
];

// Re-export shared API utilities for backward compatibility
export { 
    createApiClient as createGhostApiClient,
    createGhostToken,
    buildApiUrl,
    formatErrorResponse,
    formatSuccessResponse 
} from '../core/api-client.js';