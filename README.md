# Ghost MCP Server

MCP (Model Context Protocol) server for Ghost CMS blog integration. Enables AI agents and LLMs to manage Ghost blog content through standardized MCP tools.

## Directory Structure

```
.
├── index.js              # Main entry point
├── core/                 # Core server functionality
│   ├── server.js         # GhostServer class with API communication
│   └── api-client.js     # Shared Ghost API utilities and JWT auth
├── tools/                # MCP tool implementations
│   ├── index.js          # Tool registry and handlers
│   ├── ghost-tools.js    # Tool exports and definitions
│   ├── create-ghost-post.js
│   ├── list-ghost-posts.js
│   ├── update-ghost-post.js
│   ├── delete-ghost-post.js
│   ├── create-ghost-page.js
│   ├── list-ghost-pages.js
│   ├── update-ghost-page.js
│   ├── delete-ghost-page.js
│   ├── create-ghost-tag.js
│   └── update-ghost-tag.js
├── transports/           # Server transport implementations
│   ├── index.js          # Transport exports
│   ├── stdio-transport.js
│   ├── sse-transport.js
│   └── http-transport.js # Streamable HTTP (default)
└── __tests__/            # Test files
```

## Available Tools

| Tool | Description |
|------|-------------|
| `create_ghost_post` | Create a new blog post |
| `list_ghost_posts` | List posts with pagination |
| `update_ghost_post` | Update an existing post |
| `delete_ghost_post` | Delete a post |
| `create_ghost_page` | Create a new page |
| `list_ghost_pages` | List pages with pagination |
| `update_ghost_page` | Update an existing page |
| `delete_ghost_page` | Delete a page |
| `create_ghost_tag` | Create a new tag |
| `update_ghost_tag` | Update an existing tag |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GHOST_API_URL` | Ghost instance URL | Yes |
| `GHOST_ADMIN_KEY` | Admin API key (format: `id:secret`) | Yes |
| `PORT` | Server port (default: 3064) | No |
| `NODE_ENV` | Environment mode | No |

## Running the Server

```bash
# HTTP transport (default, for production)
npm start

# SSE transport
npm run start:sse

# Stdio transport (for CLI integration)
npm run start:stdio

# Development
npm run dev

# Run tests
npm test
```

## Docker

```bash
# Build image
docker build -t ghost-mcp .

# Run container
docker run -p 3064:3064 \
  -e GHOST_API_URL=https://your-ghost-blog.com \
  -e GHOST_ADMIN_KEY=your-key-id:your-key-secret \
  ghost-mcp
```

## API Endpoints

- `POST /mcp` - MCP request endpoint
- `GET /mcp` - SSE streaming endpoint
- `DELETE /mcp` - Session termination
- `GET /health` - Health check

## License

MIT
