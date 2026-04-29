// Tipos para el sistema de datasets compartidos

export type Priority = 'low' | 'medium' | 'high'

export type ViewType = 'table' | 'kanban' | 'calendar' | 'timeline'

export interface FormatItem {
  id: string
  title: string
  description?: string
  status?: string
  type?: string
  date?: string // YYYY-MM-DD
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  priority?: Priority
  tags?: string[]
  platform?: string
  linkedNodeIds?: string[]
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

export interface View {
  id: string
  datasetId: string
  type: ViewType
  name: string
  config: Record<string, any>
  createdAt: string
}

export interface Dataset {
  id: string
  name: string
  description?: string
  userId?: string
  items: FormatItem[]
  views: View[]
  createdAt: string
  updatedAt: string
}

// Tipos para configuración de vistas
export interface TableViewConfig {
  columns: string[] // Propiedades a mostrar como columnas
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filterBy?: Record<string, any>
}

export interface KanbanViewConfig {
  groupBy: string // Propiedad por la que agrupar (ej: status, type)
  columns: string[] // Valores únicos que definen las columnas
  sortBy?: string
}

export interface CalendarViewConfig {
  dateField: 'date' | 'startDate' | 'endDate'
  filterBy?: Record<string, any>
}

export interface TimelineViewConfig {
  dateField: 'startDate' | 'endDate' | 'date'
  sortBy?: string
  groupBy?: string
}

// Tipo unión para configs
export type ViewConfig = TableViewConfig | KanbanViewConfig | CalendarViewConfig | TimelineViewConfig

// Tipos para templates
export interface DatasetTemplate {
  id: string
  name: string
  description: string
  icon?: string
  items?: Partial<FormatItem>[]
  defaultViews?: Partial<View>[]
}

export interface ViewTemplate {
  id: string
  name: string
  description?: string
  config: ViewConfig
}
