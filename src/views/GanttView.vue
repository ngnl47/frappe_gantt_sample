<template>
  <div class="gantt-view flex flex-col h-screen">
    <!-- 顶部工具栏 -->
    <Toolbar @openModal="handleOpenModal" @openTruncate="handleOpenTruncate" />

    <!-- 甘特图区域 -->
    <GanttChart @taskClick="handleTaskClick" />

    <!-- 任务弹窗 -->
    <TaskModal
      v-if="modalVisible"
      :mode="modalMode"
      :task="selectedTask"
      @close="handleModalClose"
    />

    <!-- 截断持续任务对话框 -->
    <TruncateOngoingDialog
      v-if="truncateVisible"
      @close="handleTruncateClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import GanttChart from '@/components/GanttChart.vue'
import TaskModal from '@/components/TaskModal.vue'
import TruncateOngoingDialog from '@/components/TruncateOngoingDialog.vue'
import { ModalMode, ServerMapping } from '@/types'

// 弹窗状态
const modalVisible = ref(false)
const modalMode = ref<ModalMode>(ModalMode.VIEW)
const selectedTask = ref<ServerMapping | null>(null)
const truncateVisible = ref(false)

// 打开弹窗
function handleOpenModal(mode: ModalMode) {
  modalMode.value = mode
  selectedTask.value = null
  modalVisible.value = true
}

// 处理任务块点击（双击直接打开编辑面板）
function handleTaskClick(task: ServerMapping) {
  modalMode.value = ModalMode.EDIT
  selectedTask.value = task
  modalVisible.value = true
}

// 关闭弹窗
function handleModalClose() {
  modalVisible.value = false
  selectedTask.value = null
}

// 打开截断对话框
function handleOpenTruncate() {
  truncateVisible.value = true
}

// 关闭截断对话框
function handleTruncateClose() {
  truncateVisible.value = false
}
</script>

<style scoped>
.gantt-view {
  overflow: hidden;
}
</style>