<template>
  <el-dialog
    v-model="visible"
    :title="modalTitle"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 详情展示模式 -->
    <div v-if="mode === ModalMode.VIEW && currentTask" class="detail-view">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="ID">{{ currentTask.id }}</el-descriptions-item>
        <el-descriptions-item label="服务器">{{ currentTask.k }}</el-descriptions-item>
        <el-descriptions-item label="目标服务器">{{ currentTask.v ?? '无' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatTime(currentTask.st) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ currentTask.et ? formatTime(currentTask.et) : '持续进行中' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentTask.type === DataType.MAPPING ? '映射指向' : '暂停期' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentTask.cmt || '无' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(currentTask.ct) }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 编辑/新增表单模式 -->
    <el-form :model="formData" label-width="100px" v-if="mode !== ModalMode.VIEW">
      <el-form-item label="服务器 ID">
        <el-select v-model="formData.k" placeholder="选择服务器" :disabled="mode === ModalMode.EDIT">
          <el-option v-for="id in serverIds" :key="id" :label="`服务器 ${id}`" :value="id" />
        </el-select>
      </el-form-item>

      <el-form-item label="目标服务器" v-if="formData.type === DataType.MAPPING">
        <el-select v-model="formData.v" placeholder="选择目标服务器" clearable>
          <el-option v-for="id in serverIds" :key="id" :label="`服务器 ${id}`" :value="id" />
        </el-select>
        <div class="text-gray-400 text-xs mt-1">留空表示无指向</div>
      </el-form-item>

      <el-form-item label="开始日期">
        <el-date-picker
          v-model="formData.st"
          type="datetime"
          placeholder="选择开始日期"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="x"
          :disabled-hours="disabledHours"
          :disabled-minutes="disabledMinutes"
          :disabled-seconds="disabledSeconds"
        />
        <div class="text-gray-400 text-xs mt-1">时间固定为 00:00:00</div>
      </el-form-item>

      <el-form-item label="结束日期">
        <!-- 映射任务：可选持续进行或设置结束日期（必须是14天倍数） -->
        <div v-if="formData.type === DataType.MAPPING" class="flex flex-col gap-2">
          <el-radio-group v-model="mappingEndType" class="mb-2">
            <el-radio value="ongoing">持续进行</el-radio>
            <el-radio value="fixed">设置结束日期</el-radio>
          </el-radio-group>
          <el-date-picker
            v-if="mappingEndType === 'fixed'"
            v-model="formData.et"
            type="datetime"
            placeholder="选择结束日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="x"
            :clearable="true"
            :disabled-date="disabledEndDate"
            :disabled-hours="disabledHours"
            :disabled-minutes="disabledMinutes"
            :disabled-seconds="disabledSeconds"
          />
          <span v-if="mappingEndType === 'fixed'" class="text-gray-500 text-xs">仅可选择：开始日期 + 14、28、42、56... 天（时间固定为 00:00:00）</span>
        </div>
        <!-- 暂停期：可选，留空表示持续 -->
        <div v-else>
          <el-date-picker
            v-model="formData.et"
            type="datetime"
            placeholder="选择结束日期（可选）"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="x"
            :clearable="true"
            :disabled-hours="disabledHours"
            :disabled-minutes="disabledMinutes"
            :disabled-seconds="disabledSeconds"
          />
          <div class="text-gray-400 text-xs mt-1">留空表示持续进行中（时间固定为 00:00:00）</div>
        </div>
      </el-form-item>

      <el-form-item label="数据类型">
        <el-radio-group v-model="formData.type">
          <el-radio :value="DataType.MAPPING">映射指向</el-radio>
          <el-radio :value="DataType.PAUSED">暂停期</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="formData.cmt" type="textarea" :rows="2" placeholder="输入备注" />
      </el-form-item>
    </el-form>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="flex justify-between">
        <div v-if="mode === ModalMode.VIEW && currentTask">
          <el-button type="danger" @click="handleDelete">删除</el-button>
        </div>
        <div class="flex gap-2">
          <el-button @click="handleClose">取消</el-button>
          <el-button v-if="mode === ModalMode.VIEW" type="primary" @click="switchToEdit">编辑</el-button>
          <el-button v-if="mode !== ModalMode.VIEW" type="primary" @click="handleSave" :loading="saving">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <!-- 删除确认对话框 -->
  <el-dialog v-model="deleteConfirmVisible" title="确认删除" width="300px">
    <p>确定要删除这条记录吗？此操作不可恢复。</p>
    <template #footer>
      <el-button @click="deleteConfirmVisible = false">取消</el-button>
      <el-button type="danger" @click="confirmDelete" :loading="deleting">确认删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGanttStore } from '@/stores/ganttStore'
import { ModalMode, DataType, ServerMapping } from '@/types'
import { formatTimestamp, dateToZeroTimestamp } from '@/utils/timeUtils'
import { ElMessage } from 'element-plus'

// 常量：14 天
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

const props = defineProps<{
  mode: ModalMode
  task?: ServerMapping | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGanttStore()

// 状态
const visible = ref(true)
const saving = ref(false)
const deleting = ref(false)
const deleteConfirmVisible = ref(false)
const currentMode = ref<ModalMode>(props.mode)
const currentTask = ref<ServerMapping | null>(props.task || null)

// 映射任务结束类型：ongoing（持续）或 fixed（14天）
const mappingEndType = ref<'ongoing' | 'fixed'>('ongoing')

// 表单数据
const formData = ref({
  k: 1,
  v: null as number | null,
  st: null as number | null,
  et: null as number | null,
  type: DataType.MAPPING,
  cmt: ''
})

// 计算属性
const mode = computed(() => currentMode.value)

const modalTitle = computed(() => {
  switch (mode.value) {
    case ModalMode.CREATE:
      return '新增任务'
    case ModalMode.EDIT:
      return '编辑任务'
    case ModalMode.VIEW:
      return '任务详情'
    default:
      return ''
  }
})

const serverIds = computed(() => store.serverIds)

// 监听类型变化
watch(() => formData.value.type, (newType) => {
  if (newType === DataType.MAPPING) {
    // 映射任务：根据 mappingEndType 决定结束日期
    if (mappingEndType.value === 'ongoing') {
      formData.value.et = null
    } else if (formData.value.st && formData.value.et === null) {
      // fixed 模式：仅在 et 为 null 时自动设置为开始日期 + 14天
      formData.value.et = formData.value.st + FOURTEEN_DAYS_MS
    }
  } else if (newType === DataType.PAUSED) {
    // 暂停期：结束日期可选，留空表示持续
    formData.value.et = null
  }
})

// 监听 mappingEndType 变化
watch(mappingEndType, (newType) => {
  if (formData.value.type === DataType.MAPPING) {
    if (newType === 'ongoing') {
      formData.value.et = null
    } else if (formData.value.st && formData.value.et === null) {
      // fixed 模式：仅在 et 为 null 时自动设置为开始日期 + 14天
      // 编辑模式下原有 et 值会被保留
      formData.value.et = formData.value.st + FOURTEEN_DAYS_MS
    }
  }
})

// 监听开始日期变化（映射任务 fixed 模式，仅当 et 是默认 +14天 时才同步更新）
watch(() => formData.value.st, (newSt, oldSt) => {
  if (formData.value.type === DataType.MAPPING && mappingEndType.value === 'fixed' && newSt) {
    // 只有当 et 是上一个 st + 14天（即自动生成的默认值）时才同步更新
    const expectedOldEt = oldSt ? oldSt + FOURTEEN_DAYS_MS : null
    if (formData.value.et === expectedOldEt || formData.value.et === null) {
      formData.value.et = newSt + FOURTEEN_DAYS_MS
    }
  }
})

// 初始化表单数据
watch([() => props.mode, () => props.task], () => {
  currentMode.value = props.mode
  currentTask.value = props.task || null

  if (props.task) {
    formData.value = {
      k: props.task.k,
      v: props.task.v,
      st: props.task.st,
      et: props.task.et,
      type: props.task.type,
      cmt: props.task.cmt
    }
    // 根据 et 设置 mappingEndType
    mappingEndType.value = props.task.et ? 'fixed' : 'ongoing'
  } else {
    formData.value = {
      k: serverIds.value[0] || 1,
      v: null,
      st: null,
      et: null,
      type: DataType.MAPPING,
      cmt: ''
    }
    // 重置映射结束类型
    mappingEndType.value = 'ongoing'
  }
}, { immediate: true })

// 格式化时间
function formatTime(timestamp: number): string {
  return formatTimestamp(timestamp)
}

// 计算映射任务可选的结束日期（开始日期 + 14天*n）
// 只允许这些日期，其他日期禁用
function disabledEndDate(time: Date): boolean {
  // 仅对映射任务生效
  if (formData.value.type !== DataType.MAPPING || !formData.value.st) {
    return false // 不禁用任何日期
  }

  const startTime = formData.value.st // 已经是 0 点时间戳（value-format="x"）
  const checkTime = time.getTime()

  // 必须大于开始时间
  if (checkTime <= startTime) {
    return true // 禁用
  }

  // 检查是否为 14 天的倍数
  const diffDays = Math.round((checkTime - startTime) / (24 * 60 * 60 * 1000))

  // 只允许 14、28、42、56... 天（最多显示到 140 天，即 10 个周期）
  const allowedDays = [14, 28, 42, 56, 70, 84, 98, 112, 126, 140]
  return !allowedDays.includes(diffDays)
}

// 禁用所有非 0 的小时（只允许 00:00:00）
function disabledHours(): number[] {
  return Array.from({ length: 23 }, (_, i) => i + 1) // 禁用 1-23
}

// 禁用所有非 0 的分钟（只允许 00:00:00）
function disabledMinutes(): number[] {
  return Array.from({ length: 59 }, (_, i) => i + 1) // 禁用 1-59
}

// 禁用所有非 0 的秒（只允许 00:00:00）
function disabledSeconds(): number[] {
  return Array.from({ length: 59 }, (_, i) => i + 1) // 禁用 1-59
}

// 切换到编辑模式
function switchToEdit() {
  currentMode.value = ModalMode.EDIT
}

// 保存
async function handleSave() {
  saving.value = true

  try {
    if (mode.value === ModalMode.CREATE) {
      // 校验必填字段
      if (!formData.value.st) {
        ElMessage.error('请选择开始日期')
        return
      }

      // 转换时间戳为当天 0 点
      const st = dateToZeroTimestamp(formData.value.st)

      // 计算结束时间
      let et: number | null
      if (formData.value.type === DataType.MAPPING) {
        if (mappingEndType.value === 'fixed') {
          if (!formData.value.et) {
            ElMessage.error('请选择结束日期')
            return
          }
          et = dateToZeroTimestamp(formData.value.et)
          // 校验结束时间是否为开始时间 + 14天*n
          const duration = et - st
          if (duration % FOURTEEN_DAYS_MS !== 0 || duration <= 0) {
            ElMessage.error(`映射任务结束日期必须为开始日期 + 14天*n（当前跨度 ${duration / (24 * 60 * 60 * 1000)} 天不是 14 天的倍数）`)
            return
          }
        } else {
          et = null // 持续进行
        }
      } else {
        // 暂停期：可选
        et = formData.value.et ? dateToZeroTimestamp(formData.value.et) : null
      }

      // 校验结束时间大于开始时间（仅针对有结束时间的任务）
      if (et && st >= et) {
        ElMessage.error('结束时间必须大于开始时间')
        return
      }

      await store.create({
        k: formData.value.k,
        v: formData.value.v,
        st,
        et,
        type: formData.value.type,
        cmt: formData.value.cmt
      })

      ElMessage.success('创建成功')
    } else if (mode.value === ModalMode.EDIT && currentTask.value) {
      // 转换开始时间
      const editSt = formData.value.st ? dateToZeroTimestamp(formData.value.st) : currentTask.value.st

      // 计算编辑模式下的结束时间
      let editEt: number | null
      if (formData.value.type === DataType.MAPPING) {
        if (mappingEndType.value === 'fixed') {
          if (!formData.value.et) {
            ElMessage.error('请选择结束日期')
            return
          }
          editEt = dateToZeroTimestamp(formData.value.et)
          // 校验结束时间是否为开始时间 + 14天*n
          const duration = editEt - editSt
          if (duration % FOURTEEN_DAYS_MS !== 0 || duration <= 0) {
            ElMessage.error(`映射任务结束日期必须为开始日期 + 14天*n（当前跨度 ${duration / (24 * 60 * 60 * 1000)} 天不是 14 天的倍数）`)
            return
          }
        } else {
          editEt = null // 持续进行
        }
      } else {
        // 暂停期：可选结束时间
        editEt = formData.value.et ? dateToZeroTimestamp(formData.value.et) : null
      }

      await store.update(currentTask.value.id, {
        v: formData.value.v,
        type: formData.value.type,
        cmt: formData.value.cmt,
        st: editSt,
        et: editEt
      })

      ElMessage.success('更新成功')
    }

    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    saving.value = false
  }
}

// 删除
function handleDelete() {
  deleteConfirmVisible.value = true
}

// 确认删除
async function confirmDelete() {
  if (!currentTask.value) return

  deleting.value = true

  try {
    await store.deleteMapping(currentTask.value.id)
    deleteConfirmVisible.value = false
    ElMessage.success('删除成功')
    handleClose()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

// 关闭弹窗
function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.detail-view {
  padding: 8px 0;
}
</style>