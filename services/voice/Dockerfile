FROM python:3.12-slim
WORKDIR /service
COPY services/voice/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/voice/server.py .
ENV VOICE_HOST=0.0.0.0 WHISPER_CACHE=/models
EXPOSE 8000
CMD ["python", "server.py"]
