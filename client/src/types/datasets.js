// Tipos para el sistema de datasets compartidos

// Constantes para usar en lugar de tipos TypeScript
export const VIEW_TYPES = ['table', 'kanban', 'calendar', 'timeline']
export const PRIORITIES = ['low', 'medium', 'high']

// Helper function para validar tipos
export function isValidViewType(type) {
  return VIEW_TYPES.includes(type)
}

export function isValidPriority(priority) {
  return PRIORITIES.includes(priority)
}
