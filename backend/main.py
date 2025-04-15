import os
import glob
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from yt_dlp import YoutubeDL

app = FastAPI()

# Modelo de datos para peticiones de descarga.
class DownloadRequest(BaseModel):
    url: str

# Carpeta para almacenar los archivos descargados.
DOWNLOAD_FOLDER = "./downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

def descargar_audio(url: str):
    """
    Utiliza yt-dlp para descargar el audio y convertirlo a MP3.
    El audio se guarda en DOWNLOAD_FOLDER.
    """
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True  # Evita mensajes innecesarios en consola
    }
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            # Prepara el nombre del archivo final cambiando la extensión a .mp3
            filename = ydl.prepare_filename(info).rsplit('.', 1)[0] + ".mp3"
            print(f"Descarga completada: {filename}")
            return filename
    except Exception as e:
        print("Error al descargar:", e)
        raise

@app.post("/download")
async def download_audio(request: DownloadRequest, background_tasks: BackgroundTasks):
    """
    Inicia la descarga y conversión en segundo plano.
    """
    try:
        background_tasks.add_task(descargar_audio, request.url)
        return {"message": "Descarga iniciada para la URL: " + request.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
async def list_files():
    """
    Lista todos los archivos MP3 descargados.
    """
    files = glob.glob(os.path.join(DOWNLOAD_FOLDER, "*.mp3"))
    files_names = [os.path.basename(f) for f in files]
    return {"files": files_names}

@app.get("/play/{filename}")
async def play_file(filename: str):
    """
    Sirve el archivo MP3 para su reproducción.
    """
    file_path = os.path.join(DOWNLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg", filename=filename)
    else:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
