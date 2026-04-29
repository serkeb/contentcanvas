import os
import sys
import json
import re
import subprocess
import tempfile
from urllib.request import urlopen, Request
from urllib.error import URLError
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from openai import OpenAI
from dotenv import load_dotenv

# Optional providers — imported lazily to avoid crash if not installed
try:
    import anthropic as _anthropic_sdk
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    import google.generativeai as _genai_sdk
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()

app = Flask(__name__)
CORS(app,
     origins=[
         "http://localhost:5173",
         "http://localhost:3000",
         "https://contentcanvass.vercel.app",
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# ── Instagram: instagrapi client cache (keyed by username) ────────────────────
_ig_clients = {}  # { ig_username: instagrapi.Client }

def get_ig_client(ig_user: str, ig_pass: str):
    """
    Returns an authenticated instagrapi Client for the given credentials.
    Reuses cached client if already logged in for this username.
    Raises RuntimeError with a user-friendly message on failure.
    """
    global _ig_clients
    if ig_user in _ig_clients:
        return _ig_clients[ig_user]

    try:
        from instagrapi import Client
        from instagrapi.exceptions import (
            BadPassword, InvalidUser, TwoFactorRequired,
            ChallengeRequired, LoginRequired,
        )
    except ImportError:
        raise RuntimeError("instagrapi no está instalado. Contactá al administrador.")

    cl = Client()
    cl.delay_range = [2, 5]  # polite delay between requests

    try:
        cl.login(ig_user, ig_pass)
    except BadPassword:
        raise RuntimeError("Contraseña incorrecta. Verificá tus credenciales de Instagram.")
    except InvalidUser:
        raise RuntimeError(f"La cuenta @{ig_user} no existe en Instagram.")
    except TwoFactorRequired:
        raise RuntimeError(
            "Tu cuenta tiene verificación en dos pasos activa. "
            "Usá una cuenta secundaria sin 2FA para el scraping."
        )
    except ChallengeRequired:
        raise RuntimeError(
            "Instagram detectó actividad inusual y pidió verificación. "
            "Intentá con otra cuenta o esperá unos minutos."
        )
    except LoginRequired:
        raise RuntimeError("No se pudo iniciar sesión. Verificá usuario y contraseña.")
    except Exception as e:
        raise RuntimeError(f"Error al conectar con Instagram: {str(e)}")

    _ig_clients[ig_user] = cl
    return cl

LLM_MODEL = "gpt-5.2-2025-12-11"


# ── YouTube helpers ───────────────────────────────────────────────────────────

def parse_vtt(vtt_path):
    """Parse a WebVTT subtitle file and return clean plain text."""
    try:
        with open(vtt_path, "r", encoding="utf-8", errors="ignore") as f:
            raw = f.read()
    except Exception:
        return ""

    lines = raw.splitlines()
    seen = set()
    out = []
    for line in lines:
        line = line.strip()
        # Skip header, timing lines, NOTE lines, empty lines, and cue IDs
        if not line:
            continue
        if line.startswith("WEBVTT") or line.startswith("NOTE") or line.startswith("Kind:") or line.startswith("Language:"):
            continue
        if "-->" in line:
            continue
        if re.match(r"^\d+$", line):
            continue
        # Strip VTT tags like <00:01:02.000><c> etc.
        cleaned = re.sub(r"<[^>]+>", "", line).strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            out.append(cleaned)

    return " ".join(out)


def chunk_with_ffmpeg(audio_file, tmpdir, chunk_duration_secs=480):
    """
    Split audio_file into ~8-minute chunks using ffmpeg subprocess.
    Returns list of chunk file paths, or empty list on failure.
    """
    # Get total duration via ffprobe
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", audio_file],
            capture_output=True, text=True, timeout=30
        )
        total_duration = float(probe.stdout.strip())
    except Exception as e:
        print(f"ffprobe failed: {e}")
        return []

    chunks = []
    start = 0
    idx = 0
    while start < total_duration:
        chunk_path = os.path.join(tmpdir, f"chunk_{idx}.mp3")
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", audio_file,
                 "-ss", str(start),
                 "-t", str(chunk_duration_secs),
                 "-ar", "16000", "-ac", "1", "-b:a", "32k",
                 chunk_path],
                capture_output=True, timeout=120
            )
            if os.path.exists(chunk_path) and os.path.getsize(chunk_path) > 0:
                chunks.append(chunk_path)
        except Exception as e:
            print(f"ffmpeg chunk {idx} failed: {e}")
        start += chunk_duration_secs
        idx += 1

    return chunks


@app.errorhandler(HTTPException)
def handle_http(e):
    return jsonify({"error": f"{e.name}: {e.description}"}), e.code

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


def get_client(api_key_override=None):
    """Return an OpenAI client. Uses override key first, then .env fallback."""
    api_key = api_key_override or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("No se encontró una API key de OpenAI. Configurala en los ajustes de la app o en .env")
    return OpenAI(api_key=api_key)


def _provider_from_model(model_id):
    """Detect provider from model name."""
    if not model_id:
        return "openai"
    m = model_id.lower()
    if m.startswith("claude"):
        return "anthropic"
    if m.startswith("gemini"):
        return "gemini"
    return "openai"


def llm_call(model, messages_with_system, api_keys, max_tokens=4000, temperature=0.7):
    """
    Unified LLM call routing to the right provider.

    messages_with_system = [{"role": "system", "content": "..."}, {"role": "user", ...}, ...]
    api_keys = {"openai": "sk-...", "anthropic": "sk-ant-...", "gemini": "AIza..."}

    Returns: (result_text, usage_dict)
    usage_dict = {"model": ..., "prompt_tokens": ..., "completion_tokens": ..., "total_tokens": ...}
    """
    provider = _provider_from_model(model)

    # ── OpenAI ──────────────────────────────────────────────────────────────────
    if provider == "openai":
        client = get_client(api_keys.get("openai"))
        response = client.chat.completions.create(
            model=model,
            messages=messages_with_system,
            max_completion_tokens=max_tokens,
            temperature=temperature,
        )
        usage = response.usage
        return response.choices[0].message.content, {
            "model":             model,
            "prompt_tokens":     usage.prompt_tokens     if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
            "total_tokens":      usage.total_tokens      if usage else 0,
        }

    # ── Anthropic ───────────────────────────────────────────────────────────────
    if provider == "anthropic":
        if not HAS_ANTHROPIC:
            raise ValueError("La librería 'anthropic' no está instalada. Ejecutá: pip install anthropic")
        key = api_keys.get("anthropic") or os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("No se encontró una API key de Anthropic. Configurala en los ajustes.")
        client = _anthropic_sdk.Anthropic(api_key=key)

        # Anthropic requires system separate from messages
        system_content = ""
        user_messages = []
        for m in messages_with_system:
            if m["role"] == "system":
                system_content = m["content"]
            else:
                user_messages.append({"role": m["role"], "content": m["content"]})

        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_content or "Sos experto en análisis de contenido para redes sociales hispanohablantes.",
            messages=user_messages,
        )
        usage = response.usage
        prompt_tokens     = usage.input_tokens  if usage else 0
        completion_tokens = usage.output_tokens if usage else 0
        return response.content[0].text, {
            "model":             model,
            "prompt_tokens":     prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens":      prompt_tokens + completion_tokens,
        }

    # ── Google Gemini ────────────────────────────────────────────────────────────
    if provider == "gemini":
        if not HAS_GEMINI:
            raise ValueError("La librería 'google-generativeai' no está instalada. Ejecutá: pip install google-generativeai")
        key = api_keys.get("gemini") or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise ValueError("No se encontró una API key de Google Gemini. Configurala en los ajustes.")
        _genai_sdk.configure(api_key=key)

        # Extract system instruction
        system_content = ""
        gemini_messages = []
        for m in messages_with_system:
            if m["role"] == "system":
                system_content = m["content"]
            elif m["role"] == "assistant":
                gemini_messages.append({"role": "model", "parts": [m["content"]]})
            else:
                gemini_messages.append({"role": "user", "parts": [m["content"]]})

        gen_model = _genai_sdk.GenerativeModel(
            model_name=model,
            system_instruction=system_content or None,
        )
        response = gen_model.generate_content(gemini_messages)
        usage_meta = getattr(response, "usage_metadata", None)
        prompt_tokens     = getattr(usage_meta, "prompt_token_count",     0) or 0
        completion_tokens = getattr(usage_meta, "candidates_token_count", 0) or 0
        return response.text, {
            "model":             model,
            "prompt_tokens":     prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens":      prompt_tokens + completion_tokens,
        }

    raise ValueError(f"Provider desconocido para el modelo: {model}")


@app.route("/health", methods=["GET"])
def health():
    openai_key = os.getenv("OPENAI_API_KEY")
    has_openai = bool(openai_key and openai_key.startswith("sk-"))
    return jsonify({
        "status":      "ok",
        "whisper":     has_openai,
        "gpt4o":       has_openai,
        "has_anthropic": HAS_ANTHROPIC,
        "has_gemini":    HAS_GEMINI,
    })


@app.route("/transcribe", methods=["POST"])
def transcribe():
    data = request.get_json()
    if not data or "url" not in data:
        return jsonify({"error": "Se requiere el campo 'url' en el cuerpo de la solicitud"}), 400

    url = data["url"].strip()
    if not url:
        return jsonify({"error": "La URL no puede estar vacía"}), 400

    is_youtube = "youtube.com" in url or "youtu.be" in url

    try:
        client = get_client()
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    try:
        import yt_dlp

        AUDIO_EXTS = {".m4a", ".mp3", ".mp4", ".webm", ".ogg", ".wav", ".flac"}
        WHISPER_LIMIT = 24 * 1024 * 1024  # 24MB

        with tempfile.TemporaryDirectory() as tmpdir:

            # ── STEP 1: YouTube auto-captions (handles any length instantly) ──
            if is_youtube:
                print("Intentando subtítulos automáticos de YouTube...")
                try:
                    sub_opts = {
                        "skip_download": True,
                        "writeautomaticsub": True,
                        "writesubtitles": True,
                        "subtitleslangs": ["es", "es-419", "en", "en-US", "en-GB", "pt", "pt-BR"],
                        "subtitlesformat": "vtt",
                        "outtmpl": os.path.join(tmpdir, "subs.%(ext)s"),
                        "quiet": True,
                        "no_warnings": True,
                    }
                    with yt_dlp.YoutubeDL(sub_opts) as ydl:
                        ydl.download([url])

                    vtt_file = next(
                        (os.path.join(tmpdir, f) for f in os.listdir(tmpdir) if f.endswith(".vtt")),
                        None
                    )
                    if vtt_file:
                        transcript_text = parse_vtt(vtt_file)
                        if transcript_text and len(transcript_text) > 100:
                            print(f"Subtítulos OK: {len(transcript_text)} chars")
                            lang_match = re.search(r"\.([a-z]{2,5})\.vtt$", vtt_file)
                            return jsonify({
                                "transcript": transcript_text,
                                "language": lang_match.group(1) if lang_match else "auto",
                                "source": "YouTube Subtitles"
                            })
                except Exception as e:
                    print(f"Sin subtítulos: {e}")

            # ── STEP 2: Download audio/video ─────────────────────────────────
            # YouTube: audio-only m4a streams exist (~128kbps, no ffmpeg needed)
            # TikTok/Instagram: NO audio-only streams — download mp4 directly
            # (Whisper accepts mp4 natively, no conversion needed)
            if is_youtube:
                fmt = "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best"
            else:
                fmt = "bestaudio[ext=mp4]/best[ext=mp4]/bestaudio/best"

            ydl_opts = {
                "format": fmt,
                "outtmpl": os.path.join(tmpdir, "audio.%(ext)s"),
                "quiet": True,
                "no_warnings": True,
            }

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
            except yt_dlp.utils.DownloadError as e:
                msg = str(e).lower()
                if "private" in msg:
                    return jsonify({"error": "El video es privado."}), 400
                if "not available" in msg or "does not exist" in msg:
                    return jsonify({"error": "El video no está disponible o fue eliminado."}), 400
                if "sign in" in msg or "login" in msg:
                    return jsonify({"error": "El video requiere iniciar sesión."}), 400
                if "403" in msg or "forbidden" in msg:
                    return jsonify({"error": "Acceso denegado al video. TikTok puede estar bloqueando la descarga temporalmente, intentá de nuevo en unos minutos."}), 429
                return jsonify({"error": f"No se pudo descargar el video: {str(e)}"}), 400

            # Find downloaded file
            audio_file = next(
                (os.path.join(tmpdir, f) for f in os.listdir(tmpdir)
                 if any(f.lower().endswith(ext) for ext in AUDIO_EXTS)),
                None
            )
            if not audio_file:
                return jsonify({"error": "No se encontró el archivo de audio descargado."}), 500

            file_size = os.path.getsize(audio_file)
            print(f"Descargado: {os.path.basename(audio_file)} ({file_size/(1024*1024):.1f} MB)")

            def whisper_transcribe(file_path):
                """Send a file to Whisper. Passes (name, bytes) tuple to avoid
                Windows path issues with the OpenAI SDK."""
                ext = os.path.splitext(file_path)[1].lower() or ".mp4"
                fname = "audio" + ext
                with open(file_path, "rb") as fh:
                    raw = fh.read()
                return client.audio.transcriptions.create(
                    model="whisper-1",
                    file=(fname, raw),
                    response_format="verbose_json"
                )

            # ── STEP 3: Whisper ───────────────────────────────────────────────
            if file_size <= WHISPER_LIMIT:
                response = whisper_transcribe(audio_file)
                audio_seconds = getattr(response, "duration", None)
                return jsonify({
                    "transcript": response.text,
                    "language": getattr(response, "language", "desconocido"),
                    "source": "Whisper",
                    "usage": {
                        "model": "whisper-1",
                        "audio_seconds": round(audio_seconds, 1) if audio_seconds else None,
                    }
                })

            # File too big — try ffmpeg chunking
            print(f"Archivo muy grande ({file_size/(1024*1024):.1f} MB), dividiendo con ffmpeg...")
            chunks = chunk_with_ffmpeg(audio_file, tmpdir, chunk_duration_secs=480)

            if not chunks:
                size_mb = file_size / (1024 * 1024)
                return jsonify({
                    "error": f"El archivo pesa {size_mb:.0f} MB (límite Whisper: 25 MB). "
                             f"Para YouTube, activá los subtítulos automáticos en el video. "
                             f"Para TikTok/Instagram los videos son cortos y no deberían tener este problema."
                }), 400

            transcript_parts = []
            detected_language = "desconocido"
            total_audio_seconds = 0.0
            for i, chunk_path in enumerate(chunks):
                try:
                    print(f"  Parte {i+1}/{len(chunks)}...")
                    resp = whisper_transcribe(chunk_path)
                    transcript_parts.append(resp.text)
                    detected_language = getattr(resp, "language", detected_language)
                    total_audio_seconds += getattr(resp, "duration", 0) or 0
                except Exception as e:
                    print(f"  Error parte {i+1}: {e}")

            if not transcript_parts:
                return jsonify({"error": "No se pudo transcribir el audio."}), 500

            return jsonify({
                "transcript": " ".join(transcript_parts),
                "language": detected_language,
                "source": "Whisper (chunks)",
                "usage": {
                    "model": "whisper-1",
                    "audio_seconds": round(total_audio_seconds, 1) if total_audio_seconds else None,
                }
            })

    except Exception as e:
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500


@app.route("/extract-doc", methods=["POST"])
def extract_doc():
    """Extract text from a PDF/TXT file upload or a public Google Docs URL."""

    # ── File upload ──────────────────────────────────────────────────────────────
    if request.files.get("file"):
        file = request.files["file"]
        filename = file.filename or ""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if ext == "pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file.stream)
                pages_text = [page.extract_text() or "" for page in reader.pages]
                text = "\n".join(pages_text).strip()
                if not text:
                    return jsonify({"error": "El PDF no contiene texto extraíble (puede ser un PDF escaneado)."}), 400
                return jsonify({"text": text[:30000], "name": filename, "type": "pdf", "pages": len(reader.pages)})
            except Exception as e:
                return jsonify({"error": f"Error al leer el PDF: {str(e)}"}), 500

        elif ext in ("txt", "md", "csv"):
            try:
                text = file.read().decode("utf-8", errors="ignore").strip()
                return jsonify({"text": text[:30000], "name": filename, "type": ext})
            except Exception as e:
                return jsonify({"error": f"Error al leer el archivo: {str(e)}"}), 500

        else:
            return jsonify({"error": f"Formato '.{ext}' no soportado. Usá PDF, TXT o MD."}), 400

    # ── URL (Google Docs) ────────────────────────────────────────────────────────
    data = request.get_json(silent=True)
    url = (data.get("url") or "").strip() if data else ""
    if not url:
        return jsonify({"error": "Enviá un archivo o una URL de Google Docs."}), 400

    gdoc_match = re.search(r"docs\.google\.com/document/d/([a-zA-Z0-9_-]+)", url)
    if not gdoc_match:
        return jsonify({"error": "URL no reconocida. Pegá un link de Google Docs público."}), 400

    doc_id = gdoc_match.group(1)
    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
    try:
        req = Request(export_url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                return jsonify({"error": "No se pudo acceder al documento. Verificá que sea público."}), 400
            text = resp.read().decode("utf-8", errors="ignore").strip()
        if not text:
            return jsonify({"error": "El documento parece estar vacío."}), 400
        return jsonify({"text": text[:30000], "name": "Google Doc", "type": "gdoc"})
    except URLError as e:
        return jsonify({"error": "No se pudo acceder al documento. Asegurate de que sea público y el link sea correcto."}), 400
    except Exception as e:
        return jsonify({"error": f"Error al obtener el documento: {str(e)}"}), 500


@app.route("/script-knowledge", methods=["GET"])
def script_knowledge():
    """Get script knowledge PDFs content for ScriptNode."""
    try:
        import pypdf

        script_dir = os.path.join(os.path.dirname(__file__), "docs", "scripts")
        knowledge = {}

        pdf_files = {
            "hooks": "Hooks.pdf",
            "autoridad": "Autoridad.pdf",
            "conversion": "Conversión de ventas.pdf",
            "engagement": "Engagement.pdf"
        }

        for key, filename in pdf_files.items():
            file_path = os.path.join(script_dir, filename)
            if os.path.exists(file_path):
                try:
                    with open(file_path, "rb") as f:
                        reader = pypdf.PdfReader(f)
                        pages_text = [page.extract_text() or "" for page in reader.pages]
                        text = "\n".join(pages_text).strip()
                        knowledge[key] = {
                            "text": text[:40000],  # Limit to 40KB per PDF
                            "pages": len(reader.pages),
                            "filename": filename
                        }
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
                    knowledge[key] = {"text": "", "error": str(e)}

        return jsonify(knowledge)

    except Exception as e:
        return jsonify({"error": f"Error al cargar documentos de conocimiento: {str(e)}"}), 500


@app.route("/script-with-knowledge", methods=["POST"])
def script_with_knowledge():
    """
    Genera un guión usando el conocimiento de los PDFs de hooks, autoridad, conversión y engagement.
    Input: {
      "platform": "tiktok|instagram|youtube|linkedin",
      "format": "reel|carrusel|post|hilo|guion",
      "duration": "15s|30s|60s|90s|3min",
      "goal": "entretener|educar|vender|viralizar|posicionar",
      "topic": "tema del contenido",
      "videoType": "autoridad|conversion|engagement",  // Opcional
      "brandVoice": {...},  // Opcional
      "transcripts": [...]  // Opcional
    }
    """
    try:
        import pypdf
        client = get_client()

        # Cargar conocimientos de los PDFs
        script_dir = os.path.join(os.path.dirname(__file__), "docs", "scripts")
        knowledge = {}

        pdf_files = {
            "hooks": "Hooks.pdf",
            "autoridad": "Autoridad.pdf",
            "conversion": "Conversión de ventas.pdf",
            "engagement": "Engagement.pdf"
        }

        for key, filename in pdf_files.items():
            file_path = os.path.join(script_dir, filename)
            if os.path.exists(file_path):
                try:
                    with open(file_path, "rb") as f:
                        reader = pypdf.PdfReader(f)
                        pages_text = [page.extract_text() or "" for page in reader.pages]
                        text = "\n".join(pages_text).strip()
                        knowledge[key] = text[:50000]  # 50KB por PDF
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
                    knowledge[key] = ""

        data = request.get_json()
        platform = data.get("platform", "tiktok")
        format_type = data.get("format", "reel")
        duration = data.get("duration", "30s")
        goal = data.get("goal", "entretener")
        topic = data.get("topic", "")
        video_type = data.get("videoType", "")
        brand_voice = data.get("brandVoice")
        person_name = data.get("personName", "el creador")
        transcripts = data.get("transcripts", [])

        # Build system prompt con los conocimientos
        system_prompt = """Sos un experto en creación de contenido para redes sociales. Tu objetivo es generar guiones efectivos que capturen la atención y generen resultados."""

        # Agregar conocimiento de hooks
        if knowledge.get("hooks"):
            system_prompt += f"""

# CONOCIMIENTO DE HOOKS
Estos son ganchos efectivos que podés usar como apertura. ELEGÍ EL MEJOR HOOK que se adapte al tema y objetivo del video:

{knowledge['hooks']}

IMPORTANTE: Seleccioná y adaptá UN hook de esta lista que mejor se adapte al tema. No inventes hooks genéricos."""

        # Agregar conocimiento según el tipo de video
        if video_type and knowledge.get(video_type):
            type_labels = {
                "autoridad": "AUTORIDAD (posicionamiento de expertise)",
                "conversion": "CONVERSIÓN DE VENTAS",
                "engagement": "ENGAGEMENT (interacción y viralidad)"
            }
            system_prompt += f"""

# CONOCIMIENTO DE {type_labels.get(video_type, video_type.upper())}

Aplicá estos principios para crear el guión:

{knowledge[video_type]}"""

        # Agregar BrandVoice si existe
        if brand_voice:
            system_prompt += f"""

# BRANDVOICE - PERSONALIDAD DEL CREADOR
Actuá como si fueras {person_name}. Usá su voz, tono y estilo únicos.
- Voz en una frase: {brand_voice.get('vozEnUnaFrase', 'No disponible')}
- Rasgos: {brand_voice.get('rasgos', 'No disponible')}
- Dice mucho: {brand_voice.get('loQueDiceMucho', 'No disponible')}
- Evitar: {brand_voice.get('loQueDebeEvitar', 'No disponible')}
- Pilares: {brand_voice.get('pilares', 'No disponible')}"""

        # Agregar contexto de transcripciones si existen
        topic_context = topic.strip()
        if transcripts and not topic_context:
            # Si no hay topic, usar el título del primer video como referencia
            first_title = transcripts[0].get('title', '')
            if first_title:
                topic_context = f"basado en: {first_title[:100]}"

        if transcripts:
            system_prompt += "\n\n# MATERIAL DE REFERENCIA\n\n"
            system_prompt += "Usá este contenido como inspiración y referencia. Podés extraer ideas, estructuras y ángulos de estos videos.\n\n"
            for i, t in enumerate(transcripts[:2], 1):
                title = t.get('title') or t.get('url', 'Fuente sin título')
                trans = t.get('transcript', '')[:4000]
                system_prompt += f"## Video {i}: {title}\n{trans}\n\n"

        # User prompt con la configuración
        platform_labels = {
            "tiktok": "TikTok", "instagram": "Instagram", "youtube": "YouTube", "linkedin": "LinkedIn"
        }
        format_labels = {
            "reel": "Reel/Short", "carrusel": "Carrusel", "post": "Post",
            "hilo": "Hilo", "guion": "Guión largo"
        }

        # Determinar el tema a usar
        effective_topic = topic_context if topic_context else "un tema relacionado con el material de referencia"

        user_prompt = f"""# CONFIGURACIÓN
- Plataforma: {platform_labels.get(platform, platform)}
- Formato: {format_labels.get(format_type, format_type)}
- Duración: {duration}
- Objetivo: {goal}
- Tema: {effective_topic}

# INSTRUCCIONES ESPECÍFICAS
Generá AHORA MISMO un guión completo y listo para grabar. NO pidas más información. NO inventes preguntas. Usá el tema especificado y, si hay material de referencia, inspirate en él.

# PASOS A SEGUIR
1. **HOOK**: Elegí UN hook de la lista de hooks que mejor se adapte al tema. NO inventes hooks genéricos.
2. **DESARROLLO**: Creá 3-5 puntos clave concretos y accionables. {f"Aplicá los principios de {video_type}." if video_type else ""}
3. **CTA**: Un llamado a la acción específico y directo.

# FORMATO DE SALIDA (markdown completo)

## 🎣 HOOK
[Tu hook seleccionado y adaptado - máximo 2 líneas]

## 📖 DESARROLLO
- **Punto 1**: [Descripción clara]
- **Punto 2**: [Descripción clara]
- **Punto 3**: [Descripción clara]
- **Punto 4**: [Descripción clara]
- **Punto 5**: [Descripción clara]

## 🎯 CTA
[Tu llamado a la acción - 1 línea clara y directa]

## 📝 NOTAS DE PRODUCCIÓN
- **Visual**: [Sugerencia visual]
- **Audio**: [Sugerencia de audio/música]
- **Edición**: [Tip de edición]

Generá el guión completo AHORA."""

        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.8,
            max_completion_tokens=4000
        )

        return jsonify({"result": response.choices[0].message.content})

    except Exception as e:
        return jsonify({"error": f"Error al generar guión con conocimiento: {str(e)}"}), 500


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data or "transcript" not in data:
        return jsonify({"error": "Se requiere el campo 'transcript' en el cuerpo de la solicitud"}), 400

    transcript = data["transcript"].strip()
    platform = data.get("platform", "desconocida")

    if not transcript:
        return jsonify({"error": "La transcripción no puede estar vacía"}), 400

    if len(transcript) < 20:
        return jsonify({"error": "La transcripción es demasiado corta para analizarla. Asegurate de que el video tenga contenido hablado."}), 400

    try:
        client = get_client()
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    system_prompt = "Sos experto en estrategia de contenido para redes sociales hispanohablantes."

    user_prompt = f"""Analizá esta transcripción de un video de {platform} y respondé SOLO con un JSON válido sin markdown, sin bloques de código, sin explicaciones. El JSON debe tener exactamente esta estructura:

{{
  "analysis": "análisis detallado del hook (primeros segundos), estructura narrativa del video, temas principales abordados y CTA detectado al final",
  "ideas": ["idea de contenido 1 basada en este video", "idea 2", "idea 3", "idea 4", "idea 5", "idea 6", "idea 7", "idea 8"],
  "script": "HOOK\\n[texto del hook para un nuevo video sobre este tema]\\n\\nDESARROLLO\\n[3-5 puntos de desarrollo del contenido]\\n\\nCTA\\n[llamada a la acción final]"
}}

TRANSCRIPCIÓN:
{transcript[:8000]}

Respondé ÚNICAMENTE con el JSON, sin texto adicional antes ni después."""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_completion_tokens=2000
        )

        content = response.choices[0].message.content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])

        result = json.loads(content)

        required_keys = ["analysis", "ideas", "script"]
        for key in required_keys:
            if key not in result:
                raise ValueError(f"El JSON no contiene el campo '{key}'")

        return jsonify(result)

    except json.JSONDecodeError as e:
        return jsonify({"error": f"GPT-4o devolvió una respuesta que no es JSON válido: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error al analizar el contenido: {str(e)}"}), 500


@app.route("/scrape-profile", methods=["POST"])
def scrape_profile():
    """
    Scrapea los últimos videos de un perfil de TikTok o Instagram.
    Input: { "platform": "tiktok|instagram", "username": "@usuario", "amount": 10 }
    Output: Lista de videos con metadata
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Se requiere el cuerpo JSON con platform y username"}), 400

    platform = data.get("platform", "").lower()
    username = data.get("username", "").strip()
    amount   = int(data.get("amount", 10))
    sort_by  = data.get("sort_by", "recent")   # "recent" | "viral" | "liked"
    ig_user  = data.get("ig_user", "").strip()
    ig_pass  = data.get("ig_pass", "").strip()

    # For viral/liked we need a large pool to sort from — fetching only
    # `amount` recents would miss older high-performing videos entirely.
    # We fetch up to 150 videos and then sort+trim to the requested amount.
    if sort_by in ("viral", "liked"):
        fetch_amount = max(150, amount * 10)
    else:
        fetch_amount = amount

    if platform not in ("tiktok", "instagram"):
        return jsonify({"error": "Plataforma no soportada. Usá 'tiktok' o 'instagram'"}), 400

    if not username:
        return jsonify({"error": "El campo 'username' es requerido"}), 400

    # Limpiar username (quitar @ si existe)
    username = username.lstrip("@")

    try:
        # ── INSTAGRAM: instagrapi ─────────────────────────────────────────────
        if platform == "instagram":
            if not ig_user or not ig_pass:
                return jsonify({
                    "error": "Ingresá tu usuario y contraseña de Instagram para continuar.",
                    "error_code": "IG_NO_CREDENTIALS",
                }), 400

            try:
                cl = get_ig_client(ig_user, ig_pass)
            except RuntimeError as e:
                # Clear cached client so next attempt re-authenticates
                _ig_clients.pop(ig_user, None)
                return jsonify({"error": str(e)}), 401

            try:
                user_info = cl.user_info_by_username(username)
            except Exception as e:
                err = str(e).lower()
                if "not found" in err or "user_not_found" in err:
                    return jsonify({"error": f"No se encontró el perfil @{username}."}), 404
                return jsonify({"error": f"Error al obtener el perfil: {str(e)}"}), 400

            profile_data = {
                "avatar":    str(user_info.profile_pic_url or ""),
                "name":      user_info.full_name or f"@{username}",
                "username":  user_info.username or username,
                "bio":       user_info.biography or "",
                "followers": user_info.follower_count or 0,
                "following": user_info.following_count or 0,
            }

            # Fetch reels — instagrapi clips endpoint, falls back to user_medias
            pool = fetch_amount if sort_by in ("viral", "liked") else amount
            videos = []
            try:
                clips = cl.user_clips(user_info.pk, amount=pool)
                for media in clips:
                    url = f"https://www.instagram.com/reel/{media.code}/"
                    thumb = str(media.thumbnail_url or "")
                    caption = (media.caption_text or "")[:120]
                    videos.append({
                        "url":      url,
                        "title":    caption,
                        "views":    media.play_count or media.view_count or 0,
                        "likes":    media.like_count or 0,
                        "comments": media.comment_count or 0,
                        "duration": media.video_duration or 0,
                        "thumbnail": thumb,
                    })
            except Exception:
                pass

            # Fallback: general user medias (videos only)
            if not videos:
                try:
                    medias = cl.user_medias(user_info.pk, amount=pool)
                    for media in medias:
                        if media.media_type != 2:  # 2 = video/reel
                            continue
                        url = f"https://www.instagram.com/p/{media.code}/"
                        thumb = str(media.thumbnail_url or "")
                        caption = (media.caption_text or "")[:120]
                        videos.append({
                            "url":      url,
                            "title":    caption,
                            "views":    media.play_count or media.view_count or 0,
                            "likes":    media.like_count or 0,
                            "comments": media.comment_count or 0,
                            "duration": media.video_duration or 0,
                            "thumbnail": thumb,
                        })
                except Exception:
                    pass

            if not videos:
                return jsonify({"error": f"No se encontraron Reels en @{username}. Verificá que el perfil sea público."}), 404

            if sort_by == "viral":
                videos.sort(key=lambda v: v["views"], reverse=True)
            elif sort_by == "liked":
                videos.sort(key=lambda v: v["likes"], reverse=True)
            videos = videos[:amount]

            return jsonify({
                "platform":    platform,
                "username":    username,
                "profile_url": f"https://www.instagram.com/{username}/",
                "profile":     profile_data,
                "video_count": len(videos),
                "videos":      videos,
            })

        # ── TIKTOK: yt-dlp ───────────────────────────────────────────────────
        elif platform == "tiktok":
            import yt_dlp

            profile_url = f"https://www.tiktok.com/@{username}"

            # extract_flat gives us fast metadata (no video download).
            # view_count/like_count ARE included in TikTok flat entries.
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": True,
                "playlistend": fetch_amount,
                "skip_download": True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(profile_url, download=False)
                except yt_dlp.utils.DownloadError as e:
                    err = str(e).lower()
                    if "private" in err or "not found" in err:
                        return jsonify({"error": f"El perfil @{username} es privado o no existe."}), 404
                    return jsonify({"error": f"Error al acceder al perfil de TikTok: {str(e)}"}), 400

                if not info:
                    return jsonify({"error": f"No se pudo encontrar el perfil @{username}"}), 404

                profile_data = {
                    "avatar":    info.get("thumbnail", ""),
                    "name":      info.get("uploader") or info.get("channel") or f"@{username}",
                    "username":  info.get("uploader_id") or username,
                    "bio":       info.get("description") or "",
                    "followers": info.get("channel_follower_count") or 0,
                    "following": 0,
                }

                videos = []
                for entry in (info.get("entries") or []):
                    video_url = entry.get("webpage_url") or entry.get("url")
                    if not video_url:
                        continue
                    thumbnail = entry.get("thumbnail")
                    if not thumbnail and entry.get("thumbnails"):
                        thumbnail = entry["thumbnails"][-1].get("url")

                    view_count = (entry.get("view_count") or
                                  entry.get("views") or 0)
                    like_count = (entry.get("like_count") or
                                  entry.get("likes") or 0)

                    videos.append({
                        "url":         video_url,
                        "title":       (entry.get("title") or "")[:120],
                        "description": (entry.get("description") or ""),
                        "views":       view_count,
                        "likes":       like_count,
                        "comments":    entry.get("comment_count") or 0,
                        "saves":       entry.get("save_count") or 0,
                        "shares":      entry.get("repost_count") or 0,
                        "duration":    entry.get("duration") or 0,
                        "thumbnail":   thumbnail or "",
                    })

                # Sort and trim to requested amount.
                # If extract_flat returned no view/like counts (all zeros),
                # do a full metadata fetch on a sample to get real numbers.
                if sort_by in ("viral", "liked"):
                    has_counts = sum(1 for v in videos if v["views"] > 0 or v["likes"] > 0)
                    if has_counts < len(videos) * 0.3 and videos:
                        # Less than 30% have counts — flat extract didn't include stats.
                        # Re-fetch without extract_flat to get real metadata.
                        ydl_full_opts = {
                            "quiet": True,
                            "no_warnings": True,
                            "skip_download": True,
                            "playlistend": fetch_amount,
                        }
                        try:
                            with yt_dlp.YoutubeDL(ydl_full_opts) as ydl2:
                                info2 = ydl2.extract_info(profile_url, download=False)
                                if info2 and info2.get("entries"):
                                    videos = []
                                    for entry in info2["entries"]:
                                        video_url = entry.get("webpage_url") or entry.get("url")
                                        if not video_url:
                                            continue
                                        thumbnail = entry.get("thumbnail")
                                        if not thumbnail and entry.get("thumbnails"):
                                            thumbnail = entry["thumbnails"][-1].get("url")
                                        videos.append({
                                            "url":         video_url,
                                            "title":       (entry.get("title") or "")[:120],
                                            "description": (entry.get("description") or ""),
                                            "views":       entry.get("view_count") or entry.get("views") or 0,
                                            "likes":       entry.get("like_count") or entry.get("likes") or 0,
                                            "comments":    entry.get("comment_count") or 0,
                                            "saves":       entry.get("save_count") or 0,
                                            "shares":      entry.get("repost_count") or 0,
                                            "duration":    entry.get("duration") or 0,
                                            "thumbnail":   thumbnail or "",
                                        })
                        except Exception:
                            pass  # keep original flat results if full fetch fails

                if sort_by == "viral":
                    videos.sort(key=lambda v: v["views"], reverse=True)
                elif sort_by == "liked":
                    videos.sort(key=lambda v: v["likes"], reverse=True)
                videos = videos[:amount]

                if not videos:
                    return jsonify({"error": f"No se encontraron videos en @{username}. Verificá que el perfil sea público."}), 404

                return jsonify({
                    "platform":    platform,
                    "username":    username,
                    "profile_url": profile_url,
                    "profile":     profile_data,
                    "video_count": len(videos),
                    "videos":      videos,
                    "sort_by":     sort_by,
                })

    except Exception as e:
        return jsonify({"error": f"Error al scrapear el perfil: {str(e)}"}), 500


@app.route("/analyze-profile", methods=["POST"])
def analyze_profile():
    """
    Analiza un perfil completo de un creador.
    Obtiene los últimos N videos, los transcribe, y genera un análisis estratégico completo.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Se requiere el cuerpo JSON"}), 400

    platform = data.get("platform", "").lower()
    username = data.get("username", "").strip()
    amount = data.get("amount", 10)

    if platform not in ("tiktok", "instagram"):
        return jsonify({"error": "Plataforma no soportada"}), 400

    username = username.lstrip("@")

    try:
        client = get_client()
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    try:
        # 1. Obtener videos del perfil
        videos = []

        if platform == "instagram":
            # Usar instagrapi para Instagram
            try:
                from instagrapi import Client

                cl = Client()
                cl.login(os.getenv("INSTAGRAM_USER", ""), os.getenv("INSTAGRAM_PASS", ""))

                user_id = cl.user_id_from_username(username)
                medias = cl.user_medias(user_id, amount=amount)

                for media in medias:
                    if media.media_type == 2:  # Video
                        video_url = cl.video_download(media.pk)
                        videos.append({
                            "url": video_url,
                            "title": (media.caption or "")[:100] if media.caption else "",
                            "views": media.play_count,
                            "likes": media.like_count,
                        })

            except Exception as e:
                error_msg = str(e)
                if "login_required" in error_msg.lower() or "challenge" in error_msg.lower():
                    return jsonify({"error": "Instagram requiere login. Configá INSTAGRAM_USER y INSTAGRAM_PASS en .env o usá TikTok."}), 400
                else:
                    return jsonify({"error": f"Error con Instagram: {error_msg}. Probá con TikTok."}), 400

        elif platform == "tiktok":
            # Usar yt-dlp para TikTok
            import yt_dlp

            profile_url = f"https://www.tiktok.com/@{username}"
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": True,
                "playlistend": amount,
                "skip_download": True,
            }

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(profile_url, download=False)

                    if not info:
                        return jsonify({"error": f"No se pudo encontrar el perfil @{username}"}), 404

                    entries = info.get("entries") or []

                    if not entries:
                        return jsonify({"error": f"El perfil @{username} no tiene videos públicos o está privado"}), 404

                    for entry in entries[:amount]:
                        video_url = entry.get("webpage_url") or entry.get("url")
                        if video_url:
                            videos.append({
                                "url": video_url,
                                "title": entry.get("title", "")[:100] if entry.get("title") else f"Video @{username}",
                                "views": entry.get("view_count", 0),
                                "likes": entry.get("like_count", 0),
                            })

            except yt_dlp.utils.DownloadError as e:
                error_msg = str(e).lower()
                if "private" in error_msg or "not found" in error_msg or "does not exist" in error_msg:
                    return jsonify({"error": f"El perfil @{username} es privado o no existe"}), 404
                elif "too many requests" in error_msg or "rate limit" in error_msg:
                    return jsonify({"error": "TikTok está limitando solicitudes. Esperá unos minutos y probá de nuevo."}), 429
                else:
                    return jsonify({"error": f"No se pudo acceder al perfil de TikTok: {str(e)}"}), 400
            except Exception as e:
                return jsonify({"error": f"Error inesperado al acceder a TikTok: {str(e)}"}), 500

        if not videos:
            return jsonify({"error": "No se encontraron videos públicos"}), 404

        # 2. Transcribir cada video
        transcripts_data = []
        with tempfile.TemporaryDirectory() as tmpdir:
            ydl_download_opts = {
                "format": "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best",
                "outtmpl": os.path.join(tmpdir, "audio_%(autonumber)d.%(ext)s"),
                "quiet": True,
                "no_warnings": True,
            }

            AUDIO_EXTS = {".m4a", ".mp3", ".mp4", ".webm", ".ogg", ".wav", ".flac"}

            for idx, video in enumerate(videos):
                try:
                    # Descargar audio
                    with yt_dlp.YoutubeDL(ydl_download_opts) as ydl:
                        ydl.download([video["url"]])

                    # Encontrar archivo de audio
                    audio_file = None
                    for f in os.listdir(tmpdir):
                        if f.startswith(f"audio_{idx+1}") and any(f.lower().endswith(ext) for ext in AUDIO_EXTS):
                            audio_file = os.path.join(tmpdir, f)
                            break

                    if not audio_file:
                        continue

                    # Transcribir
                    with open(audio_file, "rb") as f:
                        response = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=f,
                            response_format="text"
                        )

                    transcripts_data.append({
                        "url": video["url"],
                        "platform": platform,
                        "title": video["title"],
                        "transcript": response,
                        "views": video.get("views"),
                        "likes": video.get("likes"),
                    })

                except Exception as e:
                    print(f"Error procesando video {idx+1}: {e}")
                    continue

        if not transcripts_data:
            return jsonify({"error": "No se pudo transcribir ningún video. Verificá que los videos tengan audio."}), 400

        # 3. Análisis estratégico completo con GPT-4o
        analysis_prompt = f"""Actuá como analista experto en estrategia de contenido digital.

Analizá el perfil del creador @{username} en {platform} basándote en {len(transcripts_data)} videos recientes.

Generá un reporte estratégico completo con:

## 1. PERFIL DEL CREADOR
- Nicho/temática principal
- Tono de voz y personalidad comunicativa
- Nivel de autoridad y posicionamiento
- Estilo de producción

## 2. ANÁLISIS DE CONTENIDO RECIENTE
Para cada video analizado:
- Hook/apertura useda
- Estructura narrativa
- Tema principal
- CTA o cierre
- Engagement (views/likes si está disponible)

## 3. PATRONES DE CONTENIDO
- Formatos que usa (tutorial, historia, opinión, etc.)
- Frecuencia de temas
- Estructuras repetitivas detectadas
- Técnicas de retención

## 4. ESTRATEGIA DETECTADA
- Objetivos del contenido (autoridad, entretenimiento, ventas, comunidad)
- Audiencia objetivo
- Pilares de contenido
- Potential funnel o monetización

## 5. TONO Y VOZ
- Nivel de formalidad
- Vocabulario característico
- Recursos retóricos
- Relación con la audiencia

## 6. ESTRUCTURAS NARRATIVAS
- Estructura preferida (problema-solución, historia-lección, etc.)
- Patrones de apertura
- Técnicas de cierre

## 7. HOOKS Y FRASES DESTACADAS
- Lista de 10-15 hooks/ openings efectivos
- Frases reutilizables
- Fórmulas detectadas

## 8. OPORTUNIDADES Y BRECHAS
- Temas que NO cubre
- Preguntas sin responder
- Ángulos únicos disponibles
- Contradicciones o vacíos

## 9. 20 IDEAS DE CONTENIDO DERIVADAS
Ideas específicas basadas en su estilo para:
- Videos cortos (30-60s)
- Videos medianos (1-3min)
- Series de contenido
- Contenido de autoridad

## 10. RECOMENDACIONES
- Qué replicar
- Qué evitar
- Cómo diferenciarse
- Próximos pasos

---
TRANSCRIPCIONES DE LOS VIDEOS:
"""

        for i, t in enumerate(transcripts_data, 1):
            analysis_prompt += f"\n\n### VIDEO {i}: {t['title']}\n"
            analysis_prompt += f"URL: {t['url']}\n"
            if t.get('views'):
                analysis_prompt += f"Views: {t['views']:,}\n"
            if t.get('likes'):
                analysis_prompt += f"Likes: {t['likes']:,}\n"
            analysis_prompt += f"\n{t['transcript'][:3000]}\n"

        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "Sos un analista experto en estrategia de contenido para redes sociales hispanohablantes. Respondé en español con formato markdown."},
                {"role": "user", "content": analysis_prompt}
            ],
            temperature=0.7,
            max_completion_tokens=6000
        )

        analysis = response.choices[0].message.content

        return jsonify({
            "platform": platform,
            "username": username,
            "profile_url": profile_url,
            "video_count": len(transcripts_data),
            "videos": transcripts_data,
            "analysis": analysis
        })

    except Exception as e:
        return jsonify({"error": f"Error al analizar el perfil: {str(e)}"}), 500


@app.route("/llm", methods=["POST"])
def llm():
    data = request.get_json()
    messages    = data.get("messages")    or []
    transcripts = data.get("transcripts") or []
    documents   = data.get("documents")   or []
    model       = (data.get("model") or LLM_MODEL).strip()
    # API keys sent from the frontend (fallback to env if not provided)
    api_keys    = data.get("api_keys") or {}

    if not messages:
        return jsonify({"error": "Se requiere al menos un mensaje para el nodo LLM"}), 400

    # Build system message
    system_content = (
        "Sos experto en análisis de contenido para redes sociales hispanohablantes. "
        "Respondé de manera clara, estructurada y accionable en español. "
        "Usá markdown para estructurar tu respuesta: encabezados, listas y negritas donde corresponda."
    )

    # Separate BrandVoice from regular transcripts
    brandvoice_items = [t for t in transcripts if t.get("isBrandVoice") or t.get("platform") == "BRANDVOICE"]
    regular_transcripts = [t for t in transcripts if not t.get("isBrandVoice") and t.get("platform") != "BRANDVOICE"]

    # Append BrandVoice context first (if any)
    if brandvoice_items:
        system_content += "\n\n## BRANDVOICE CONTEXT\n\n"
        for bv in brandvoice_items:
            person_name = bv.get("personName") or "BrandVoice"
            brand_voice_data = bv.get("brandVoiceData") or {}

            # Build a comprehensive BrandVoice context
            bv_context = f"""### {person_name}

**Resumen Ejecutivo:**
{brand_voice_data.get("resumenReutilizable") or "No disponible"}

---

**Esencia de marca:**
{brand_voice_data.get("esencia") or "No disponible"}

**Posicionamiento:**
{brand_voice_data.get("posicionamiento") or "No disponible"}

**Audiencia ideal:**
{brand_voice_data.get("audiencia") or "No disponible"}

**Brand Voice (tono y estilo):**
{brand_voice_data.get("brandVoice") or "No disponible"}

**Voz en una frase:**
{brand_voice_data.get("vozEnUnaFrase") or "No disponible"}

**Rasgos de comunicación:**
{brand_voice_data.get("rasgos") or "No disponible"}

**Lo que esta marca dice mucho:**
{brand_voice_data.get("loQueDiceMucho") or "No disponible"}

**Lo que esta marca debe evitar:**
{brand_voice_data.get("loQueDebeEvitar") or "No disponible"}

**Pilares de contenido:**
{brand_voice_data.get("pilares") or "No disponible"}

**Promesa de marca:**
{brand_voice_data.get("promesa") or "No disponible"}

**Mensaje central:**
{brand_voice_data.get("mensajeCentral") or "No disponible"}

"""
            system_content += bv_context

    # Append video/document transcripts as context, grouped by collection
    if regular_transcripts:
        MAX_CHARS_PER_ITEM = 3000
        MAX_TOTAL_CHARS = 12000
        total_chars = 0

        # Separate by collection (preserving insertion order)
        collections = {}   # collection_name -> [items]
        standalone = []    # items with no collection

        for t in regular_transcripts:
            coll = t.get("collection")
            if coll:
                collections.setdefault(coll, []).append(t)
            else:
                standalone.append(t)

        def fmt_item(t, idx):
            nonlocal total_chars
            platform = t.get("platform", "?")
            url      = t.get("url", "")
            title    = t.get("title") or ""
            raw      = (t.get("transcript") or "")[:MAX_CHARS_PER_ITEM]
            remaining = MAX_TOTAL_CHARS - total_chars
            if remaining <= 0:
                return f"  [{idx}] {title or platform} — [omitido por límite de contexto]"
            chunk = raw[:remaining]
            total_chars += len(chunk)
            header = f"  [{idx}] {platform}"
            if title: header += f" — {title}"
            if url:   header += f"\n      {url}"
            return f"{header}\n\n{chunk}"

        context_blocks = []
        item_idx = 1

        # Collections first
        for coll_name, items in collections.items():
            block = f'┌── COLECCIÓN: "{coll_name}" ──────────────────────────\n'
            entries = []
            for t in items:
                entries.append(fmt_item(t, item_idx))
                item_idx += 1
            block += "\n\n".join(entries)
            context_blocks.append(block)

        # Then standalone videos / docs / text nodes
        if standalone:
            label = "CONTENIDO INDIVIDUAL" if collections else "CONTENIDO CONECTADO"
            block = f"┌── {label} ──────────────────────────\n"
            entries = []
            for t in standalone:
                entries.append(fmt_item(t, item_idx))
                item_idx += 1
            block += "\n\n".join(entries)
            context_blocks.append(block)

        system_content += "\n\n## FUENTES DE CONTENIDO:\n\n" + "\n\n".join(context_blocks)

    # Append attached documents
    if documents:
        MAX_DOC_CHARS = 8000
        doc_parts = []
        for i, d in enumerate(documents):
            name = d.get("name") or f"Documento {i+1}"
            text = (d.get("text") or "")[:MAX_DOC_CHARS]
            doc_parts.append(f"--- DOCUMENTO: {name} ---\n{text}")
        system_content += "\n\n## DOCUMENTOS ADJUNTOS:\n\n" + "\n\n".join(doc_parts)

    # Build full message array: system + conversation history
    full_messages = [{"role": "system", "content": system_content}]
    for m in messages:
        role = m.get("role", "user")
        if role not in ("user", "assistant"):
            role = "user"
        full_messages.append({"role": role, "content": m.get("content", "")})

    try:
        result_text, usage = llm_call(model, full_messages, api_keys)
        return jsonify({"result": result_text, "usage": usage})
    except Exception as e:
        err_str = str(e).lower()
        if "context_length" in err_str or "max_tokens" in err_str or "token" in err_str:
            return jsonify({"error": "Límite de tokens excedido. Reducí la cantidad de videos conectados o usá una conversación más corta."}), 400
        if "api key" in err_str or "api_key" in err_str or "unauthorized" in err_str or "authentication" in err_str:
            return jsonify({"error": f"Error de autenticación: {str(e)}"}), 401
        return jsonify({"error": f"Error al procesar con IA: {str(e)}"}), 500


@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    """
    Analiza una imagen usando GPT Vision para extraer texto y descripciones.
    Acepta una imagen en base64 y retorna análisis completo.
    """
    data = request.get_json()
    image_data = data.get("image", "")
    filename = data.get("filename", "imagen.png")
    api_keys = data.get("api_keys") or {}

    if not image_data:
        return jsonify({"error": "No se proporcionó imagen"}), 400

    # Extract base64 data if it has a prefix
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    # Use OpenAI client
    openai_key = api_keys.get("openai") or os.getenv("OPENAI_API_KEY")
    if not openai_key:
        return jsonify({"error": "API key de OpenAI no configurada"}), 400

    try:
        client = OpenAI(api_key=openai_key)

        prompt = """Analizá esta imagen en español y extraí:

1. **Descripción general**: Descripción detallada de lo que se ve en la imagen (mínimo 2-3 frases)

2. **Texto detectado**: Si hay texto visible en la imagen, transcriptalo completamente. Si hay múltiples bloques de texto, separalos claramente.

3. **Detalles visuales importantes**:
   - Colores predominantes
   - Elementos gráficos o de diseño
   - Personas u objetos relevantes
   - Contexto o situación que se muestra
   - Cualquier elemento llamativo o digno de mención

Respondé en formato JSON con esta estructura exacta:
{
  "description": "descripción detallada",
  "text": "texto detectado o null si no hay texto",
  "details": ["detalle 1", "detalle 2", "detalle 3"]
}

Si no hay texto visible en la imagen, retorná null en el campo "text".
"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.5,
        )

        result_text = response.choices[0].message.content

        # Parse JSON response
        try:
            # Try to extract JSON from response
            import json
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            analysis = json.loads(result_text)

            # Ensure structure
            if "description" not in analysis:
                analysis["description"] = result_text
            if "text" not in analysis:
                analysis["text"] = None
            if "details" not in analysis:
                analysis["details"] = []

            return jsonify({
                "analysis": analysis,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                    "model": "gpt-4o"
                }
            })

        except json.JSONDecodeError:
            # If JSON parsing fails, return the text as description
            return jsonify({
                "analysis": {
                    "description": result_text,
                    "text": None,
                    "details": []
                },
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                    "model": "gpt-4o"
                }
            })

    except Exception as e:
        return jsonify({"error": f"Error al analizar imagen: {str(e)}"}), 500


@app.route("/generate-image", methods=["POST"])
def generate_image():
    """
    Genera imágenes usando OpenAI DALL-E 2 o Nano Banana
    Soporta prompts de texto, imágenes de referencia y texto de nodos conectados
    """
    data = request.get_json()
    prompt = data.get("prompt", "")
    model = data.get("model", "dall-e-2")
    count = data.get("count", 1)
    size = data.get("size", "1024x1024")
    reference_images = data.get("reference_images", [])  # Base64 images
    text_context = data.get("text_context", "")  # Text from connected nodes
    api_keys = data.get("api_keys") or {}

    if not prompt:
        return jsonify({"error": "Se requiere un prompt para generar imágenes"}), 400

    # Validate count
    if not 1 <= count <= 10:
        return jsonify({"error": "La cantidad de imágenes debe estar entre 1 y 10"}), 400

    # Validate size
    valid_sizes = ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]
    if size not in valid_sizes:
        return jsonify({"error": f"Tamaño inválido. Opciones: {', '.join(valid_sizes)}"}), 400

    # Build enhanced prompt with context
    enhanced_prompt = prompt
    if text_context:
        enhanced_prompt = f"{prompt}\n\nContexto adicional:\n{text_context}"

    # If reference images are provided, analyze them and add to prompt
    if reference_images and len(reference_images) > 0:
        try:
            # Analyze reference images with GPT-4 Vision
            openai_key_ref = api_keys.get("openai") or os.getenv("OPENAI_API_KEY")
            if openai_key_ref:
                client_ref = OpenAI(api_key=openai_key_ref)

                # Analyze each reference image
                ref_descriptions = []
                for i, ref_img in enumerate(reference_images[:3]):  # Max 3 reference images
                    try:
                        # Extract base64 data if prefixed
                        img_data = ref_img
                        if "," in img_data:
                            img_data = img_data.split(",", 1)[1]

                        response = client_ref.chat.completions.create(
                            model="gpt-4o",
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": "Describe esta imagen en 2-3 frases cortas. Enfocate en estilo, colores, composicion y elementos principales."},
                                        {
                                            "type": "image_url",
                                            "image_url": {"url": f"data:image/jpeg;base64,{img_data}"}
                                        }
                                    ]
                                }
                            ],
                            max_tokens=200,
                            temperature=0.5,
                        )
                        desc = response.choices[0].message.content
                        ref_descriptions.append(f"Referencia {i+1}: {desc}")
                    except Exception as e:
                        ref_descriptions.append(f"Referencia {i+1}: [Error al analizar]")

                if ref_descriptions:
                    enhanced_prompt = f"{enhanced_prompt}\n\nImágenes de referencia:\n" + "\n".join(ref_descriptions)
        except Exception as e:
            # If analysis fails, continue without reference descriptions
            pass

    try:
        if model == "dall-e-2" or model.startswith("gpt-image"):
            # OpenAI DALL-E 2 / GPT Image
            openai_key = api_keys.get("openai") or os.getenv("OPENAI_API_KEY")
            if not openai_key:
                return jsonify({"error": "API key de OpenAI no configurada"}), 400

            client = OpenAI(api_key=openai_key)

            # Use DALL-E 2 API
            response = client.images.generate(
                model="dall-e-2",
                prompt=enhanced_prompt,
                n=count,
                size=size,
                response_format="b64_json"
            )

            images = []
            for i, img_data in enumerate(response.data):
                images.append({
                    "id": f"generated-{int(Date.now())}-{i}",
                    "url": None,
                    "b64_json": img_data.b64_json,
                    "revised_prompt": getattr(img_data, 'revised_prompt', prompt)
                })

            return jsonify({
                "images": images,
                "model": "dall-e-2",
                "usage": {
                    "prompt_tokens": 0,
                    "total_images": len(images)
                }
            })

        elif model == "nano-banana":
            # Nano Banana API
            nano_banana_key = api_keys.get("nano_banana") or os.getenv("NANO_BANANA_API_KEY")
            if not nano_banana_key:
                return jsonify({"error": "API key de Nano Banana no configurada"}), 400

            import requests

            # Prepare payload for Nano Banana
            payload = {
                "prompt": enhanced_prompt,
                "num_images": count,
                "size": size,
                "reference_images": reference_images
            }

            headers = {
                "Authorization": f"Bearer {nano_banana_key}",
                "Content-Type": "application/json"
            }

            # Make request to Nano Banana API
            # Replace with actual endpoint when available
            response = requests.post(
                "https://api.nanobanana.com/v1/generate",
                json=payload,
                headers=headers,
                timeout=60
            )

            if response.status_code != 200:
                return jsonify({"error": f"Error en Nano Banana: {response.text}"}), response.status_code

            result = response.json()

            # Process Nano Banana response
            images = []
            if "images" in result:
                for i, img_data in enumerate(result["images"]):
                    images.append({
                        "id": f"generated-{int(Date.now())}-{i}",
                        "url": img_data.get("url"),
                        "b64_json": img_data.get("b64_json"),
                        "revised_prompt": prompt
                    })

            return jsonify({
                "images": images,
                "model": "nano-banana",
                "usage": {
                    "prompt_tokens": 0,
                    "total_images": len(images)
                }
            })

        else:
            return jsonify({"error": f"Modelo no soportado: {model}"}), 400

    except Exception as e:
        err_str = str(e).lower()
        if "api key" in err_str or "unauthorized" in err_str or "authentication" in err_str:
            return jsonify({"error": f"Error de autenticación: {str(e)}"}), 401
        if "quota" in err_str or "limit" in err_str or "rate" in err_str:
            return jsonify({"error": "Límite de cuota excedido. Espera unos minutos o verifica tu plan."}), 429
        return jsonify({"error": f"Error al generar imagen: {str(e)}"}), 500


if __name__ == "__main__":
    print("🎨 Content Research Canvas — Backend")
    print("=" * 40)
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print("✅ OPENAI_API_KEY configurada")
    else:
        print("⚠️  OPENAI_API_KEY no encontrada — configurála en .env")
    print("🚀 Servidor corriendo en http://localhost:5000")
    print("=" * 40)
    app.run(debug=False, port=5000, host="0.0.0.0")
