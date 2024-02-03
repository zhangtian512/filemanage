import { errLog } from './log.js'
const { MongoClient } = require("mongodb")

var config = {
  user: 'admin',
  database: 'fsd',
  password: 'admin123',
  // host: 'localhost',
  host: '192.168.159.128',
  port: '27017'
}
const client = new MongoClient(`mongodb://${config.user}:${config.password}@${config.host}:${config.port}`)
var dbEngine = null

function initMongo() {
  try {
    client.connect(async function(err, db) {
      if (err) throw err
      else {
        dbEngine = db.db(config.database)
        if (!dbEngine) return console.log('未创建数据库fsd')
        const coll = dbEngine.collection("fsd_file")
        if (!coll) {
          await dbEngine.createCollection("fsd_file", function(err, res) {
            if (err) throw err
          })
        }
        await coll.createIndex({file_id: 1}, {unique: true}, function(err, res) {
          if (err) throw err
          console.log(err, res)
        })
        console.log('连接mongo成功')
      }
    })
  } catch (err) {
    console.log('连接mongo失败:', err)
    console.log(err)
    errLog(err.stack)
  }
}

const File = {
  save: data => {
    return new Promise(resolve=>{
      return new Promise(async resolve=>{
        try {
          if (!dbEngine) return resolve({code:-1,msg:'database not created',data:[]})
          await dbEngine.collection("fsd_file").insertOne(data, function(err, result) {
            if (err) throw err
            console.log(result)
            resolve({code:0,msg:'success',data:result})
          })
        } catch (err) {
          console.log(err)
          errLog(err.stack)
          resolve({code:-1,msg:err.message,data:[]})
        }
      })
    })
  },
  getById: (file_id) => {
    return new Promise(async resolve=>{
      try {
        if (!dbEngine) return resolve({code:-1,msg:'database not created',data:[]})
        await dbEngine.collection("fsd_file").find({file_id: file_id}, function(err, result) {
          if (err) throw err
          console.log(result)
          resolve({code:0,msg:'success',data:result})
        })
      } catch (err) {
        console.log(err)
        errLog(err.stack)
        resolve({code:-1,msg:err.message,data:[]})
      }
    })
  },
  getAll: () => {
    return new Promise(async resolve => {
      try {
        if (!dbEngine) return resolve({code:-1,msg:'database not created',data:[]})
        await dbEngine.collection("fsd_file").find({}).toArray(function(err, result) {
          if (err) throw err
          console.log(result)
          resolve({code:0,msg:'success',data:result})
        })
      } catch (err) {
        console.log(err)
        errLog(err.stack)
        resolve({code:-1,msg:err.message,data:[]})
      }
    })
  }
}

export {
  initMongo,
  File
}

