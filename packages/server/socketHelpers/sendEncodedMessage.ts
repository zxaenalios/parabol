import {HttpResponse} from 'uWebSockets.js'
import sendSSEMessage from '../sse/sendSSEMessage'
import ConnectionContext from './ConnectionContext'
import isHttpResponse from './isHttpResponse'

const ESTIMATED_MTU = 1400
const queue = []
let makeId = 0

const timeouts = [2000, 5000, 10000]
const fn = (socket, str, timeout = 2000) => {
  context.reliableTimeoutId = setTimeout(() => {
    if (isHttpResponse(socket)) {
      sendSSEMessage(socket as HttpResponse, str)
      return
    }
    socket.send(str, false, str.length > ESTIMATED_MTU)
  }, 2000)
  const nextUp = timeout * 1.2
  if (nextUp > 10000) {
    disconnect()
  }
  fn(socket, str, nextUp)
}

const sendEncodedMessage = (context: ConnectionContext, message: object | string, syn: boolean) => {
  const {socket, reliableQueue} = context
  if (socket.done) return
  const synMessage = {
    synId: makeId++,
    message
  }
  const str = JSON.stringify(synMessage)

  if (syn) {
    reliableQueue.push({str, timeout})
  }

  if (isHttpResponse(socket)) {
    sendSSEMessage(socket as HttpResponse, str)
    return
  }
  socket.send(str, false, str.length > ESTIMATED_MTU)
}

export default sendEncodedMessage
