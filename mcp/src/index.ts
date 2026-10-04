import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createServer} from './server.ts';

// stdout é o canal do protocolo; qualquer log precisa ir para stderr.
await createServer().connect(new StdioServerTransport());
console.error('content-os MCP pronto (stdio)');
