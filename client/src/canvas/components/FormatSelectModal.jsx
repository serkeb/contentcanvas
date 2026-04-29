import { useState, useEffect } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { DatasetService } from '../../services/datasetsService'
import { DATASET_TEMPLATES, VIEW_TEMPLATES } from '../utils/formatTemplates'
import { VIEW_TYPES } from '../../types/datasets'

const FORMAT_OPTIONS = [
  {
    id: 'table',
    icon: '📊',
    label: 'Tabla',
    color: '#3b82f6',
    description: 'Vista de tabla con columnas configurables'
  },
  {
    id: 'kanban',
    icon: '📋',
    label: 'Kanban',
    color: '#f59e0b',
    description: 'Tablero kanban con columnas arrastrables'
  },
  {
    id: 'calendar',
    icon: '📅',
    label: 'Calendario',
    color: '#ef4444',
    description: 'Vista de calendario mensual'
  },
  {
    id: 'timeline',
    icon: '⏱',
    label: 'Timeline',
    color: '#8b5cf6',
    description: 'Línea de tiempo con hitos'
  },
  {
    id: 'document',
    icon: '📄',
    label: 'Documento',
    color: '#10b981',
    description: 'Documento de texto independiente',
    standalone: true
  }
]

export default function FormatSelectModal({ onClose, onFormatCreated }) {
  const [mode, setMode] = useState('new') // 'new' | 'existing'
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [datasetName, setDatasetName] = useState('')
  const [viewName, setViewName] = useState('')
  const [existingDatasets, setExistingDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingDatasets, setLoadingDatasets] = useState(false)
  const [step, setStep] = useState(1) // 1: format, 2: template/dataset

  // Load existing datasets when switching to existing mode
  useEffect(() => {
    if (mode === 'existing') {
      loadExistingDatasets()
    }
  }, [mode])

  const loadExistingDatasets = async () => {
    try {
      setLoadingDatasets(true)
      const datasets = await DatasetService.getAvailableDatasets()
      setExistingDatasets(datasets)
    } catch (error) {
      console.error('Error loading datasets:', error)
    } finally {
      setLoadingDatasets(false)
    }
  }

  const handleFormatSelect = (format) => {
    setSelectedFormat(format)
    if (format.standalone) {
      // For documents, skip to name step
      setStep(3)
    } else {
      setStep(2)
    }
  }

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId)
    setDatasetName(DATASET_TEMPLATES[templateId]?.name || '')
    setStep(3)
  }

  const handleDatasetSelect = (dataset) => {
    setSelectedDataset(dataset)
    setStep(3)
  }

  const handleCreate = async () => {
    try {
      setLoading(true)

      if (selectedFormat?.standalone) {
        // Create standalone document node
        onFormatCreated({
          type: 'document',
          title: viewName || 'Nuevo Documento',
          content: ''
        })
      } else if (mode === 'new') {
        // Create new dataset from template
        const dataset = await DatasetService.createDataset(
          datasetName || 'Nuevo Dataset',
          selectedTemplate
        )

        // Create view for the dataset
        const view = await DatasetService.createView(
          dataset.id,
          selectedFormat.id,
          viewName || `${selectedFormat.label} View`,
          selectedTemplate
        )

        onFormatCreated({
          datasetId: dataset.id,
          viewId: view.id,
          title: viewName || selectedFormat.label
        })
      } else {
        // Create view from existing dataset
        const view = await DatasetService.createView(
          selectedDataset.id,
          selectedFormat.id,
          viewName || `${selectedFormat.label} View`
        )

        onFormatCreated({
          datasetId: selectedDataset.id,
          viewId: view.id,
          title: viewName || selectedFormat.label
        })
      }

      onClose()
    } catch (error) {
      console.error('Error creating format:', error)
      alert('Error al crear el formato. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return selectedFormat !== null
    if (step === 2) {
      if (mode === 'new') return selectedTemplate !== null
      return selectedDataset !== null
    }
    if (step === 3) return viewName.trim().length > 0
    return false
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'system-ui',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: 700,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#334155',
            }}>
              {step === 1 && 'Seleccionar Formato'}
              {step === 2 && mode === 'new' && 'Seleccionar Template'}
              {step === 2 && mode === 'existing' && 'Seleccionar Dataset'}
              {step === 3 && 'Configurar Vista'}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: 13,
              color: '#64748b',
            }}>
              {step === 1 && 'Elige el tipo de formato que deseas crear'}
              {step === 2 && mode === 'new' && 'Comienza con un template predefinido'}
              {step === 2 && mode === 'existing' && 'Usa un dataset existente'}
              {step === 3 && 'Personaliza tu nueva vista'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: s <= step ? '#10b981' : '#e2e8f0',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 24,
        }}>
          {step === 1 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {FORMAT_OPTIONS.map(format => (
                <div
                  key={format.id}
                  onClick={() => handleFormatSelect(format)}
                  style={{
                    border: `2px solid ${selectedFormat?.id === format.id ? format.color : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    background: selectedFormat?.id === format.id ? `${format.color}08` : '#fff',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={e => {
                    if (selectedFormat?.id !== format.id) {
                      e.target.style.borderColor = format.color
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedFormat?.id !== format.id) {
                      e.target.style.borderColor = '#e2e8f0'
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = 'none'
                    }
                  }}
                >
                  <span style={{ fontSize: 40 }}>{format.icon}</span>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#334155',
                  }}>
                    {format.label}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#64748b',
                    lineHeight: 1.4,
                  }}>
                    {format.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && mode === 'new' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 16,
            }}>
              {Object.entries(DATASET_TEMPLATES).map(([id, template]) => (
                <div
                  key={id}
                  onClick={() => handleTemplateSelect(id)}
                  style={{
                    border: `2px solid ${selectedTemplate === id ? '#10b981' : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    background: selectedTemplate === id ? '#f0fdf4' : '#fff',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 32 }}>{template.icon}</span>
                    <div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#334155',
                      }}>
                        {template.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: '#64748b',
                      }}>
                        {template.items?.length || 0} items de ejemplo
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}>
                    {template.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && mode === 'existing' && (
            <div>
              {loadingDatasets ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  gap: 12,
                }}>
                  <Loader2 size={24} className="spinner" style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>Cargando datasets...</span>
                </div>
              ) : existingDatasets.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 40,
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <div style={{
                    fontSize: 14,
                    color: '#64748b',
                    marginBottom: 8,
                  }}>
                    No tienes datasets todavía
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    marginBottom: 16,
                  }}>
                    Crea uno nuevo desde un template para empezar
                  </div>
                  <button
                    onClick={() => {
                      setMode('new')
                      setStep(1)
                      setSelectedFormat(null)
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Crear Nuevo Dataset
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: 12,
                }}>
                  {existingDatasets.map(dataset => (
                    <div
                      key={dataset.id}
                      onClick={() => handleDatasetSelect(dataset)}
                      style={{
                        border: `2px solid ${selectedDataset?.id === dataset.id ? '#10b981' : '#e2e8f0'}`,
                        borderRadius: 8,
                        padding: 16,
                        cursor: 'pointer',
                        background: selectedDataset?.id === dataset.id ? '#f0fdf4' : '#fff',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 4,
                      }}>
                        {dataset.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: '#64748b',
                      }}>
                        {dataset.description || 'Sin descripción'}
                      </div>
                      <div style={{
                        marginTop: 8,
                        display: 'flex',
                        gap: 8,
                        fontSize: 10,
                        color: '#94a3b8',
                      }}>
                        <span>📊 {dataset.views?.length || 0} vistas</span>
                        <span>•</span>
                        <span>📝 {dataset.items?.length || 0} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{
              maxWidth: 400,
              margin: '0 auto',
            }}>
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 8,
                }}>
                  Nombre de la Vista
                </label>
                <input
                  type="text"
                  value={viewName}
                  onChange={e => setViewName(e.target.value)}
                  placeholder="Mi Vista"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  autoFocus
                />
              </div>

              {!selectedFormat?.standalone && (
                <div style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 8,
                  marginBottom: 24,
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    Resumen
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                    {mode === 'new' ? (
                      <>
                        Crearás un nuevo dataset llamado <strong>{datasetName || 'Nuevo Dataset'}</strong> desde el template <strong>{DATASET_TEMPLATES[selectedTemplate]?.name}</strong> con una vista de <strong>{selectedFormat?.label}</strong>.
                      </>
                    ) : (
                      <>
                        Crearás una nueva vista de <strong>{selectedFormat?.label}</strong> para el dataset <strong>{selectedDataset?.name}</strong>.
                      </>
                    )}
                  </div>
                </div>
              )}

              {mode === 'existing' && selectedDataset && (
                <div style={{
                  padding: 12,
                  background: '#fef3c7',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#92400e',
                  lineHeight: 1.5,
                }}>
                  ℹ️ Esta vista compartirá los mismos items que las otras vistas del dataset "{selectedDataset.name}". Los cambios se sincronizarán en tiempo real.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            {step === 2 && !selectedFormat?.standalone && (
              <button
                onClick={() => setMode(mode === 'new' ? 'existing' : 'new')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                {mode === 'new' ? 'Usar Dataset Existente' : 'Crear Nuevo Dataset'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                Atrás
              </button>
            )}
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed()}
                style={{
                  padding: '8px 16px',
                  background: canProceed() ? '#10b981' : '#e2e8f0',
                  color: canProceed() ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                }}
              >
                Continuar
              </button>
            ) : step === 2 ? (
              <button
                onClick={() => setStep(3)}
                disabled={!canProceed()}
                style={{
                  padding: '8px 16px',
                  background: canProceed() ? '#10b981' : '#e2e8f0',
                  color: canProceed() ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                }}
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!canProceed() || loading}
                style={{
                  padding: '8px 16px',
                  background: canProceed() ? '#10b981' : '#e2e8f0',
                  color: canProceed() ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2} />
                    Crear Formato
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
