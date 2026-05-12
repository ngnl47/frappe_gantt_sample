<template>
  <el-dialog
    v-model="visible"
    title="截断持续任务"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 步骤 1：选择开始时间 -->
    <div v-if="step === 1" class="step-content">
      <div class="mb-4">
        <span class="text-gray-600">筛选开始时间大于等于指定日期的持续任务：</span>
      </div>
      <el-date-picker
        v-model="filterStartDate"
        type="date"
        placeholder="选择开始时间"
        format="YYYY-MM-DD"
        value-format="x"
        :disabled-hours="disabledHours"
        :disabled-minutes="disabledMinutes"
        :disabled-seconds="disabledSeconds"
      />
      <div class="text-gray-400 text-xs mt-2">将持续任务（et=null）且 st >= 该日期的任务筛选出来</div>
    </div>

    <!-- 步骤 2：选择任务并设置结束日期 -->
    <div v-if="step === 2" class="step-content">
      <div v-if="filteredTasks.length === 0" class="text-gray-500 text-center py-8">
        未找到符合条件的持续任务
      </div>
      <div v-else>
        <div class="mb-4">
          <span class="text-gray-600">找到 {{ filteredTasks.length }} 个持续任务，请勾选要截断的任务：</span>
        </div>

        <!-- 设置结束日期 -->
        <div class="mb-4 flex items-center gap-2">
          <span class="text-gray-600">结束日期：</span>
          <el-date-picker
            v-model="endDate"
            type="datetime"
            placeholder="选择结束日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="x"
            :disabled-date="disabledEndDate"
            :disabled-hours="disabledHours"
            :disabled-minutes="disabledMinutes"
            :disabled-seconds="disabledSeconds"
          />
          <span class="text-gray-500 text-xs">14天倍数（当天0点）</span>
        </div>

        <!-- 任务列表 -->
        <el-table :data="filteredTasks" @selection-change="handleSelectionChange" max-height="300">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="k" label="服务器" width="80">
            <template #default="{ row }">{{ row.k }}服</template>
          </el-table-column>
          <el-table-column prop="st" label="开始时间">
            <template #default="{ row }">{{ formatTimestamp(row.st, 'YYYY-MM-DD') }}</template>
          </el-table-column>
          <el-table-column prop="v" label="指向">
            <template #default="{ row }">{{ row.v ? `${row.v}服` : '无' }}</template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">{{ row.type === 1 ? '活动期' : '暂停期' }}</template>
          </el-table-column>
        </el-table>

        <div class="text-gray-500 text-xs mt-2">
          已选择 {{ selectedTasks.length }} 个任务
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="flex justify-between">
        <div>
          <el-button v-if="step === 2" @click="step = 1">上一步</el-button>
        </div>
        <div class="flex gap-2">
          <el-button @click="handleClose">取消</el-button>
          <el-button v-if="step === 1" type="primary" @click="handleNext" :disabled="!filterStartDate">
            下一步
          </el-button>
          <el-button v-if="step === 2" type="primary" @click="handleSubmit" :loading="submitting" :disabled="selectedTasks.length === 0 || !endDate">
            提交
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGanttStore } from '@/stores/ganttStore'
import { ServerMapping } from '@/types'
import { formatTimestamp, dateToZeroTimestamp } from '@/utils/timeUtils'
import { ElMessage } from 'element-plus'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGanttStore()

// 状态
const visible = ref(true)
const step = ref(1)
const submitting = ref(false)

// 步骤 1：筛选开始时间
const filterStartDate = ref<number | null>(null)

// 步骤 2：结束日期和选中的任务
const endDate = ref<number | null>(null)
const selectedTasks = ref<ServerMapping[]>([])

// 筛选出的持续任务
const filteredTasks = computed<ServerMapping[]>(() => {
  if (!filterStartDate.value) return []

  const filterSt = dateToZeroTimestamp(filterStartDate.value)

  return store.mappings.filter(m =>
    m.et === null && // 持续任务
    m.st >= filterSt // 开始时间 >= 筛选时间
  ).sort((a, b) => a.k - b.k) // 按服务器 ID 排序
})

// 禁用时间选择
function disabledHours(): number[] {
  return Array.from({ length: 23 }, (_, i) => i + 1)
}

function disabledMinutes(): number[] {
  return Array.from({ length: 59 }, (_, i) => i + 1)
}

function disabledSeconds(): number[] {
  return Array.from({ length: 59 }, (_, i) => i + 1)
}

// 禁用非 14 天倍数的结束日期（基于最早任务的开始时间）
function disabledEndDate(time: Date): boolean {
  if (filteredTasks.value.length === 0) return false

  // 取最早任务的开始时间作为基准
  const earliestSt = Math.min(...filteredTasks.value.map(t => t.st))
  const checkTime = time.getTime()

  // 必须大于最早开始时间
  if (checkTime <= earliestSt) return true

  // 检查是否为 14 天的倍数（相对于最早开始时间）
  const diffDays = Math.round((checkTime - earliestSt) / (24 * 60 * 60 * 1000))
  const allowedDays = Array.from({ length: 54 }, (_, i) => (i + 1) * 14)
  return !allowedDays.includes(diffDays)
}

// 选择变化
function handleSelectionChange(selection: ServerMapping[]) {
  selectedTasks.value = selection
}

// 下一步
function handleNext() {
  if (!filterStartDate.value) {
    ElMessage.error('请选择开始时间')
    return
  }

  if (filteredTasks.value.length === 0) {
    ElMessage.warning('未找到符合条件的持续任务')
    return
  }

  // 默认选中所有任务
  selectedTasks.value = [...filteredTasks.value]

  // 默认结束日期为筛选开始时间 + 14天
  endDate.value = dateToZeroTimestamp(filterStartDate.value) + 14 * 24 * 60 * 60 * 1000

  step.value = 2
}

// 提交
async function handleSubmit() {
  if (selectedTasks.value.length === 0) {
    ElMessage.error('请选择要截断的任务')
    return
  }

  if (!endDate.value) {
    ElMessage.error('请选择结束日期')
    return
  }

  const et = dateToZeroTimestamp(endDate.value)

  // 校验结束日期是否为 14天倍数（相对于各任务的开始时间）
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

  for (const task of selectedTasks.value) {
    const duration = et - task.st
    if (duration % FOURTEEN_DAYS_MS !== 0 || duration <= 0) {
      ElMessage.error(`${task.k}服的结束日期不是 14天倍数（跨度 ${duration / (24 * 60 * 60 * 1000)} 天）`)
      return
    }
  }

  submitting.value = true

  try {
    // 批量更新
    for (const task of selectedTasks.value) {
      await store.update(task.id, { et })
    }

    ElMessage.success(`成功截断 ${selectedTasks.value.length} 个任务`)
    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 关闭
function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.step-content {
  min-height: 200px;
}
</style>