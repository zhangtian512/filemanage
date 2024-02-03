var fs = require('fs')
import { fmtDate } from '../util/index'

function errLog(...content) {
  const fileName = `error-log-${fmtDate(new Date(), 'YYYY-mm-dd')}.log`
  const msg = `[error] [${fmtDate(new Date())}] ${content.join('')}\n`
  fs.writeFile(fileName, msg, {'flag': 'a'}, err=> {
    if (err) console.log('fs.writeFile err:', err)
  })
}

function debugLog(...content) {
  const fileName = `debug-log-${fmtDate(new Date(), 'YYYY-mm-dd')}.log`
  const msg = `[debug] [${fmtDate(new Date())}] ${content.join('')}\n`
  fs.writeFile(fileName, msg, {'flag': 'a'}, err=> {
    if (err) console.log('fs.writeFile err:', err)
  })
}

export {
  errLog,
  debugLog
}