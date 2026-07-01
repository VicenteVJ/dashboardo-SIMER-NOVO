import { connectLambda } from '@netlify/blobs'
import serverless from 'serverless-http'
import app from '../../server/app.js'

const serverlessHandler = serverless(app)

export async function handler(event, context) {
  // serverless-http uses Netlify's Lambda-compatible event shape. Connecting it
  // here makes the Blobs context available before the Express request is handled.
  if (event.blobs) connectLambda(event)
  return serverlessHandler(event, context)
}
