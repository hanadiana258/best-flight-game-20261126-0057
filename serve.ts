import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root=new URL('./game/',import.meta.url);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
createServer(async(req,res)=>{try{const path=normalize((req.url||'/').split('?')[0]).replace(/^\.\.?[\\/]/,'');const file=new URL((path==='/'?'index.html':path).replace(/^\//,''),root);const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(path)]||'text/html','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404);res.end('not found')}}).listen(8080,()=>console.log('Azure Run at http://localhost:8080'));
