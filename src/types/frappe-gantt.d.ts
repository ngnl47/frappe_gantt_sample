// Frappe Gantt module declaration
declare module 'frappe-gantt' {
  type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Day' | 'Half Day'

  interface GanttOptions {
    header_height?: number
    column_width?: number
    step?: number
    view_modes?: readonly ViewMode[]
    bar_height?: number
    bar_corner_radius?: number
    arrow_curve?: number
    padding?: number
    view_mode?: ViewMode
    date_format?: string
    custom_popup_html?: string | null | ((task: FrappeGanttTask) => string)
    on_click?: (task: FrappeGanttTask) => void
    on_date_change?: (task: FrappeGanttTask, start: Date, end: Date) => void
    on_progress_change?: (task: FrappeGanttTask, progress: number) => void
    on_view_change?: (mode: string) => void
  }

  interface FrappeGanttTask {
    id: string
    name: string
    start: string
    end: string
    progress?: number
    dependencies?: string
    custom_class?: string
  }

  class Gantt {
    constructor(element: HTMLElement | string, tasks: FrappeGanttTask[], options?: GanttOptions)
    change_view_mode(mode: ViewMode): void
    refresh(tasks: FrappeGanttTask[]): void
  }

  export default Gantt
}