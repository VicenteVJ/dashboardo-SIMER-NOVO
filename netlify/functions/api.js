import { connectLambda } from '@netlify/blobs'
import serverless from 'serverless-http'

let serverlessHandlerPromise

function getServerlessHandler() {
  if (!serverlessHandlerPromise) {
    process.env.NETLIFY_FUNCTION = 'true'
    serverlessHandlerPromise = import('../../server/app.js')
      .then(({ default: app }) => serverless(app))
  }
  return serverlessHandlerPromise
}

export async function handler(event, context) {
  // Lambda compatibility mode requires the Blobs context before getStore is used.
  if (event.blobs) connectLambda(event)
  const serverlessHandler = await getServerlessHandler()
  return serverlessHandler(event, context)
}
