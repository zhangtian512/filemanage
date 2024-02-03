import { removeObjects } from '../../db/minio.js'
import { Task } from '../../db/pg.js'
import { fmtDate,rmDir } from '../../util/index.js'
import path from 'path'

const state = {
  dirData: [],
  dirTreeData: [],
  currNodeKey: null,
  expandedTreeKeys: [],
  tasks: []
}

const getters = {}

const mutations = {
  setDirData (state, payload) {
    state.dirData = payload
  },
  setDirTreeData (state, payload) {
    state.dirTreeData = payload
  },
  setCurrNodeKey (state, payload) {
    console.log('setCurrNodeKey:', payload)
    state.currNodeKey = payload
  },
  setExpandedTreeKeys (state, payload) {
    console.log('setExpandedTreeKeys:', payload)
    state.expandedTreeKeys = payload
  },
  clearTasks (state, payload) {
    state.tasks = []
  },
  setTasks (state, payload) {
    console.log('setTasks:', payload)
    state.tasks = payload
  },
  appendTasks (state, payload) {
    console.log('appendTasks:', payload)
    if (payload) {
      payload.reverse().forEach(item => {
        state.tasks.unshift(item)
      })
    }
  },
  removeTask (state, payload) {
    console.log('removeTask:', payload)
    if (payload) {
      let ids = []
      let chunkFileNames = []
      payload.forEach(task => {
        let i = -1
        state.tasks.forEach((item,index) => {
          if (item.task_id === task.task_id) i = index
        })
        if (i !== -1) state.tasks.splice(i, 1)
        ids.push(task.task_id)
      })
      Task.delete(ids)
    }
  },
  updateUploadTaskFile (state, payload) {
    console.log(`${payload.task_id} 更新文件:`, payload.file)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) item.file = payload.file
    })
  },
  updateTaskFileSizeAndTotalChunkNum (state, payload) {
    console.log(`${payload.task_id} 更新file_size和total_chunk_num:`, payload.file_size, payload.total_chunk_num)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.file_size = payload.file_size
        item.total_chunk_num = payload.total_chunk_num
        Task.updateFileSize(payload.task_id,payload.file_size)
      }
    })
  },
  updateTaskTotalChunkNum (state, payload) {
    console.log(`${payload.task_id} 更新total_chunk_num:`, payload.total_chunk_num)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) item.total_chunk_num = payload.total_chunk_num
    })
  },
  updateTaskStatus (state, payload) {
    console.log(`${payload.task_id} 更新Status:${payload.status} ${payload.err_msg?'err_msg:'+payload.err_msg:''}`)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.status = payload.status
        if (payload.err_msg) item.err_msg = payload.err_msg
        item.update_time = fmtDate(new Date())
        Task.updateStatus(payload.task_id,payload.status,payload.err_msg)
      }
    })
  },
  setCanceler (state, payload) {
    console.log(`${payload.task_id} 更新canceler:`, payload.canceler)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.canceler = payload.canceler
      }
    })
  },
  updateTaskProgress (state, payload) {
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.finished_chunk_num = payload.finished_chunk_num
        item.progress = Math.round(item.finished_chunk_num*100/item.total_chunk_num)
        console.log(`${payload.task_id} 更新进度:[${payload.finished_chunk_num}/${item.total_chunk_num}]`)
        Task.updateProgress(item.task_id,item.progress)
        // console.log(`${payload.task_id}:上传进度[${item.progress}]`)
      }
    })
  },
  updateUploadTaskFileId (state, payload) {
    console.log(`${payload.task_id} 更新FileId:${payload.file_id}`)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.file_id = payload.file_id
        Task.updateFileId(payload.task_id,payload.file_id)
      }
    })
  },
  updateUploadTaskFileDbKey (state, payload) {
    console.log(`${payload.task_id} 更新file_db_key:${payload.file_db_key}`)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.file_db_key = payload.file_db_key
        Task.updateFileDbKey(payload.task_id,payload.file_db_key)
      }
    })
  },
  completeUploadTask (state, payload) {
    console.log(`${payload.task_id} 完成上传任务`)
    state.tasks.forEach(item => {
      if (item.task_id === payload.task_id) {
        item.status = 'completed'
        item.update_time = new Date()
        Task.complete(payload.task_id)
      }
    })
  }
}

const actions = {
  ADD_TASK({ commit }, data){
    commit('appendTasks', data)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}