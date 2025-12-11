/**
 * Ghost Page Tools - Refactored using generic content operations
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

// Pages don't support tags
const pageOptions = { supportsTags: false };

// Handler functions
export const handleCreateGhostPage = createContentHandler('pages', pageOptions);
export const handleListGhostPages = listContentHandler('pages');
export const handleUpdateGhostPage = updateContentHandler('pages', 'page_id', pageOptions);
export const handleDeleteGhostPage = deleteContentHandler('pages', 'page_id');

// Tool definitions
export const createGhostPageToolDefinition = createToolDefinition('pages', pageOptions);
export const listGhostPagesToolDefinition = listToolDefinition('pages');
export const updateGhostPageToolDefinition = updateToolDefinition('pages', pageOptions);
export const deleteGhostPageToolDefinition = deleteToolDefinition('pages');
