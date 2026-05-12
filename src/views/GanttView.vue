<template>
  <div class="gantt-view flex flex-col h-screen">
    <!-- 顶部工具栏 -->
    <Toolbar @openModal="handleOpenModal" />

    <!-- 甘特图区域 -->
    <GanttChart @taskClick="handleTaskClick" />

    <!-- 任务弹窗 -->
    <TaskModal
      v-if="modalVisible"
      :mode="modalMode"
      :task="selectedTask"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import GanttChart from '@/components/GanttChart.vue'
import TaskModal from '@/components/TaskModal.vue'
import { ModalMode, ServerMapping } from '@/types'

// 弹窗状态
const modalVisible = ref(false)
const modalMode = ref<ModalMode>(ModalMode.VIEW)
const selectedTask = ref<ServerMapping | null>(null)

// 打开弹窗
function handleOpenModal(mode: ModalMode) {
  modalMode.value = mode
  selectedTask.value = null
  modalVisible.value = true
}

// 处理任务块点击
function handleTaskClick(task: ServerMapping) {
  modalMode.value = ModalMode.VIEW
  selectedTask.value = task
  modalVisible.value = true
}

// 关闭弹窗
function handleModalClose() {
  modalVisible.value = false
  selectedTask.value = null
}
</script>

<style scoped>
.gantt-view {
  overflow: hidden;
}
</style>