-- Crear tabla para guardar API keys de usuarios
-- Cada usuario puede tener múltiples API keys cifradas

CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'gemini', 'nano_banana'
    api_key_encrypted TEXT NOT NULL, -- API key cifrada
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::now()) NOT NULL,

    -- Restricción: un usuario no puede tener la misma provider duplicada como default
    UNIQUE(user_id, provider, is_default) WHERE is_default = true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- RLS (Row Level Security) policies
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias API keys
CREATE POLICY "Users can view own API keys"
    ON user_api_keys FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar sus propias API keys
CREATE POLICY "Users can insert own API keys"
    ON user_api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus propias API keys
CREATE POLICY "Users can update own API keys"
    ON user_api_keys FOR UPDATE
    USING (auth.uid() = user_id);

-- Política: Los usuarios pueden eliminar sus propias API keys
CREATE POLICY "Users can delete own API keys"
    ON user_api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Función para cifrar API keys (usando pgcrypto)
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- En producción, usar una clave de cifrado real
    -- Por ahora, usamos base64 simple (NO es seguro para producción)
    -- TODO: Implementar cifrado real con pgp_sym_encrypt
    RETURN encode(api_key::bytea, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para descifrar API keys
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decode(encrypted_key, 'base64'), 'bytea')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();