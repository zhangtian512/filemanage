<template>
  <div class="filelist-wrapper" v-loading="loading">
    <!-- 目录邮件菜单  -->
    <ContextMenu
      v-if="showContextMenu"
      ref="refRightMenu"
      :show.sync="showContextMenu"
      :position="rightMenuPosition"
      :menu-items="treeRightMenuItems"
      @item-click="rightMenuItemClick"/>
    <!-- 表格邮件菜单  -->
    <ContextMenu
      v-if="showTblContextMenu"
      ref="refTblRightMenu"
      :show.sync="showTblContextMenu"
      :position="rightMenuPosition"
      :menu-items="tblRightMenuItems"
      @item-click="rightMenuItemClick"/>
    <div id="left-area" style="width:320px;height:100%;padding:0px 10px 20px 20px;border-radius:12px;box-sizing:border-box;">
      <el-tree
        ref="tree"
        :node-key="'id'"
        :data="dirTreeData"
        :expand-on-click-node="false"
        :default-expanded-keys="expandedKeys"
        :auto-expand-parent="false"
        highlight-current
        style="box-shadow:0 0 5px 2px rgba(204, 216, 228, 1);"
        @node-click="nodeClick"
        @node-contextmenu="nodeRightClick"
        @node-expand="nodeExpand"
        @node-collapse="nodeCollapse">
        <div slot-scope="{ data }">
          <div style="display:flex;align-items:center;">
            <div v-if="data.children" class="icon-folder" style="margin-right:8px;"></div>
            <!-- <div v-else class="icon-file" style="margin-right:5px"></div> -->
            <Tooltip :tips="data.name" style="width:200px">
              <span style="font-size:18px;">{{ data.name }}</span>
            </Tooltip>
          </div>
        </div>
      </el-tree>
    </div>
    <!-- <div id="drag-line" style="height:50px;width:8px;background-color:#2471c3;border-radius:4px;cursor:w-resize;"></div> -->
    <div id="right-area" style="width:calc(100% - 328px);height:100%;display:flex;flex-direction:column;box-sizing:border-box;padding:0px 20px 20px 10px;">
      <div class="tool-bar">
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">文件类型</div>
          <el-input v-model.trim="filter['文件类型']" @input="search" placeholder="请输入" size="small" style="width:100px"></el-input>
        </div>
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">采集设备</div>
          <el-input v-model.trim="filter['采集设备']" @input="search" placeholder="请输入" size="small" style="width:100px"></el-input>
        </div>
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">任务来源</div>
          <el-input v-model.trim="filter['任务来源']" @input="search" placeholder="请输入" size="small" style="width:100px"></el-input>
        </div>
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">目标类型</div>
          <el-input v-model.trim="filter['目标类型']" @input="search" placeholder="请输入" size="small" style="width:100px"></el-input>
        </div>
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">场景类型</div>
          <el-input v-model.trim="filter['场景类型']" @input="search" placeholder="请输入" size="small" style="width:120px"></el-input>
        </div>
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">分辨率</div>
          <el-input v-model.trim="filter['分辨率']" @input="search" placeholder="请输入" size="small" style="width:120px"></el-input>
        </div>
      </div>
      <div class="tool-bar">
        <div style="display:flex;align-items:center;margin-right:10px;">
          <div style="font-size:17px;margin-right:8px">采集时间</div>
          <el-date-picker v-model="filter['采集时间']" @change="search" type="datetimerange" size="small" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
        </div>
        <div style="position:relative;width:200px">
          <div class="icon-search"></div>
          <el-input v-model.trim="filter.search"
            @input="search" class="search-input" placeholder="关键字搜索" size="small"></el-input>
        </div>
      </div>
      <TableCard style="border-radius:12px;padding:0px;box-shadow:0 0 10px 5px rgba(204, 216, 228, 1);">
        <template slot="title">
          <div style="display:flex;align-items:center;margin-left:20px">
            <div style="display:flex;">
              <div>当前路径：</div>
              <Tooltip :tips="currDirLabel" style="max-width:700px">
                <span>{{ currDirLabel }}</span>
              </Tooltip>
            </div>
            <div style="width:1px;height:24px;background-color:var(--c_gray);margin:0px 20px"></div>
            <div>{{ `文件列表(${filteredData.length})` }}</div>
          </div>
        </template>
        <template slot="titleRight">
          <div style="display:flex;align-items:center;margin-right:20px">
            <Button type="primary" @click="del" size="mini" :borderRadius="'24px'"
              style="padding:12px 24px 9px 24px;margin-right:20px;border:none;background:linear-gradient(to bottom right, rgba(146,167,188,0.7),rgba(146,167,188,1));box-shadow:0px 2px 1px 0px rgb(103,127,163);">
              <div style="margin-right:16px" class="icon-close"></div>
              <span style="color:#fff;font-size:19px;font-weight:700;">删除</span>
            </Button>
            <Dialog
              v-if="delShow"
              :show="delShow"
              :title="'系统提示'"
              :width="400"
              :loading="delLoading"
              showDefaultFooterContent
              @close="delShow=false"
              @cancel="delShow=false"
              @confirm="delConfirm">
              <div style="padding: 18px 20px;">
                <div style="font-size:18px;">确定要删除文件吗?</div>
              </div>
            </Dialog>
            <Button type="primary" @click="download" size="mini" :borderRadius="'24px'"
            style="padding:11px 24px 8px 24px;margin-right:20px;border:none;background:linear-gradient(to bottom right, rgba(5,85,170,0.7),rgba(5,85,170,1));box-shadow:0px 2px 1px 0px rgb(0,61,128);">
              <div style="margin-right:16px" class="icon-download-white"></div>
              <span style="color:#fff;font-size:19px;font-weight:700;">下载</span>
            </Button>
            <Button type="primary" @click="uploadDialogShow=true" size="mini" :borderRadius="'24px'"
            style="padding:11px 24px 8px 24px;margin-right:20px;border:none;background:linear-gradient(to bottom right, rgba(8,164,161,0.7),rgba(8,164,161,1));box-shadow:0px 2px 1px 0px rgb(4,126,127);">
              <div style="margin-right:16px" class="icon-upload-white"></div>
              <span style="color:#fff;font-size:19px;font-weight:700;">上传</span>
            </Button>
          </div>
        </template>
        <el-table
          ref="fileTable"
          :data="pagedData"
          :row-style="{height:'48px'}"
          :cell-class-name="cellClassName"
          height="100%"
          size="mini"
          style="width:100%;" 
          tooltip-effect="light" empty-text=""
          stripe
          @selection-change="selectChange"
          @sort-change="sortChange"
          @row-contextmenu="tblRowRightClick">
          <el-table-column type="selection" width="50"/>
          <el-table-column fixed prop="file_name" label="文件名" show-overflow-tooltip :align="'center'" sortable="custom" width="180"/>
          <el-table-column prop="file_size" label="文件大小" :formatter="fileSizeFmt" show-overflow-tooltip :align="'center'" sortable="custom" min-width="111"/>
          <el-table-column prop="file_type" label="文件类型" show-overflow-tooltip :align="'center'" sortable="custom" min-width="111"/>
          <el-table-column v-for="label in labels.filter(item=>item.is_default)" :key="label.id" :prop="label.name" :label="label.name" :align="'center'" sortable="custom" min-width="111">
            <template slot-scope="{row}">
              <div style="display:flex">
                <Tooltip :tips="calcRowVal(row.file_info, label.name, label.type)">
                  <span>{{ calcRowVal(row.file_info, label.name, label.type) }}</span>
                </Tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-for="label in labels.filter(item=>!item.is_default)" :key="label.id" :prop="label.name" :label="label.name" :align="'center'" sortable="custom" min-width="175">
            <template slot-scope="{row}">
              <div style="display:flex">
                <Tooltip :tips="calcRowVal(row.file_info, label.name, label.type)">
                  <span>{{ calcRowVal(row.file_info, label.name, label.type) }}</span>
                </Tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <template slot="footer">
          <el-pagination
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="currPage"
            :page-sizes="[12,24,40,80]"
            :page-size="currPageSize"
            layout="total, sizes, prev, pager, next, jumper"
            :total="this.filteredData.length">
          </el-pagination>
        </template>
      </TableCard>
    </div>
    <NewDirDialog v-if="newDirDialogShow" :show.sync="newDirDialogShow" :inputData="contextMenuData" @success="newDirSucc" />
    <DelDirDialog v-if="delDirDialogShow" :show.sync="delDirDialogShow" :inputData="contextMenuData" @success="delDirSucc" />
    <RenameDialog v-if="renameDirDialogShow" :show.sync="renameDirDialogShow" :inputData="contextMenuData" @success="renameDirSucc"/>
    <DownloadDialog v-if="downloadDialogShow" :show.sync="downloadDialogShow" :files="selectedRow"/>
    <UploadDialog v-if="uploadDialogShow" :show.sync="uploadDialogShow" :currSelDir="currSelPath" :currSelDirId="currentDir.id"/>
    <PreviewDialog v-if="previewDialogShow" :show.sync="previewDialogShow" :url="previewUrl" :type="previewType" :data-type="previewDataType"/>
    <EditVideo v-if="editVideoDialogShow" :show.sync="editVideoDialogShow" :src="editUrl" :type="editType"/>
  </div>
</template>
  
<script>
import {Dir,File,Label} from '@/db/pg.js'
import { presignedGetObject } from '@/db/minio.js'
import NewDirDialog from './NewDirDialog.vue'
import DelDirDialog from './DelDirDialog.vue'
import RenameDialog from './RenameDialog.vue'
import DownloadDialog from './DownloadDialog.vue'
import PreviewDialog from './PreviewDialog.vue'
import EditVideo from './EditVideo.vue'
import UploadDialog from './UploadDialog.vue'
import { listToTree,fmtDate,calcFileSize } from '@/util/index.js'
import { PubSub } from '@/func/pubsub.js'
import { playVideoOnline,showPicOnline,editVideoOnline } from '@/func/index.js'
// 双击
const n = {
	count: 0,
	prev: null,
	timer: null
}
const dbClicks = (node, id, cb) => {
  n.count++
  if ((n.prev === node[id]) && n.count >= 2) cb()
  n.prev = node[id]
  n.timer = setTimeout(_ => {
    n.count = 0
    n.prev = null
  }, 300)
}
export default {
  name: '',
  components: {NewDirDialog,DelDirDialog,RenameDialog,DownloadDialog,UploadDialog,PreviewDialog,EditVideo},
  props: {},
  data () {
    return {
      loading: false,
      showContextMenu: false,
      rightMenuPosition: {},
      showTblContextMenu: false,
      dirTreeData: [],
      currNodeKey: null,
      expandedKeys: [],
      contextMenuData: null,
      currentDir: null,
      newDirDialogShow: false,
      delDirDialogShow: false,
      renameDirDialogShow: false,
      filter: {
        search: ''
      },
      sortRule: {
        prop: null,
        order: null
      },
      selectedRow: [],
      currPage: 1,
      currPageSize: 12,
      labels: [],
      fileList: [],
      filteredData: [],
      pagedData: [],
      delLoading: false,
      delShow: false,
      downloadDialogShow: false,
      uploadDialogShow: false,
      previewDialogShow: false,
      previewUrl: '',
      previewType: '',
      previewDataType: '',
      editVideoDialogShow: false,
      editUrl: '',
      editType: ''
    }
  },
  async mounted () {
    this.registerDragAction()
    PubSub.subscribe('refresh', (msg, data) => {
      console.log(`收到refresh信息 msg:${msg} data:${data}`)
      this.getDirFiles()
    })
  },
  async created () {
    this.loading = true
    this.getLabels()
    await this.initDir(this.$route.query.dir)
    await this.getDirFiles()
    this.$nextTick(() => {
      // 解决固定表头错位问题
      this.$refs.fileTable.doLayout()
      // 记忆选中的目录
      this.changeToNode(this.$store.state.common.currNodeKey)
      // 记忆展开的目录
      this.expandedKeys = JSON.parse(JSON.stringify(this.$store.state.common.expandedTreeKeys))
      this.loading = false
    })
  },
  beforeDestroy() {
    this.$store.commit('common/setCurrNodeKey', this.currNodeKey)
  },
  watch: {
    dirTreeData(val) {
      console.log('dirTreeData:', val)
    }
  },
  computed: {
    treeRightMenuItems() {
      let res = [
        {value: 'newdir',label: '新建目录'}
      ]
      if (this.contextMenuData) {
        if (this.contextMenuData.data.id !== 1) {
          res.push({value: 'deldir',label: '删除目录'})
          res.push({value: 'renamedir',label: '重命名'})
        }
      }
      return res
    },
    tblRightMenuItems() {
      let res = []
      if (this.contextMenuData) {
        const index = this.contextMenuData.file_name.lastIndexOf('.')
        const len = this.contextMenuData.file_name.length
        const suffix = this.contextMenuData.file_name.substring(index+1,len)
        const isPic = ['jpg','jpeg','bmp','png','gif'].includes(suffix)
        const isVideo = ['mp4','avi','rmvb','mov','mkv'].includes(suffix)
        if (isPic || isVideo) {
          res.push({value: 'preview',label: '预览'})
        }
        if (isVideo) {
          res.push({value: 'editvideo',label: '编辑'})
        }
      }
      return res
    },
    options() {
      return {}
    },
    currSelPath() {
      let res = ''
      if (this.dirTreeData[0] && this.currentDir) {
        res = this.buildNodePath(this.dirTreeData[0], this.currentDir)
      }
      // console.log('currSelPath:', res)
      return res
    },
    currDirLabel() {
      if (this.currSelPath === '') return '/'
      else return `${this.currSelPath.substring(0,this.currSelPath.length-1)}`
    }
  },
  methods: {
    fileSizeFmt(row, column, cellValue, index) {
      return calcFileSize(cellValue)
    },
    timeFormat(row, column, cellValue, index) {
      return fmtDate(cellValue, 'YYYY-mm-dd HH:MM:SS')
    },
    cellClassName(row) {
      // console.log(row)
      const labelNum = this.labels.length
      if (labelNum>0 && row.column.label !== this.labels[labelNum-1].name) return 'col-seperate'
      return ''
    },
    // 注册拖动事件
    registerDragAction() {
      const left = document.getElementById('left-area')
      const dragLine = document.getElementById('drag-line')
      const right = document.getElementById('right-area')
      const maxOffset = 250
      if (!dragLine) return
      dragLine.onmousedown = e => {
        const initLeftWidth = left.clientWidth
        const initRightWidth = right.clientWidth
        console.log('initLeftWidth initRightWidth ',initLeftWidth,initRightWidth)
        const mouseStartDistanceToWindowLeft = e.clientX
        // 左边拖拽区域添加mousemove事件，并不断计算各区域宽度
        document.onmousemove = e => {
          const mouseFinalDistanceToWindowLeft = e.clientX
          // 获取鼠标移动的距离
          let mouseMovedDistance = mouseFinalDistanceToWindowLeft - mouseStartDistanceToWindowLeft
          // 各种计算距离和宽度
          let currLeftDistance = initLeftWidth + mouseMovedDistance
          if (currLeftDistance<320) currLeftDistance = 320
          if (currLeftDistance>(320+maxOffset)) currLeftDistance = (320+maxOffset)
          dragLine.style.left = currLeftDistance
          left.style.width = currLeftDistance + 'px'
          let currRightDistance = initRightWidth - mouseMovedDistance
          if (currRightDistance<(1592-maxOffset)) currRightDistance = (1592-maxOffset)
          if (currRightDistance>1592) currRightDistance = 1592
          console.log('currLeftDistance currRightDistance ',currLeftDistance,currRightDistance)
          right.style.width = currRightDistance + 'px'
        }
        // 释放指针，否则松开鼠标左键后仍会拖动元素
        document.onmouseup = function() {
          document.onmousemove = null
          document.onmouseup = null
          dragLine.releaseCapture && dragLine.releaseCapture()
        }
        dragLine.setCapture && dragLine.setCapture()
        return false
      }
    },
    calcRowVal(file_info, label, label_type) {
      // console.log(file_info, label, label_type)
      if (!file_info[label] || !file_info[label].value) return ''
      const value = file_info[label].value
      if (label_type === 'string' || label_type === 'number') return value
      if (label_type === 'date') return fmtDate(value, 'YYYY-mm-dd HH:MM:SS')
      return value
    },
    appendTreeNode(root, parent, newNode) {
      if (root.id === parent.id) {
        this.$nextTick(() => {
          this.$refs.tree.append(newNode, parent.id)
        })
        return
      }
      if (root.children) {
        for(const node of root.children) {
          this.appendTreeNode(node, parent, newNode)
        }
      }
      return
    },
    removeTreeNode(root, target) {
      if (root.id === target.id) {
        this.$nextTick(() => {
          this.$refs.tree.remove(root)
        })
        return
      }
      if (root.children) {
        for(const node of root.children) {
          this.removeTreeNode(node, target)
        }
      }
      return
    },
    renameTreeNode(root, target) {
      if (root.id === target.id) {
        root.name = target.name
        return
      }
      if (root.children) {
        for(const node of root.children) {
          this.renameTreeNode(node, target)
        }
      }
      return
    },
    // 每一层单独排序
    sortTree(root) {
      let children = root.children
      if (children) {
        children.sort((a,b) => {
          return a.name.localeCompare(b.name)
        })
        for (const child of children) {
          this.sortTree(child)
        }
      }
    },
    // 将一个节点的全路径绘制出来
    buildNodePath(root, target) {
      if (!target || target.name==='/' || !root.children) return ''
      const rootPath = (root.name==='/'||root.name==='')?'':`${root.name}/`
      if (root.id === target.id) return rootPath
      for (const child of root.children) {
        const path = this.buildNodePath(child, target)
        if (path) return `${rootPath}${path}`
      }
      return ''
    },
    // 根据全路径寻找dir_id
    findDirByFullPath(parent, parentFullPath, targetPath) {
      // console.log('findDirByFullPath:',parent, parentFullPath, targetPath)

      // 识别斜杠和空字符串的情况
      let pPath = (!parentFullPath||parentFullPath==='/')?'':`${parentFullPath}/`

      if (parent.name===targetPath || `${parent.name}/`===targetPath) return parent
      if (!parent.children || parent.children.length===0) return null
      for (const child of parent.children) {
        const path = `${pPath}${child.name}`
        if (path===targetPath || `${path}/`===targetPath) return child
        const res = this.findDirByFullPath(child,path,targetPath)
        if (res) return res
      }
      return null
    },
    findDirById(root, id) {
      console.log('findDirById:',root.id,root.name,id)
      if (!root || !id) return null
      if (root.id === id) return root
      for (const child of root.children) {
        if (child.id === id) return child
        const res = this.findDirById(child, id)
        if (res) return res
      }
      return null
    },
    nodeClick(data,node,component) {
      console.log(data,node,component)
      this.showContextMenu = false
      this.currentDir = data
      this.currNodeKey = data.id
      // 双击展开收起
      dbClicks(node, 'id', () => {
        console.log('dbClicks:', node.expanded)
        node.expanded = !node.expanded
        this.$nextTick(() => {
          this.expandedKeys = this.getExpandedKeys(this.$refs.tree.root)
          this.$store.commit('common/setExpandedTreeKeys', this.expandedKeys)
        })
      })
      this.getDirFiles()
    },
    nodeRightClick(event,data,node,component) {
      console.log('nodeRightClick:',event,data,node,component)
      this.contextMenuData = node
      this.rightMenuPosition = {
        left: event.clientX+'px',
        top: event.clientY+'px'
      }
      this.$nextTick(() => {
        this.showContextMenu = true
      })
    },
    nodeExpand(data,node,component) {
      // console.log('nodeExpand:',data,node)
      this.$nextTick(() => {
        this.expandedKeys = this.getExpandedKeys(this.$refs.tree.root)
        this.$store.commit('common/setExpandedTreeKeys', this.expandedKeys)
      })
    },
    nodeCollapse(data,node,component) {
      // console.log('nodeCollapse:',data,node)
      this.$nextTick(() => {
        this.expandedKeys = this.getExpandedKeys(this.$refs.tree.root)
        this.$store.commit('common/setExpandedTreeKeys', this.expandedKeys)
      })
    },
    getExpandedKeys(root) {
      let res = []
      if (root.expanded) res.push(root.data.id)
      if (root.childNodes.length > 0) {
        for (const child of root.childNodes) {
          res = res.concat(this.getExpandedKeys(child))
        }
      }
      return res
    },
    tblRowRightClick(row, column, event) {
      this.contextMenuData = row
      this.rightMenuPosition = {
        left: event.clientX+'px',
        top: event.clientY+'px'
      }
      this.showTblContextMenu = true
    },
    async rightMenuItemClick(menuItem) {
      console.log('rightMenuItemClick:',menuItem, this.contextMenuData)
      if (menuItem.value === 'newdir') this.newDirDialogShow = true
      if (menuItem.value === 'deldir') this.delDirDialogShow = true
      if (menuItem.value === 'renamedir') this.renameDirDialogShow = true
      if (menuItem.value === 'preview') {
        const arr = this.contextMenuData.file_name.split('.')
        this.previewDataType = arr[arr.length-1]
        this.previewUrl = await presignedGetObject(this.contextMenuData.file_db_key)
        if (['avi','rmvb','mov','mp4','mkv'].includes(this.previewDataType)) {
          playVideoOnline(this.previewUrl, this.previewDataType)
          return
        }
        if (['jpg','jpeg','bmp','png','gif'].includes(this.previewDataType)) {
          showPicOnline(this.previewUrl, this.previewDataType)
          return
        }

        // if (['mp4'].includes(this.previewDataType)) this.previewType = 'video'
        // if (['jpg','jpeg','bmp','png','svg','gif'].includes(this.previewDataType)) this.previewType = 'pic'
        // this.previewDialogShow = true
      }
      if (menuItem.value === 'editvideo') {
        const arr = this.contextMenuData.file_name.split('.')
        this.editType = arr[arr.length-1]
        this.editUrl = await presignedGetObject(this.contextMenuData.file_db_key)
        editVideoOnline(this.editUrl, this.editType)
        return
        // this.editType = this.contextMenuData.file_type
        // this.editVideoDialogShow = true
      }
    },
    newDirSucc(newDir,parentId) {
      console.log(newDir,parentId)
      // 更新树节点
      this.appendTreeNode(this.dirTreeData[0], {id:parentId}, newDir)
      // 更新全局变量
      const dirData = JSON.parse(JSON.stringify(this.$store.state.common.dirData))
      dirData.push(newDir)
      this.$store.commit('common/setDirData', dirData)
      this.$store.commit('common/setDirTreeData', JSON.parse(JSON.stringify(this.dirTreeData)))

      this.currentDir = newDir
      // 选中并展开新建的节点
      this.$nextTick(() => {
        this.expandNode(newDir.id)
      })
    },
    async delDirSucc(target, ids) {
      // console.log('delDirSucc:', target.id, ids)
      // 更新树节点
      this.removeTreeNode(this.dirTreeData[0], {id:target.id})
      // 更新全局变量
      let dirData = JSON.parse(JSON.stringify(this.$store.state.common.dirData))
      dirData = dirData.filter(item => {return !ids.includes(item.id)})
      this.$store.commit('common/setDirData', dirData)
      this.$store.commit('common/setDirTreeData', JSON.parse(JSON.stringify(this.dirTreeData)))
    },
    renameDirSucc(target) {
      console.log(target)
      // 更新树节点
      this.renameTreeNode(this.dirTreeData[0], target)
      // 更新全局变量
      const dirData = JSON.parse(JSON.stringify(this.$store.state.common.dirData))
      dirData.forEach(node => {
        if (node.id === target.id) node.name = target.name
      })
      this.$store.commit('common/setDirData', dirData)
      this.$store.commit('common/setDirTreeData', JSON.parse(JSON.stringify(this.dirTreeData)))

      this.currentDir = target
    },
    changeToNode(id) {
      if (!id) return
      this.$refs.tree.setCurrentKey(id)
      const node = this.$refs.tree.getNode(id)
      console.log('changeToNode:', node)
      if (node) this.nodeClick(node.data,node,null)
    },
    naviToDir(dirId) {
      console.log('naviToDir:', dirId)
      if (!dirId) this.currentDir = this.dirTreeData[0]
      else {
        const res = this.findDirById(this.dirTreeData[0], Number(dirId))
        console.log('findDirById:',res)
        if (res) {
          this.currentDir = res
          this.expandNode(res.id)
        } else this.$message.warning(`未找到指定目录`)
      }
    },
    expandNode(id) {
      // 展开节点要把它的父级节点都展开
      // console.log('expandNode:', id)
      if (this.$refs.tree) {
        this.$refs.tree.setCurrentKey(id)
        const node = this.$refs.tree.getNode(id)
        if (node) {
          const parentNode = this.$refs.tree.getNode(node.parent.data.id)
          if (parentNode) this.expandNode(parentNode.data.id)
          node.expanded = true
        }
      }
    },
    search() {
      console.log('this.filter:', this.filter)
      this.loading = true
      this.currPage = 1
      this.filterData()
      this.loading = false
    },
    async delConfirm() {
      this.delLoading = true
      for (const item of this.selectedRow) {
        await File.deleteByPk(item.file_id, item.file_path, item.file_dir_id).then(res => {
          if (res.code !== 0) this.$message.error(`删除文件失败:${res.msg}`)
        })
      }
      this.delLoading = false
      this.delShow = false
      this.getDirFiles()
    },
    del() {
      if (this.selectedRow.length === 0) return this.$message.warning('请选择文件')
      this.delShow = true
    },
    download() {
      if (this.selectedRow.length === 0) return this.$message.warning('请选择文件')
      this.downloadDialogShow = true
    },
    selectChange(e) {
      // console.log(e)
      this.selectedRow = e
    },
    handleSizeChange(e) {
      this.currPageSize = e
      this.currPage = 1
      this.filterData()
    },
    handleCurrentChange(e) {
      this.currPage = e
      this.filterData()
    },
    sortChange(e) {
      console.log('sortChange:', e)
      this.sortRule.prop = e.prop
      this.sortRule.order = e.order
      this.filterData()
    },
    initDir(initDir=null) {
      return new Promise(resolve => {
        Dir.getAll().then(res => {
          if (res.code !== 0) this.$message.error(`初始化目录失败:${res.msg}`)
          else {
            this.$store.commit('common/setDirData', JSON.parse(JSON.stringify(res.data)))
            this.dirTreeData = listToTree(JSON.parse(JSON.stringify(res.data)), {id:'id',children:'children',pid:'parent'})
            this.sortTree(this.dirTreeData[0])
            this.$store.commit('common/setDirTreeData', JSON.parse(JSON.stringify(this.dirTreeData)))
            console.log('dirTreeData:', this.dirTreeData[0])
            this.$nextTick(() => {
              if (initDir) this.naviToDir(initDir)
              else this.currentDir = this.dirTreeData[0]
            })
          }
        }).catch(err => {
          this.$message.error(`初始化目录失败:${err}`)
        }).finally(() => {resolve()})
      })
    },
    getLabels() {
      Label.getAll().then(res => {
        if (res.code !== 0) this.$message.error(`获取标签失败:${res.msg}`)
        else {
          this.labels = res.data
        }
      }).catch(err => {
        console.log(err)
        this.$message.error(`获取标签失败:${err}`)
      })
    },
    getDirFiles() {
      return new Promise(resolve => {
        File.getAll().then(res => {
          if (res.code !== 0) this.$message.error(`获取文件列表失败:${res.msg}`)
          else {
            this.fileList = res.data.map(item => {
              if (item.file_size) item.file_size = parseInt(item.file_size)
              if (item.file_info) item.file_info = JSON.parse(item.file_info)
              return item
            })
            console.log("this.fileList:", this.fileList)
            this.filterData()
          }
        }).catch(err => {
          console.log(err)
          this.$message.error(`获取文件列表失败:${err}`)
        }).finally(() => {resolve()})
      })
      
    },
    filterData() {
      // 先过滤掉非当前目录的文件
      let sortedData = JSON.parse(JSON.stringify(this.fileList)).filter(file => {
        if (this.currentDir) return file.file_dir_id === this.currentDir.id
        return file.file_dir_id === 1
      })
      if (this.sortRule.prop && this.sortRule.order) {
        sortedData.sort((a,b) => {
          if(this.sortRule.prop === 'file_name' || this.sortRule.prop === 'file_type') {
            if (this.sortRule.order === 'ascending') return a[this.sortRule.prop].localeCompare(b[this.sortRule.prop])
            if (this.sortRule.order === 'descending') return b[this.sortRule.prop].localeCompare(a[this.sortRule.prop])
          } else if(this.sortRule.prop === 'file_size') {
            if (this.sortRule.order === 'ascending') return a[this.sortRule.prop]-b[this.sortRule.prop]
            if (this.sortRule.order === 'descending') return b[this.sortRule.prop]-a[this.sortRule.prop]
          } else {
            const propType = this.labels.find(item => item.name===this.sortRule.prop)
            if (!propType) return 0
            const row_a = a.file_info[this.sortRule.prop]
            const row_b = b.file_info[this.sortRule.prop]
            if (!row_a && !row_b) return 0
            if (!row_a && row_b) {
              if (this.sortRule.order === 'ascending') return -1
              if (this.sortRule.order === 'descending') return 1
            }
            if (row_a && !row_b) {
              if (this.sortRule.order === 'ascending') return 1
              if (this.sortRule.order === 'descending') return -1
            }
            const val_a = a.file_info[this.sortRule.prop].value
            const val_b = b.file_info[this.sortRule.prop].value
            if (!val_a && !val_b) return 0
            if (!val_a && val_b) {
              if (this.sortRule.order === 'ascending') return -1
              if (this.sortRule.order === 'descending') return 1
            }
            if (val_a && !val_b) {
              if (this.sortRule.order === 'ascending') return 1
              if (this.sortRule.order === 'descending') return -1
            }
            if (propType.type === 'string') {
              if (this.sortRule.order === 'ascending') return val_a.localeCompare(val_b)
              if (this.sortRule.order === 'descending') return val_b.localeCompare(val_a)
            }
            if (propType.type === 'number') {
              const num_a = Number(val_a)
              const num_b = Number(val_b)
              if (this.sortRule.order === 'ascending') return num_a-num_b
              if (this.sortRule.order === 'descending') return num_b-num_a
            }
            if (propType.type === 'date') {
              const date_a = new Date(val_a).getTime()
              const date_b = new Date(val_b).getTime()
              if (this.sortRule.order === 'ascending') return date_a-date_b
              if (this.sortRule.order === 'descending') return date_b-date_a
            }
          }
        })
      }
      this.filteredData = sortedData.filter(file => {
        // 下拉选框过滤
        const filterKeys = Object.keys(this.filter)
        for(const filterKey of filterKeys) {
          if (!this.filter[filterKey]) continue
          // 按照名称、文件类型和所有标签搜索
          if (filterKey === 'search' && this.filter.search) {
            let found = false
            if (file.file_name.includes(this.filter.search)) found = true
            if (file.file_type.includes(this.filter.search)) found = true
            for (const label of this.labels) {
              if (file.file_info[label.name] && file.file_info[label.name].value) {
                if (file.file_info[label.name].value.includes(this.filter.search)) found = true
              }
            }
            if (!found) return false
          }
          if (filterKey === '文件类型') {
            if (!file.file_type.includes(this.filter[filterKey])) return false
          }
          if (['采集设备','任务来源','目标类型','场景类型','分辨率'].includes(filterKey)) {
            if (file.file_info[filterKey] && file.file_info[filterKey].value) {
              // console.log(file.file_info[filterKey].value, this.filter[filterKey])
              if (!file.file_info[filterKey].value.includes(this.filter[filterKey])) return false
            } else return false
          }
          if (['采集时间'].includes(filterKey)) {
            console.log(file.file_info[filterKey], this.filter[filterKey])
            if (file.file_info[filterKey] && file.file_info[filterKey].value) {
              const start = new Date(this.filter[filterKey][0]).getTime()
              const end = new Date(this.filter[filterKey][1]).getTime()
              const time = new Date(file.file_info[filterKey].value).getTime()
              if (time < start || time > end) return false
            } else return false
          }
        }
        return true
      })
      console.log('filteredData:', this.filteredData)
      const start = (this.currPage-1)*this.currPageSize
      const end = start+this.currPageSize
      this.pagedData = this.filteredData.slice(start,end)
    }
  }
}
</script>
  
<style lang='scss' scoped>
.filelist-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  .el-tree {
    height: 100%;
    overflow-y: auto;
    background-color: #FAFAFA;
    box-sizing: border-box;
    border-radius: 12px;
    // margin: 0px 6px;
    padding: 10px 0px;
    -webkit-app-region: no-drag;
  }

  .el-tree::-webkit-scrollbar {
    width: 8px;
    background-color: var(--c_white);
  }
  .el-tree::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background-color: var(--c_webkit-scrollbar-thumb);
  }
  /deep/ .el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
    background-color: #e5f6ff;
  }
  /deep/ .el-tree-node__content {
    padding-bottom: 5px;
  }
  /deep/ .el-tree-node__content:hover {
    background-color: #e5f6ff;
  }
  /deep/ .el-tree-node__content:focus {
    outline: none;
  }
  /deep/ .col-seperate {
    border-right: 1px solid rgb(214,221,231) !important;
  }
  .tool-bar {
    width: auto;
    height: 60px;
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: bold;
    border-bottom: 1px solid #E7E7E7;
    box-sizing: border-box;
    // padding: 0px 20px;
    .search-input {
      /deep/ .el-input__inner {
        padding: 0px 8px 0px 32px;
      }
    }
    .icon-search {
      position: absolute;
      left: 4px;
      top: 4px;
      z-index: 1;
      width: 24px;
      height: 24px;
      content: url('~@/assets/icons/icon-search.svg')
    }
  }
  .tb-card{
    flex: 1;
    position: relative;
  }
  .icon-close {
    width: 24px;
    height: 24px;
    content: url('~@/assets/icons/close-white.svg')
  }
  .icon-upload-white {
    width: 23px;
    height: 23px;
    content: url('~@/assets/icons/icon-upload-white.svg')
  }
  .icon-download-white {
    width: 23px;
    height: 23px;
    content: url('~@/assets/icons/icon-download-white.svg')
  }
  .icon-folder {
    width: 32px;
    height: 32px;
    content: url('~@/assets/icons/icon-folder.svg')
  }
}
</style>