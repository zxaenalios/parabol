const crypto = require('crypto')
const onTrack = require('./SegmentFnHubspot')
const SERVER_SECRET = 'c5h_MgiGHlX2BFJOpSjGFOHhl7z5RzP6FXblM7zgjgoFiiChcgWvnWrjeEV3XxV4'
const now = new Date()
const epochNow = Math.floor(now / 1000)
const payload = {
  event: 'Meeting Completed',
  parabolToken: crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(String(epochNow))
    .digest('base64'),
  userId: 'google-oauth2|106924435061395396635',
  // userId: 'google-oauth2|106924435061395396637test',
  timestamp: now.toJSON(),
  properties: {
    // PUT YOUR PROPS HERE
    email: 'ncoulonnier@easilys.com',
    fromSignup: true,
    orgId: 'WDT2NvXPta',
    teamId: 'H-R22-9dvG'
  },
  originalTimestamp: now.toJSON()
}
const settings = {
  hubspotKey: '73100f43-89cb-498f-ad14-605112ab8e00',
  segmentFnKey: 'yh7TkmnOCQ8Mt7jNjwo5SMDkeZqKnhMJqU0iSBo0LXuOcWs7oCar1VNQKGJrhg',
  parabolEndpoint: 'https://action.parabol.co/webhooks/graphql'
  // parabolEndpoint: 'http://localhost:3000/webhooks/graphql'
}
;(async () => {
  await onTrack(payload, settings).catch(console.log)
})()
