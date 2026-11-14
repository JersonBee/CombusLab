import { createServer } from 'node:http'
import { handleRequest } from './router.mjs'

createServer(handleRequest).listen(8787, '127.0.0.1', () => console.log('CombusLab API on http://127.0.0.1:8787'))
