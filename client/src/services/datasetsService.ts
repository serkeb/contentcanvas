// Servicio para gestión de datasets compartidos con Supabase
import { supabase } from '../lib/supabase'
import { Dataset, FormatItem, View, ViewType, DatasetTemplate } from '../types/datasets'
import { DATASET_TEMPLATES, VIEW_TEMPLATES } from '../canvas/utils/formatTemplates'

// Cache local para performance
let datasetsCache: Map<string, Dataset> = new Map()
let itemsCache: Map<string, FormatItem[]> = new Map()
let viewsCache: Map<string, View[]> = new Map()
let subscriptions: Map<string, () => void> = new Map()

// Helper para transformar row de Supabase a Dataset
function rowToDataset(row: any): Dataset {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    userId: row.user_id,
    items: [],
    views: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Helper para transformar row de Supabase a FormatItem
function rowToFormatItem(row: any): FormatItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    type: row.type,
    date: row.date,
    startDate: row.start_date,
    endDate: row.end_date,
    priority: row.priority,
    tags: row.tags,
    platform: row.platform,
    linkedNodeIds: row.linked_node_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Helper para transformar row de Supabase a View
function rowToView(row: any): View {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    type: row.type,
    name: row.name,
    config: row.config,
    createdAt: row.created_at
  }
}

export class DatasetService {
  // Crear nuevo dataset desde template
  static async createDataset(name: string, templateId?: string): Promise<Dataset> {
    try {
      // Obtener template si se proporcionó
      let templateItems: any[] = []
      let templateViews: any[] = []

      if (templateId) {
        const template = DATASET_TEMPLATES[templateId]
        if (template) {
          templateItems = template.items || []
          templateViews = template.defaultViews || []
        }
      }

      // Crear dataset en Supabase
      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          name,
          description: templateId ? DATASET_TEMPLATES[templateId]?.description : null
        })
        .select()
        .single()

      if (datasetError) throw datasetError

      const dataset = rowToDataset(datasetData)

      // Insertar items del template
      if (templateItems.length > 0) {
        const itemsToInsert = templateItems.map(item => ({
          dataset_id: dataset.id,
          title: item.title,
          description: item.description,
          status: item.status,
          type: item.type,
          priority: item.priority,
          tags: item.tags,
          platform: item.platform
        }))

        const { error: itemsError } = await supabase
          .from('dataset_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      // Crear vistas del template
      if (templateViews.length > 0) {
        const viewsToInsert = templateViews.map(view => ({
          dataset_id: dataset.id,
          type: view.type,
          name: view.name,
          config: view.config
        }))

        const { error: viewsError } = await supabase
          .from('dataset_views')
          .insert(viewsToInsert)

        if (viewsError) throw viewsError
      }

      // Cargar dataset completo con items y views
      await this.loadDataset(dataset.id)

      return dataset
    } catch (error) {
      console.error('Error creating dataset:', error)
      throw error
    }
  }

  // Cargar dataset completo en cache
  static async loadDataset(datasetId: string): Promise<void> {
    try {
      // Obtener dataset
      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .select()
        .eq('id', datasetId)
        .single()

      if (datasetError) {
        // Si el error es que la tabla no existe, lanzar un error más claro
        if (datasetError.code === '42P01') {
          throw new Error('Las tablas de datasets no existen. Por favor ejecuta el script SQL en Supabase.')
        }
        throw datasetError
      }

      const dataset = rowToDataset(datasetData)

      // Obtener items
      const { data: itemsData, error: itemsError } = await supabase
        .from('dataset_items')
        .select()
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false })

      if (itemsError) {
        if (itemsError.code === '42P01') {
          throw new Error('Las tablas de datasets no existen. Por favor ejecuta el script SQL en Supabase.')
        }
        throw itemsError
      }

      const items = itemsData.map(rowToFormatItem)

      // Obtener views
      const { data: viewsData, error: viewsError } = await supabase
        .from('dataset_views')
        .select()
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: true })

      if (viewsError) {
        if (viewsError.code === '42P01') {
          throw new Error('Las tablas de datasets no existen. Por favor ejecuta el script SQL en Supabase.')
        }
        throw viewsError
      }

      const views = viewsData.map(rowToView)

      // Actualizar cache
      dataset.items = items
      dataset.views = views
      datasetsCache.set(datasetId, dataset)
      itemsCache.set(datasetId, items)
      viewsCache.set(datasetId, views)
    } catch (error) {
      console.error('Error loading dataset:', error)
      throw error
    }
  }

  // Obtener dataset desde cache
  static getDataset(datasetId: string): Dataset | null {
    return datasetsCache.get(datasetId) || null
  }

  // Obtener todos los datasets disponibles
  static async getAvailableDatasets(): Promise<Dataset[]> {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select()
        .order('updated_at', { ascending: false })

      if (error) throw error

      const datasets = data.map(rowToDataset)

      // Actualizar cache
      datasets.forEach(ds => {
        if (!datasetsCache.has(ds.id)) {
          datasetsCache.set(ds.id, ds)
        }
      })

      return datasets
    } catch (error) {
      console.error('Error fetching datasets:', error)
      throw error
    }
  }

  // Agregar item a dataset
  static async addItem(datasetId: string, item: Omit<FormatItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('dataset_items')
        .insert({
          dataset_id: datasetId,
          title: item.title,
          description: item.description,
          status: item.status,
          type: item.type,
          date: item.date,
          start_date: item.startDate,
          end_date: item.endDate,
          priority: item.priority,
          tags: item.tags,
          platform: item.platform,
          linked_node_ids: item.linkedNodeIds
        })
        .select()
        .single()

      if (error) throw error

      // Actualizar cache
      const items = itemsCache.get(datasetId) || []
      const newItem = rowToFormatItem(data)
      items.unshift(newItem)
      itemsCache.set(datasetId, items)

      // Actualizar dataset en cache
      const dataset = datasetsCache.get(datasetId)
      if (dataset) {
        dataset.items = items
        dataset.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error adding item:', error)
      throw error
    }
  }

  // Actualizar item
  static async updateItem(datasetId: string, itemId: string, updates: Partial<FormatItem>): Promise<void> {
    try {
      const updateData: any = {}

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.date !== undefined) updateData.date = updates.date
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate
      if (updates.priority !== undefined) updateData.priority = updates.priority
      if (updates.tags !== undefined) updateData.tags = updates.tags
      if (updates.platform !== undefined) updateData.platform = updates.platform
      if (updates.linkedNodeIds !== undefined) updateData.linked_node_ids = updates.linkedNodeIds

      const { error } = await supabase
        .from('dataset_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) throw error

      // Actualizar cache
      const items = itemsCache.get(datasetId) || []
      const index = items.findIndex(item => item.id === itemId)
      if (index !== -1) {
        items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() }
        itemsCache.set(datasetId, items)
      }

      // Actualizar dataset en cache
      const dataset = datasetsCache.get(datasetId)
      if (dataset) {
        dataset.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error updating item:', error)
      throw error
    }
  }

  // Eliminar item
  static async deleteItem(datasetId: string, itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dataset_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      // Actualizar cache
      const items = itemsCache.get(datasetId) || []
      const filteredItems = items.filter(item => item.id !== itemId)
      itemsCache.set(datasetId, filteredItems)

      // Actualizar dataset en cache
      const dataset = datasetsCache.get(datasetId)
      if (dataset) {
        dataset.items = filteredItems
        dataset.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      throw error
    }
  }

  // Crear nueva vista desde dataset
  static async createView(
    datasetId: string,
    viewType: ViewType,
    name: string,
    templateId?: string
  ): Promise<View> {
    try {
      // Obtener configuración del template si se proporcionó
      let config: any = {}

      if (templateId) {
        const template = VIEW_TEMPLATES[viewType]?.[templateId]
        if (template) {
          config = template.config
        }
      }

      // Crear vista en Supabase
      const { data, error } = await supabase
        .from('dataset_views')
        .insert({
          dataset_id: datasetId,
          type: viewType,
          name,
          config
        })
        .select()
        .single()

      if (error) throw error

      const view = rowToView(data)

      // Actualizar cache
      const views = viewsCache.get(datasetId) || []
      views.push(view)
      viewsCache.set(datasetId, views)

      // Actualizar dataset en cache
      const dataset = datasetsCache.get(datasetId)
      if (dataset) {
        dataset.views = views
        dataset.updatedAt = new Date().toISOString()
      }

      return view
    } catch (error) {
      console.error('Error creating view:', error)
      throw error
    }
  }

  // Actualizar vista
  static async updateView(datasetId: string, viewId: string, updates: Partial<View>): Promise<void> {
    try {
      const updateData: any = {}

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.config !== undefined) updateData.config = updates.config

      const { error } = await supabase
        .from('dataset_views')
        .update(updateData)
        .eq('id', viewId)

      if (error) throw error

      // Actualizar cache
      const views = viewsCache.get(datasetId) || []
      const index = views.findIndex(view => view.id === viewId)
      if (index !== -1) {
        views[index] = { ...views[index], ...updates }
        viewsCache.set(datasetId, views)
      }

      // Actualizar dataset en cache
      const dataset = datasetsCache.get(datasetId)
      if (dataset) {
        dataset.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error updating view:', error)
      throw error
    }
  }

  // Eliminar vista
  static async deleteView(datasetId: string, viewId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dataset_views')
        .delete()
        .eq('id', viewId)

      if (error) throw error

      // Actualizar cache
      const views = viewsCache.get(datasetId) || []
      const filteredViews = views.filter(view => view.id !== viewId)
      viewsCache.set(datasetId, filteredViews)

      // Actualizar dataset en cache
      const dataset = datasetsCache.get(datasetId)
      if (dataset) {
        dataset.views = filteredViews
        dataset.updatedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error deleting view:', error)
      throw error
    }
  }

  // Suscribirse a cambios en tiempo real de un dataset
  static subscribeToDataset(
    datasetId: string,
    callback: (dataset: Dataset) => void
  ): () => void {
    // Primero, desuscribirse si ya existe una subscripción
    if (subscriptions.has(datasetId)) {
      this.unsubscribeFromDataset(datasetId)
    }

    // Crear nombres únicos para los canales
    const channelName = `dataset_${datasetId}_${Date.now()}`

    // Suscribirse a cambios en items
    const itemsChannel = supabase.channel(`${channelName}_items`)
    itemsChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dataset_items',
          filter: `dataset_id=eq.${datasetId}`
        },
        async () => {
          await this.loadDataset(datasetId)
          const dataset = this.getDataset(datasetId)
          if (dataset) callback(dataset)
        }
      )
      .subscribe()

    // Suscribirse a cambios en views
    const viewsChannel = supabase.channel(`${channelName}_views`)
    viewsChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dataset_views',
          filter: `dataset_id=eq.${datasetId}`
        },
        async () => {
          await this.loadDataset(datasetId)
          const dataset = this.getDataset(datasetId)
          if (dataset) callback(dataset)
        }
      )
      .subscribe()

    // Guardar referencias para poder desuscribirse después
    const unsubscribe = () => {
      itemsChannel.unsubscribe()
      viewsChannel.unsubscribe()
    }

    subscriptions.set(datasetId, unsubscribe)

    return unsubscribe
  }

  // Desuscribirse de un dataset
  static unsubscribeFromDataset(datasetId: string): void {
    const unsubscribe = subscriptions.get(datasetId)
    if (unsubscribe) {
      unsubscribe()
      subscriptions.delete(datasetId)
    }
  }

  // Limpiar cache
  static clearCache(): void {
    datasetsCache.clear()
    itemsCache.clear()
    viewsCache.clear()
  }

  // Eliminar dataset completo
  static async deleteDataset(datasetId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId)

      if (error) throw error

      // Limpiar cache
      datasetsCache.delete(datasetId)
      itemsCache.delete(datasetId)
      viewsCache.delete(datasetId)

      // Desuscribirse si existe
      this.unsubscribeFromDataset(datasetId)
    } catch (error) {
      console.error('Error deleting dataset:', error)
      throw error
    }
  }
}
