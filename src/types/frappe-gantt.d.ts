// Frappe Gantt v1.x module declaration
declare module 'frappe-gantt' {
  // Built-in view mode names
  export type ViewModeName = 'Day' | 'Week' | 'Month' | 'Year' | 'Quarter Day' | 'Half Day'

  // Custom view mode object
  export interface ViewModeObject {
    name: string
    padding?: string // e.g., '7d'
    step?: string | number // e.g., '14d' or hours
    column_width?: number
    date_format?: string
    snap_at?: string // e.g., '1d'
    lower_text?: (currentDate: Date, previousDate: Date | null, lang: string) => string
    upper_text?: (currentDate: Date, previousDate: Date | null, lang: string) => string
    upper_text_frequency?: number
    thick_line?: (date: Date) => boolean
  }

  export type ViewMode = ViewModeName | ViewModeObject

  // Holiday definition
  export interface Holiday {
    date: string
    label?: string
  }

  // Popup context API (v1.x new API)
  export interface PopupContext {
    task: FrappeGanttTask
    chart: Gantt
    set_title: (html: string) => void
    set_subtitle: (html: string) => void
    set_details: (html: string) => void
    add_action: (label: string, callback: (task: FrappeGanttTask, gantt: Gantt) => void) => void
    hide: () => void
  }

  export interface GanttOptions {
    // Dimensions (v1.x: header_height split into upper/lower)
    upper_header_height?: number
    lower_header_height?: number
    column_width?: number
    step?: number
    bar_height?: number
    bar_corner_radius?: number
    arrow_curve?: number
    padding?: number
    container_height?: number | 'auto'

    // View modes
    view_mode?: ViewMode
    view_modes?: ViewMode[]
    view_mode_select?: boolean

    // Behavior
    snap_at?: string // e.g., '1d'
    infinite_padding?: boolean // NEW: disable auto padding
    auto_move_label?: boolean
    move_dependencies?: boolean

    // Access control (NEW in v1.x)
    readonly?: boolean
    readonly_dates?: boolean
    readonly_progress?: boolean

    // Dates and localization
    date_format?: string
    language?: string
    scroll_to?: 'today' | 'start' | 'end' | string | null

    // Holidays and weekends (NEW in v1.x)
    holidays?: Record<string, Holiday[] | 'weekend'> | null
    ignore?: string[]
    is_weekend?: (date: Date) => boolean

    // Visual features (NEW in v1.x)
    lines?: 'none' | 'vertical' | 'horizontal' | 'both'
    show_expected_progress?: boolean
    today_button?: boolean

    // Popup configuration (RESTRUCTURED in v1.x)
    popup_on?: 'click' | 'hover'
    popup?: (ctx: PopupContext) => string | boolean | void

    // Event handlers
    on_click?: (task: FrappeGanttTask) => void
    on_double_click?: (task: FrappeGanttTask) => void // NEW
    on_hover?: (task: FrappeGanttTask, screenX: number, screenY: number, event: MouseEvent) => void // NEW
    on_date_change?: (task: FrappeGanttTask, start: Date, end: Date) => void
    on_progress_change?: (task: FrappeGanttTask, progress: number) => void
    on_view_change?: (viewMode: ViewModeObject) => void // Parameter type changed
  }

  export interface FrappeGanttTask {
    id: string
    name: string
    start: string
    end: string
    progress?: number
    dependencies?: string | string[] // v1.x supports array
    custom_class?: string
    description?: string // NEW
    color?: string // NEW
    _index?: number // Internal: row index
    _start?: Date // Internal: parsed start
    _end?: Date // Internal: parsed end
  }

  class Gantt {
    constructor(element: HTMLElement | string, tasks: FrappeGanttTask[], options?: GanttOptions)

    // Existing methods
    change_view_mode(mode?: ViewMode, keep_scroll?: boolean): void
    refresh(tasks: FrappeGanttTask[]): void

    // NEW methods in v1.x
    update_task(id: string, updates: Partial<FrappeGanttTask>): void
    update_options(options: Partial<GanttOptions>): void
    scroll_current(): void

    // Properties (for internal access)
    tasks: FrappeGanttTask[]
    options: GanttOptions
    $container: HTMLElement
    $svg: SVGElement
    gantt_start?: Date
    gantt_end?: Date
    dates?: Date[]
    bars?: any[]
    arrows?: any[]
  }

  export default Gantt
}