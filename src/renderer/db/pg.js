import { errLog } from './log.js'
import { readConfigFile,writeConfigFile,readLatestMigrateFile } from '../func/index.js'
const fs = require('fs')
var pg = require('pg');

var config = {
  user: 'admin',
  database: 'fsd',
  password: 'admin123',
  host: 'localhost',
  // host: '192.168.159.128',
  port: '5432',
  poolSize: 5,
  poolIdleTimeout: 30000,
  reapIntervalMillis: 10000
}
var pool = null


async function initPg() {
  let migrateDb = false
  // if (process.env.NODE_ENV === 'production') {
    const setting = readConfigFile()
    console.log('setting:', setting)
    if (setting && setting.db) {
      config.user = setting.db.username
      config.password = setting.db.password
      config.host = setting.db.host
      config.port = setting.db.port
      migrateDb = setting.db.migrate_db
    }
    if (migrateDb) {
      setting.db.migrate_db = false
      writeConfigFile(setting)
    }
  // }
  
  await createDb(config)
  pool = new pg.Pool(config)
  if (migrateDb) await migrate()
}

function createDb(config) {
  return new Promise(async resolve=>{
    // 创建Database
    let client = new pg.Client({
      user: config.user,
      host: config.host,
      database: 'postgres', // 连接到默认的postgres数据库以便我们可以创建新的数据库
      password: config.password,
      port: config.port,
    })
    try {
      await client.connect()
    } catch (err) {
      console.log('连接pg失败:', err)
      errLog(err.stack)
      resolve({code:-1,msg:err.message,data:null})
      return
    }
    let res = await query(`SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('fsd');`, client, ()=>{})
    if (res[0]) {
      errLog(res[0].stack)
      console.log('CREATE DATABASE 失败:',res[0])
      resolve({code:-1,msg:res[0].message,data:null})
      return
    }
    if (res[1].rows.length === 0) {
      res = await query(`CREATE DATABASE fsd;`, client, ()=>{})
      if (res[0]) {
        errLog(res[0].stack)
        console.log('CREATE DATABASE 失败:',res[0])
        resolve({code:-1,msg:res[0].message,data:null})
        return
      }
      console.log('database fsd create success')
    }
    client.end()

    // 创建Schema
    client = new pg.Client({
      user: config.user,
      host: config.host,
      database: config.database,
      password: config.password,
      port: config.port,
    })
    try {
      await client.connect()
    } catch (err) {
      console.log('连接pg失败:', err)
      errLog(err.stack)
      resolve({code:-1,msg:err.message,data:null})
      return
    }
    res = await query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'fsd';`, client, ()=>{})
    if (res[0]) {
      errLog(res[0].stack)
      console.log('CREATE SCHEMA 失败:',res[0])
      resolve({code:-1,msg:res[0].message,data:null})
      return
    }
    if (res[1].rows.length === 0) {
      res = await query(`CREATE SCHEMA fsd;`, client, ()=>{})
      if (res[0]) {
        errLog(res[0].stack)
        console.log('CREATE SCHEMA 失败:',res[0])
        resolve({code:-1,msg:res[0].message,data:null})
        return
      }
      console.log('schema fsd create success')
    }
    resolve({code:0,msg:'success',data:res})
    client.end()
  })
}

function migrate() {
  console.log('migrate')
  return new Promise(async resolve=>{
    const sql = await readLatestMigrateFile()
    if (!sql) {
      console.log('migrate sql 为空')
      resolve({code:-1,msg:'migrate sql 为空',data:null})
      return
    }
    pool.connect(function (err, client, done) {
      if (err) {
        errLog(err.stack)
        console.log('连接pg 失败:',err)
        resolve({code:-1,msg:err.message,data:null})
        return
      }
      console.log('migrate sql:', sql)
      client.query(sql, [], function (err, res) {
          done()
          if (err) {
            errLog(err.stack)
            console.log('migrate 失败:',err)
            resolve({code:-1,msg:err.message,data:null})
          } else {
            console.log('migrate 成功')
            resolve({code:0,msg:'success',data:res})
          }
      })
    })
  })
}

function connect() {
  return new Promise(resolve=>{
    // console.log('connect:', pool)
    pool.connect(function (err, client, done) {
      resolve([err, client, done])
    })
  })
}

function query(sql,client,done) {
  return new Promise(resolve=>{
    console.log(sql)
    client.query(sql, [], function (err, res) {
      // console.log(res)
      done()
      resolve([err, res])
    })
  })
}

const User = {
  login: (username,password) => {
    return new Promise(resolve=>{
      const sql = `select count(*) from fsd.fsd_user where username='${username}' and password='${password}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:2,msg:`code:${err.code} msg:${err.message}`,data:err.code})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            if (res.rows[0] && res.rows[0].count > 0) resolve({code:0,msg:'success',data:res.rows})
            else resolve({code:1,msg:'username or password invalid',data:res.rows})
          }
        })
      })
    })
  },
  queryOne: username => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_user where username = '${username}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  },
  updatePass: (username,password) => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_user
                  set password='${password}',update_time='${new Date().toISOString()}'
                  where username='${username}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  }
}

const File = {
  save: data => {
    return new Promise(resolve=>{
      const create_time = data.create_time?new Date(data.create_time).toISOString():new Date().toISOString()
      const sql = `INSERT INTO fsd.fsd_file (file_id,task_id,file_name,file_type,file_size,file_path,file_dir_id,file_db_key,
                  file_info,create_time)
                  VALUES('${data.file_id}','${data.task_id}','${data.file_name}','${data.file_type}',${data.file_size},
                  '${data.file_path}',${data.file_dir_id},'${data.file_db_key}','${data.file_info?data.file_info:''}',
                  '${create_time}')`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  deleteByDirId: ids => {
    return new Promise(resolve=>{
      let idsStr = ""
      for(let i=0,len=ids.length;i<len;i++) {
        const id = ids[i]
        if (i < len-1) idsStr += `'${id}',`
        else idsStr += `'${id}'`
      }
      const sql = `DELETE from fsd.fsd_file where file_dir_id in (${idsStr})`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  deleteByPk: (file_id, file_path, file_dir_id) => {
    return new Promise(resolve=>{
      const sql = `DELETE from fsd.fsd_file where file_id='${file_id}' and file_path='${file_path}' and file_dir_id=${file_dir_id}`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  getById: (file_id) => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_file where file_id = '${file_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  },
  getByKey: (file_db_key) => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_file where file_db_key = '${file_db_key}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  },
  getAll: () => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_file`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  }
}

const Dir = {
  new: data => {
    return new Promise(resolve=>{
      const create_time = data.create_time?new Date(data.create_time).toISOString():new Date().toISOString()
      const update_time = data.update_time?new Date(data.update_time).toISOString():create_time
      const sql = `INSERT INTO fsd.fsd_dir ("name",parent,creator,create_time,update_time)
                  VALUES('${data.name}',${data.parent},'${data.creator}','${create_time}','${update_time}')
                  RETURNING id`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  delete: (ids) => {
    return new Promise(resolve=>{
      let idsStr = ""
      for(let i=0,len=ids.length;i<len;i++) {
        const id = ids[i]
        if (i < len-1) idsStr += `'${id}',`
        else idsStr += `'${id}'`
      }
      const sql = `DELETE from fsd.fsd_dir where id in (${idsStr})`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  update: data => {
    return new Promise(resolve=>{
      const update_time = data.update_time?new Date(data.update_time).toISOString():new Date().toISOString()
      const sql = `UPDATE fsd.fsd_dir
                  set name='${data.name}',parent=${data.parent},creator='${data.creator}',update_time='${update_time}'
                  where id=${data.id}`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  getAll: () => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_dir order by id`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  }
}

const Task = {
  new: data => {
    return new Promise(resolve=>{
      const create_time = data.create_time?new Date(data.create_time).toISOString():new Date().toISOString()
      const sql = `INSERT INTO fsd.fsd_task
                  (task_id,task_type,file_id,file_name,file_type,file_size,file_path,file_dir_id,file_db_key,target_path,
                    file_info,progress,create_time,status,err_msg)
                  VALUES('${data.task_id}','${data.task_type}','${data.file_id}','${data.file_name}','${data.file_type}',
                  ${data.file_size},'${data.file_path}',${data.file_dir_id},'${data.file_db_key}','${data.target_path?data.target_path:''}',
                  '${data.file_info?data.file_info:''}',${data.progress},'${create_time}','${data.status}','${data.err_msg?data.err_msg:''}')
                  RETURNING task_id`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  delete: (ids) => {
    return new Promise(resolve=>{
      let idsStr = ""
      for(let i=0,len=ids.length;i<len;i++) {
        const id = ids[i]
        if (i < len-1) idsStr += `'${id}',`
        else idsStr += `'${id}'`
      }
      const sql = `DELETE from fsd.fsd_task where task_id in (${idsStr})`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  getAll: () => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_task order by create_time desc`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  },
  updateStatus: (task_id, status, err_msg) => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_task set status='${status}',err_msg='${err_msg?err_msg.toString().replace(new RegExp('\'', 'g'), "\'\'"):''}',update_time='${new Date().toISOString()}' where task_id='${task_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  updateFileId: (task_id, file_id) => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_task set file_id='${file_id?file_id:''}' where task_id='${task_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  updateFileDbKey: (task_id, file_db_key) => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_task set file_db_key='${file_db_key?file_db_key:''}' where task_id='${task_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  updateFileSize: (task_id, file_size) => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_task set file_size=${file_size} where task_id='${task_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  updateProgress: (task_id, progress) => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_task set progress=${progress} where task_id='${task_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  complete: task_id => {
    return new Promise(resolve=>{
      const sql = `UPDATE fsd.fsd_task set status='completed',update_time='${new Date().toISOString()}' where task_id='${task_id}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  }
}

const Label = {
  new: data => {
    return new Promise(resolve=>{
      const create_time = data.create_time?new Date(data.create_time).toISOString():new Date().toISOString()
      const update_time = data.update_time?new Date(data.update_time).toISOString():create_time
      const sql = `INSERT INTO fsd.fsd_file_labels ("name","type",is_default,create_time,update_time)
                  VALUES('${data.name}','${data.type}',${data.is_default},'${create_time}','${update_time}')
                  RETURNING id`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  delete: (ids) => {
    return new Promise(resolve=>{
      let idsStr = ""
      for(let i=0,len=ids.length;i<len;i++) {
        const id = ids[i]
        if (i < len-1) idsStr += `${id},`
        else idsStr += `${id}`
      }
      const sql = `DELETE from fsd.fsd_file_labels where id in (${idsStr})`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  update: data => {
    return new Promise(resolve=>{
      const update_time = data.update_time?new Date(data.update_time).toISOString():new Date().toISOString()
      const sql = `UPDATE fsd.fsd_file_labels
                  set name='${data.name}',type='${data.type}',update_time='${update_time}'
                  where id=${data.id}`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  getAll: (orderBy='id', order='') => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_file_labels order by ${orderBy} ${order}`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  }
}

const DOWNLOAD_PATH = {
  new: data => {
    return new Promise(resolve=>{
      const create_time = data.create_time?new Date(data.create_time).toISOString():new Date().toISOString()
      const update_time = data.update_time?new Date(data.update_time).toISOString():create_time
      const sql = `INSERT INTO fsd.fsd_download_path (username,path_type,path_value,create_time,update_time)
                  VALUES('${data.username}','${data.path_type}','${data.path_value}','${create_time}','${update_time}')`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  update: data => {
    return new Promise(resolve=>{
      const update_time = data.update_time?new Date(data.update_time).toISOString():new Date().toISOString()
      const sql = `UPDATE fsd.fsd_download_path
                  set path_type='${data.path_type}',path_value='${data.path_value}',update_time='${update_time}'
                  where username='${data.username}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res})
          }
        })
      })
    })
  },
  queryByUsername: username => {
    return new Promise(resolve=>{
      const sql = `select * from fsd.fsd_download_path where username = '${username}'`
      connect().then(([err, client, done]) => {
        if (err) {
          errLog(err.stack)
          console.log(err)
          resolve({code:-1,msg:err.message,data:null})
          return
        }
        query(sql, client, done).then(([err, res]) => {
          if (err) {
            errLog(err.stack)
            console.log(err)
            resolve({code:err.code,msg:err.message,data:null})
          } else {
            resolve({code:0,msg:'success',data:res.rows})
          }
        })
      })
    })
  }
}

export {
  initPg,
  User,
  File,
  Dir,
  Task,
  Label,
  DOWNLOAD_PATH
}