// Templates predefinidos para datasets y vistas

export const DATASET_TEMPLATES = {
  content_database: {
    id: 'content_database',
    name: 'Content Database',
    description: 'Base de datos de contenido para organizar ideas, hooks y piezas',
    icon: '🗃️',
    items: [
      {
        id: 'demo-1',
        title: 'Hook viral sobre productividad',
        description: 'Stop scrolling y start doing. Ejemplo: "Dejé de perder tiempo en TikTok y empecé a crear contenido de valor"',
        type: 'hook',
        platform: 'tiktok',
        status: 'idea',
        priority: 'high',
        tags: ['viral', 'productividad'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        title: 'Reel sobre tips de marketing',
        description: '3 consejos rápidos que nadie cuenta sobre marketing digital',
        type: 'reel',
        platform: 'instagram',
        status: 'idea',
        priority: 'medium',
        tags: ['tips', 'marketing'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    defaultViews: [
      {
        type: 'table',
        name: 'Vista Tabla',
        config: {
          columns: ['title', 'type', 'platform', 'status', 'priority'],
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      },
      {
        type: 'kanban',
        name: 'Pipeline',
        config: {
          groupBy: 'status',
          columns: ['idea', 'en_progreso', 'revision', 'aprobado', 'programado']
        }
      }
    ]
  },

  hook_bank: {
    id: 'hook_bank',
    name: 'Hook Bank',
    description: 'Banco de hooks probados para reutilizar',
    icon: '🎣',
    items: [],
    defaultViews: [
      {
        type: 'table' ,
        name: 'Hooks',
        config: {
          columns: ['title', 'platform', 'priority', 'tags'],
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      }
    ]
  },

  research_tracker: {
    id: 'research_tracker',
    name: 'Research Tracker',
    description: 'Seguimiento de investigación de mercado y competencia',
    icon: '🔍',
    items: [],
    defaultViews: [
      {
        type: 'table' ,
        name: 'Investigación',
        config: {
          columns: ['title', 'type', 'status', 'tags'],
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      }
    ]
  }
}

export const VIEW_TEMPLATES = {
  table: {
    content_production: {
      id: 'content_production',
      name: 'Content Production',
      description: 'Seguimiento de producción de contenido',
      columns: ['title', 'status', 'platform', 'type', 'date', 'priority']
    },
    client_workflow: {
      id: 'client_workflow',
      name: 'Client Workflow',
      description: 'Pipeline de trabajo con clientes',
      columns: ['title', 'owner', 'stage', 'deadline', 'status']
    },
    idea_database: {
      id: 'idea_database',
      name: 'Idea Database',
      description: 'Base de ideas de contenido',
      columns: ['title', 'type', 'platform', 'status', 'priority', 'tags']
    }
  },

  kanban: {
    content_pipeline: {
      id: 'content_pipeline',
      name: 'Content Pipeline',
      description: 'Pipeline completo de producción',
      groupBy: 'status',
      columns: ['Ideas', 'Guion', 'Grabación', 'Edición', 'Listo', 'Programado']
    },
    client_stages: {
      id: 'client_stages',
      name: 'Client Stages',
      description: 'Etapas del trabajo con clientes',
      groupBy: 'status',
      columns: ['Contacto', 'Propuesta', 'Producción', 'Revisión', 'Entrega']
    },
    idea_pipeline: {
      id: 'idea_pipeline',
      name: 'Idea Pipeline',
      description: 'Pipeline desde idea hasta publicación',
      groupBy: 'status',
      columns: ['Nueva', 'Validación', 'Desarrollo', 'Aprobado', 'Programado']
    }
  },

  calendar: {
    monthly_calendar: {
      id: 'monthly_calendar',
      name: 'Calendario Mensual',
      description: 'Vista mensual de publicaciones',
      dateField: 'date'
    },
    launch_calendar: {
      id: 'launch_calendar',
      name: 'Calendario de Lanzamientos',
      description: 'Fechas importantes de lanzamiento',
      dateField: 'date'
    },
    content_calendar: {
      id: 'content_calendar',
      name: 'Content Calendar',
      description: 'Calendario de contenido planificado',
      dateField: 'date'
    }
  },

  timeline: {
    campaign_roadmap: {
      id: 'campaign_roadmap',
      name: 'Roadmap de Campaña',
      description: 'Línea de tiempo de campaña completa',
      dateField: 'startDate'
    },
    product_timeline: {
      id: 'product_timeline',
      name: 'Timeline de Producto',
      description: 'Evolución y hitos del producto',
      dateField: 'startDate'
    },
    content_series: {
      id: 'content_series',
      name: 'Serie de Contenido',
      description: 'Secuencia de contenido relacionado',
      dateField: 'startDate'
    }
  }
}

// Helper para obtener template por ID
export function getDatasetTemplate(templateId) {
  return DATASET_TEMPLATES[templateId] || null
}

// Helper para obtener view template por tipo e ID
export function getViewTemplate(viewType, templateId) {
  return VIEW_TEMPLATES[viewType]?.[templateId] || null
}

// Helper para obtener todos los templates de un tipo de vista
export function getViewTemplatesByType(viewType) {
  return VIEW_TEMPLATES[viewType] || {}
}
