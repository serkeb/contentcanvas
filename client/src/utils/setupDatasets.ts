// Script para verificar las tablas de datasets en Supabase
import { supabase } from '../lib/supabase'

export async function setupDatasetTables() {
  console.log('🔍 Verificando tablas de datasets en Supabase...')

  try {
    // Verificar si la tabla datasets existe
    const { error: datasetsError } = await supabase
      .from('datasets')
      .select('id')
      .limit(1)

    if (datasetsError) {
      console.error('❌ Error: Las tablas de datasets no existen en Supabase')
      console.log('')
      console.log('📋 PARA ARREGLAR ESTE PROBLEMA:')
      console.log('1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard')
      console.log('2. Abre el SQL Editor')
      console.log('3. Ejecuta el siguiente script SQL:')
      console.log('')
      console.log('─── SCRIPT SQL ───')
      console.log(`
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dataset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  type TEXT,
  date DATE,
  start_date DATE,
  end_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[],
  platform TEXT,
  linked_node_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dataset_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('table', 'kanban', 'calendar', 'timeline')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_views ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own datasets" ON datasets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own datasets" ON datasets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own datasets" ON datasets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own datasets" ON datasets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view items from their datasets" ON dataset_items FOR SELECT USING (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_items.dataset_id AND datasets.user_id = auth.uid()));
CREATE POLICY "Users can insert items to their datasets" ON dataset_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_items.dataset_id AND datasets.user_id = auth.uid()));
CREATE POLICY "Users can update items in their datasets" ON dataset_items FOR UPDATE USING (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_items.dataset_id AND datasets.user_id = auth.uid()));
CREATE POLICY "Users can delete items from their datasets" ON dataset_items FOR DELETE USING (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_items.dataset_id AND datasets.user_id = auth.uid()));

CREATE POLICY "Users can view views from their datasets" ON dataset_views FOR SELECT USING (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_views.dataset_id AND datasets.user_id = auth.uid()));
CREATE POLICY "Users can insert views to their datasets" ON dataset_views FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_views.dataset_id AND datasets.user_id = auth.uid()));
CREATE POLICY "Users can update views in their datasets" ON dataset_views FOR UPDATE USING (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_views.dataset_id AND datasets.user_id = auth.uid()));
CREATE POLICY "Users can delete views from their datasets" ON dataset_views FOR DELETE USING (EXISTS (SELECT 1 FROM datasets WHERE datasets.id = dataset_views.dataset_id AND datasets.user_id = auth.uid()));

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE datasets;
ALTER PUBLICATION supabase_realtime ADD TABLE dataset_items;
ALTER PUBLICATION supabase_realtime ADD TABLE dataset_views;
      `)
      console.log('─── FIN DEL SCRIPT ───')
      console.log('')
      console.log('4. Recarga esta página después de ejecutar el script')
      console.log('')

      return false
    }

    console.log('✅ Tablas de datasets verificadas correctamente')
    return true

  } catch (error) {
    console.error('Error al verificar tablas:', error)
    return false
  }
}

// Función para llamar desde la consola del navegador
if (typeof window !== 'undefined') {
  (window as any).setupDatasetTables = setupDatasetTables
}
