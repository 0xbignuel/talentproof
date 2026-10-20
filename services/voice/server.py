"""Service vocal local : Whisper multilingue, audio en mémoire, aucun journal de contenu."""
import hmac
import io
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from faster_whisper import WhisperModel

MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")
TOKEN = os.environ.get("VOICE_SERVICE_TOKEN", "")
model = None
model_error = False
lock = threading.BoundedSemaphore(1)


def load_model():
    global model, model_error
    try:
        print(f"Chargement de Whisper {MODEL_NAME} sur CPU…", flush=True)
        model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=2,
                             download_root=os.environ.get("WHISPER_CACHE", ".models/whisper"))
        print("Whisper est prêt sur http://127.0.0.1:8000", flush=True)
    except Exception as error:
        model_error = True
        print(f"Whisper indisponible : {type(error).__name__}. Vérifiez le téléchargement du modèle.", flush=True)


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(30)

    def log_message(self, *args):
        pass

    def send_json(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path != "/health":
            return self.send_json(404, {"error": "Not found"})
        self.send_json(200, {"ready": model is not None, "model": MODEL_NAME,
                             "loading": model is None and not model_error})

    def do_POST(self):
        if self.path != "/transcribe":
            return self.send_json(404, {"error": "Not found"})
        if TOKEN and not hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {TOKEN}"):
            return self.send_json(401, {"error": "Unauthorized"})
        if model is None:
            return self.send_json(503, {"error": "Model not ready"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_json(400, {"error": "Invalid length"})
        if length <= 0 or length > 3 * 1024 * 1024:
            return self.send_json(413, {"error": "Audio too large"})
        if not lock.acquire(blocking=False):
            return self.send_json(429, {"error": "Busy"})
        try:
            audio = self.rfile.read(length)
            if len(audio) != length:
                return self.send_json(400, {"error": "Incomplete audio"})
            segments, info = model.transcribe(io.BytesIO(audio), language="fr", beam_size=3,
                                               vad_filter=True, condition_on_previous_text=False,
                                               initial_prompt="Présentation professionnelle d’une artisane au Togo. Couture, coiffure, maquillage, Lomé, Agoè.")
            if info.duration > 60:
                return self.send_json(413, {"error": "Audio too long"})
            text = " ".join(segment.text.strip() for segment in segments).strip()
            self.send_json(200, {"text": text[:1500]})
        except Exception as error:
            print(f"Erreur de transcription : {type(error).__name__}", flush=True)
            self.send_json(400, {"error": "Cannot decode audio"})
        finally:
            lock.release()


if __name__ == "__main__":
    threading.Thread(target=load_model, daemon=True).start()
    server = ThreadingHTTPServer((os.environ.get("VOICE_HOST", "127.0.0.1"), int(os.environ.get("VOICE_PORT", "8000"))), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
