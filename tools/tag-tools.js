/**
 * Ghost Tag Tools - Refactored using tag-operations factory
 */
import {
    createTagHandler,
    listTagsHandler,
    updateTagHandler,
    deleteTagHandler,
    createTagToolDefinition,
    listTagsToolDefinition,
    updateTagToolDefinition,
    deleteTagToolDefinition
} from '../core/tag-operations.js';

// Handler functions
export const handleCreateGhostTag = createTagHandler();
export const handleListGhostTags = listTagsHandler();
export const handleUpdateGhostTag = updateTagHandler();
export const handleDeleteGhostTag = deleteTagHandler();

// Tool definitions
export const createGhostTagToolDefinition = createTagToolDefinition;
export const listGhostTagsToolDefinition = listTagsToolDefinition;
export const updateGhostTagToolDefinition = updateTagToolDefinition;
export const deleteGhostTagToolDefinition = deleteTagToolDefinition;
