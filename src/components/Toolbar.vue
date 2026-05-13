<template>
  <div class="toolbar bg-white shadow-sm px-4 py-3 flex items-center gap-4 border-b">
    <!-- 新增按钮 -->
    <el-button type="primary" @click="handleCreate">
      <el-icon><Plus /></el-icon>
      新增任务
    </el-button>

    <!-- 时间范围筛选 -->
    <div class="flex items-center gap-2 ml-6">
      <span class="text-gray-600 text-sm">时间范围:</span>
      <el-date-picker
        v-model="startDate"
        type="date"
        placeholder="开始日期"
        format="YYYY-MM-DD"
        value-format="x"
        :clearable="true"
        size="default"
      />
      <span class="text-gray-400">~</span>
      <el-date-picker
        v-model="endDate"
        type="date"
        placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="x"
        :clearable="true"
        size="default"
      />
      <el-button size="default" @click="handleFilter" :disabled="!startDate || !endDate">
        筛选
      </el-button>
      <el-button size="default" @click="handleReset" :disabled="!timeRangeFilter">
        重置
      </el-button>
    </div>

    <!-- 初始化预设数据 -->
    <el-button type="warning" @click="handleInitPreset" class="ml-4">
      初始化预设数据
    </el-button>

    <!-- 截断持续任务 -->
    <el-button type="info" @click="handleTruncate" class="ml-2">
      截断持续任务
    </el-button>

    <!-- 数据迁移 -->
    <el-button @click="handleExport" class="ml-4">
      导出数据
    </el-button>
    <el-upload
      :show-file-list="false"
      accept=".json"
      :before-upload="handleImport"
      class="ml-2"
    >
      <el-button>导入数据</el-button>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useGanttStore } from '@/stores/ganttStore'
import { dataService } from '@/services/dataService'
import { dateToZeroTimestamp, getTodayZero } from '@/utils/timeUtils'
import { ModalMode } from '@/types'
import { ElMessage } from 'element-plus'
import type { UploadRawFile } from 'element-plus'

const emit = defineEmits<{
  (e: 'openModal', mode: ModalMode): void
  (e: 'openTruncate'): void
}>()

const store = useGanttStore()

// 时间范围选择（默认当前前后一个月）
const startDate = ref<number | null>(null)
const endDate = ref<number | null>(null)

// 当前筛选状态
const timeRangeFilter = computed(() => store.timeRangeFilter)

// 设置默认时间范围（前一个月到后两个月）
function setDefaultTimeRange() {
  const today = getTodayZero()
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000 // 约30天
  startDate.value = today - oneMonthMs
  endDate.value = today + 2 * oneMonthMs

  // 自动应用筛选
  store.setTimeRangeFilter({
    start: dateToZeroTimestamp(startDate.value),
    end: dateToZeroTimestamp(endDate.value)
  })
}

// 组件挂载时设置默认时间范围
onMounted(() => {
  setDefaultTimeRange()
})

// 新增任务
function handleCreate() {
  emit('openModal', ModalMode.CREATE)
}

// 筛选
function handleFilter() {
  if (startDate.value && endDate.value) {
    const start = dateToZeroTimestamp(startDate.value)
    const end = dateToZeroTimestamp(endDate.value)

    if (start >= end) {
      ElMessage.error('开始时间必须小于结束时间')
      return
    }

    store.setTimeRangeFilter({ start, end })
    ElMessage.success('筛选已应用')
  }
}

// 重置筛选（恢复默认）
function handleReset() {
  setDefaultTimeRange()
  ElMessage.success('已恢复默认时间范围')
}

// 初始化预设数据
async function handleInitPreset() {
  try {
    await store.initPreset()
    ElMessage.success('预设数据已加载')
  } catch (error: any) {
    ElMessage.error(error.message || '初始化失败')
  }
}

// 截断持续任务
function handleTruncate() {
  emit('openTruncate')
}

// 导出数据
async function handleExport() {
  try {
    const jsonData = await dataService.exportData()
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gantt_data_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('数据已导出')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  }
}

// 导入数据
async function handleImport(file: UploadRawFile) {
  try {
    const text = await file.text()
    await dataService.importData(text)
    await store.loadAll()
    ElMessage.success('数据已导入')
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败')
  }
  return false // 阻止默认上传行为
}
</script>

<style scoped>
.toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>