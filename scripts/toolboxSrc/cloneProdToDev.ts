import getRethink from '../../packages/server/database/rethinkDriver'

export default async function cloneProdToDev() {
  const r = await getRethink()
  try {
    await r.dbDrop('actionDevelopment').run()
  } catch (e) {
    // empty
  }
  await r.dbCreate('actionDevelopment').run()
  const list = await r
    .db('actionProduction')
    .tableList()
    .run()
  const promises = list.map((table) =>
    r
      .db('actionProduction')
      .table(table)
      .config()
      .update({
        db: 'actionDevelopment'
      } as any)
      .run()
  )
  await Promise.all(promises)
  console.log('Move to actionDevelopment complete!')
  r.getPoolMaster().drain()
}

console.log('cloning')
cloneProdToDev()