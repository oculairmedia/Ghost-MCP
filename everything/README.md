# Ghost MCP Server

This MCP server provides integration with the Ghost blogging platform through the Ghost Admin API. It allows you to manage your Ghost blog content programmatically through MCP tools.

## Features

- Create, read, update, and delete Ghost blog posts
- Create, read, update, and delete Ghost blog pages
- Create and update Ghost tags
- List posts, pages, and tags with pagination support
- Supports both SSE and stdio transports

## Tools

### Posts

1. `create_ghost_post`
   - Creates a new post in Ghost blog
   - Inputs:
     - `title` (string, required): The title of the post
     - `content` (string, required): The content/body of the post (HTML)
     - `status` (string, optional, default: "draft"): Post status (draft, published, scheduled)
     - `tags` (array, optional): List of tag objects (each with 'name')
     - `featured` (boolean, optional, default: false): Whether this is a featured post

2. `list_ghost_posts`
   - Lists posts from Ghost blog with pagination and filtering options
   - Inputs:
     - `page` (integer, optional, default: 1): Page number for pagination
     - `limit` (integer, optional, default: 15): Number of posts per page
     - `status` (string, optional): Filter by post status (draft, published, scheduled)
     - `include` (string, optional, default: "tags,authors"): Related data to include

3. `update_ghost_post`
   - Updates an existing post in Ghost blog
   - Inputs:
     - `post_id` (string, required): The ID of the post to update
     - `title` (string, optional): New title for the post
     - `content` (string, optional): New content/body for the post
     - `status` (string, optional): New status (draft, published, scheduled)
     - `tags` (array, optional): New list of tag objects (each with 'name')
     - `featured` (boolean, optional): Whether this is a featured post

4. `delete_ghost_post`
   - Deletes a post from Ghost blog
   - Inputs:
     - `post_id` (string, required): The ID of the post to delete

### Pages

1. `create_ghost_page`
   - Creates a new page in Ghost blog
   - Inputs:
     - `title` (string, required): The title of the page
     - `content` (string, required): The content/body of the page (HTML or Markdown)
     - `status` (string, optional, default: "draft"): Page status (draft, published, scheduled)
     - `featured` (boolean, optional, default: false): Whether this is a featured page

2. `list_ghost_pages`
   - Lists pages from Ghost blog with pagination and filtering options
   - Inputs:
     - `page` (integer, optional, default: 1): Page number for pagination
     - `limit` (integer, optional, default: 15): Number of pages per page
     - `status` (string, optional): Filter by page status (draft, published, scheduled)
     - `include` (string, optional, default: "tags,authors"): Related data to include

3. `update_ghost_page`
   - Updates an existing page in Ghost blog
   - Inputs:
     - `page_id` (string, required): The ID of the page to update
     - `title` (string, optional): New title for the page
     - `content` (string, optional): New content/body for the page
     - `status` (string, optional): New status (draft, published, scheduled)
     - `featured` (boolean, optional): Whether this is a featured page

4. `delete_ghost_page`
   - Deletes a page from Ghost blog
   - Inputs:
     - `page_id` (string, required): The ID of the page to delete

### Tags

1. `create_ghost_tag`
   - Creates a new tag in Ghost blog
   - Inputs:
     - `name` (string, required): The name of the tag
     - `description` (string, optional): Description of the tag
     - `accent_color` (string, optional): The accent color for the tag (hex code)
     - `visibility` (string, optional, default: "public"): Tag visibility (public or internal)

2. `update_ghost_tag`
   - Updates an existing tag in Ghost blog
   - Inputs:
     - `tag_id` (string, required): The ID of the tag to update
     - `name` (string, optional): New name for the tag
     - `description` (string, optional): New description for the tag
     - `accent_color` (string, optional): New accent color (hex code)
     - `visibility` (string, optional): New visibility setting (public or internal)

## Configuration

The server requires the following environment variables:

- `GHOST_URL`: The URL of your Ghost blog (e.g., https://blog.example.com)
- `GHOST_KEY_ID`: The Admin API key ID
- `GHOST_KEY_SECRET`: The Admin API key secret
- `PORT`: The port to run the SSE server on (default: 3064)
- `NODE_ENV`: The environment (development or production)

## Usage with Docker

```bash
docker run -p 3064:3064 \
  -e GHOST_URL=https://your-ghost-blog.com \
  -e GHOST_KEY_ID=your_key_id \
  -e GHOST_KEY_SECRET=your_key_secret \
  -e PORT=3064 \
  -e NODE_ENV=production \
  oculair/ghost-mcp:latest
```

## Usage with Docker Compose

```yaml
services:
  ghostmcp:
    image: oculair/ghost-mcp:latest
    ports:
      - "3064:3064"
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - PORT=3064
      - GHOST_URL=${GHOST_URL}
      - GHOST_KEY_ID=${GHOST_KEY_ID}
      - GHOST_KEY_SECRET=${GHOST_KEY_SECRET}
      - NODE_ENV=${NODE_ENV:-production}
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ghost": {
      "url": "http://localhost:3064/sse",
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
