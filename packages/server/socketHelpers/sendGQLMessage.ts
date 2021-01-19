import {GraphQLMessageType} from '../graphql/handleGraphQLTrebuchetRequest'
import ConnectionContext from './ConnectionContext'
import sendEncodedMessage from './sendEncodedMessage'

interface Message {
  type: string
  syn: boolean
  payload?: object
  id?: string
}

const sendGQLMessage = (
  context: ConnectionContext,
  type: GraphQLMessageType,
  syn: boolean,
  payload?: object,
  opId?: string
) => {
  const message = {type} as Message
  if (payload) message.payload = payload
  if (opId) message.id = opId

  sendEncodedMessage(connectionContext, message, syn)
}

export default sendGQLMessage

// client
let lastMessageId = 0

const handle = (data) => {
  lastMessageId = data.synId
  const sortedKeys = Object.keys(msgQueue)
    .sort()
    .filter((item) => item.synId < lastMessageId || counterHasReset(lastMessageId))
  sortedKeys.forEach((d) => {
    processData(d)
  })
  msgQueue = msgQueue.slice(sortedKeys.length)
  processData(data)
}
const onMessage = (data) => {
  const {synId} = data

  if (lastMessageId + 1 === synId) {
    handle()
  } else {
    msgQueue[synId] = data
  }
}
