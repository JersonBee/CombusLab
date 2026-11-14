import { createServer } from 'node:http'
import { handleRequest } from './server/router.mjs'

createServer(handleRequest).listen(process.env.PORT ?? 8787)
