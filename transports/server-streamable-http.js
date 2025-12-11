/**
 * A transport for a single client session over Streamable HTTP.
 * This is not a server itself, but a handler for a session.
 */
export class StreamableHTTPSessionTransport {
    constructor(options) {
        this.sessionId = options.sessionId;
        this.sseStream = null; // Holds the response object for the SSE connection
        this.pendingPostResponse = null; // Holds the response object for a pending POST request

        // These are implemented by the MCP Server when connect() is called.
        this.onmessage = async () => {};
        this.onclose = () => {};
    }

    /**
     * Starts the transport. For this transport, it's a no-op
     * as the connection is managed by the HTTP server.
     */
    async start() {
        // No-op
    }

    /**
     * Handles a POST request for this session.
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {object} body The JSON-RPC message
     */
    async handlePost(req, res, body) {
        if (this.pendingPostResponse) {
            res.status(429).json({ error: 'Too many requests' });
            return;
        }
        this.pendingPostResponse = res;
        try {
            await this.onmessage(body);
             // If onmessage was for a notification, it won't call send().
             // In that case, we should send 202 Accepted.
            if (this.pendingPostResponse && !this.pendingPostResponse.headersSent) {
                this.pendingPostResponse.status(202).send();
            }
        } catch (e) {
            if (this.pendingPostResponse && !this.pendingPostResponse.headersSent) {
                this.pendingPostResponse.status(500).json({ error: 'Internal server error' });
            }
        } finally {
            this.pendingPostResponse = null;
        }
    }

    /**
     * Handles a GET request to establish an SSE stream.
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async handleGet(req, res) {
        if (this.sseStream) {
            this.sseStream.end(); // Close previous stream if any
        }
        this.sseStream = res;

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        res.write('\n'); // Open the connection

        req.on('close', () => {
            this.sseStream = null;
            this.onclose();
        });
    }

    /**
     * Sends a message to the client.
     * It will use a pending POST response if available, otherwise it uses the SSE stream.
     * @param {object} message The JSON-RPC message
     */
    async send(message) {
        if (this.pendingPostResponse && !this.pendingPostResponse.headersSent) {
            this.pendingPostResponse.json(message);
            this.pendingPostResponse = null;
            return;
        }

        if (this.sseStream) {
            this.sseStream.write(`data: ${JSON.stringify(message)}\n\n`);
        } else {
            console.warn(`[${this.sessionId}] Cannot send message, no open transport stream.`);
        }
    }

    /**
     * Closes the connection.
     */
    close() {
        if (this.pendingPostResponse) {
            this.pendingPostResponse.end();
        }
        if (this.sseStream) {
            this.sseStream.end();
        }
        this.onclose();
    }
}