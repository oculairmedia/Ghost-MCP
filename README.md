# Ghost MCP Server with SSE Transport

This repository contains a Model Context Protocol (MCP) server implementation for the Ghost blogging platform with Server-Sent Events (SSE) transport support.

## Features

- Supports both SSE and stdio transports
- Provides access to Ghost Admin API functionality through MCP tools
- Manage Ghost blog posts, pages, and tags
- Secure by default with non-root user in Docker
- Environment variable configuration
- Health check endpoint

## Quick Start

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your Ghost API credentials:
   ```
   GHOST_URL=https://your-ghost-blog.com
   GHOST_KEY_ID=your_ghost_key_id_here
   GHOST_KEY_SECRET=your_ghost_key_secret_here
   PORT=3064
   NODE_ENV=production
   ```

### Using Docker Compose

The easiest way to run the server is with Docker Compose:

```bash
docker-compose up -d
```

This will build the image if needed and start the server in detached mode.

### Using Docker Directly

You can also build and run the Docker image directly:

```bash
# Build the image
docker build -t oculair/ghost-mcp:1.0.0 .

# Run the container
docker run -p 3064:3064 --env-file .env --rm -it oculair/ghost-mcp:1.0.0
```

### Multi-Architecture Build

To build for multiple architectures (amd64 and arm64):

1. Enable Docker Buildx:
   ```bash
   docker buildx create --use --name multiarch-builder
   docker buildx inspect --bootstrap
   ```

2. Build and push:
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t oculair/ghost-mcp:1.0.0 \
     --push .
   ```

3. Verify the multi-architecture image:
   ```bash
   docker manifest inspect oculair/ghost-mcp:1.0.0
   ```

## Development

### Project Structure

```
.
├── everything/
│   ├── src/
│   │   ├── core/       # Core server implementation
│   │   ├── tools/      # MCP tool implementations
│   │   ├── transports/ # Transport implementations (SSE, stdio)
│   │   └── index.js    # Main entry point
│   └── package.json    # Node.js dependencies
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore file
├── compose.yaml        # Docker Compose configuration
├── Dockerfile          # Docker build configuration
└── README.md           # This file
```

### Available Tools

The server provides the following MCP tools:

- **Posts**: `create_ghost_post`, `list_ghost_posts`, `update_ghost_post`, `delete_ghost_post`
- **Pages**: `create_ghost_page`, `list_ghost_pages`, `update_ghost_page`, `delete_ghost_page`
- **Tags**: `create_ghost_tag`, `update_ghost_tag`

For detailed information about each tool and its parameters, see the [everything/README.md](everything/README.md) file.

### Debugging

To debug the container, you can run it with an interactive shell:

```bash
docker run -p 3064:3064 --env-file .env --rm -it --entrypoint bash oculair/ghost-mcp:1.0.0
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