/**
 * Ghost Post Tools - Refactored using generic content operations
 */
import {
    createContentHandler,
    listContentHandler,
    updateContentHandler,
    deleteContentHandler,
    createToolDefinition,
    listToolDefinition,
    updateToolDefinition,
    deleteToolDefinition
} from '../core/content-operations.js';

// Posts support tags
const postOptions = { supportsTags: true };

// Handler functions
export const handleCreateGhostPost = createContentHandler('posts', postOptions);
export const handleListGhostPosts = listContentHandler('posts');
export const handleUpdateGhostPost = updateContentHandler('posts', 'post_id', postOptions);
export const handleDeleteGhostPost = deleteContentHandler('posts', 'post_id');

// Tool definitions
export const createGhostPostToolDefinition = createToolDefinition('posts', postOptions);
export const listGhostPostsToolDefinition = listToolDefinition('posts');
export const updateGhostPostToolDefinition = updateToolDefinition('posts', postOptions);
export const deleteGhostPostToolDefinition = deleteToolDefinition('posts');
