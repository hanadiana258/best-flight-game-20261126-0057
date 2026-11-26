import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const request = normalize((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const body = await readFile(join(root, request));
    res.writeHead(200, { 'content-type': types[extname(request)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
server.listen(Number(process.env.PORT || 8080), () => console.log('server ready'));
