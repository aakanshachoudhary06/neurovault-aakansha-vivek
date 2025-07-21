# FOR MAC:
import whisper
import tempfile
from fastapi import UploadFile

# 延迟加载模型以避免启动时错误
_model = None


def get_model():
    """获取或加载 Whisper 模型"""
    global _model
    if _model is None:
        try:
            _model = whisper.load_model("base")
        except Exception as e:
            # 如果基础模型失败，尝试使用 tiny 模型
            print(f"Failed to load base model: {e}")
            print("Trying to load tiny model...")
            _model = whisper.load_model("tiny")
    return _model


def transcribe_audio(file: UploadFile) -> str:
    """转录音频文件为文本"""
    model = get_model()
    with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as tmp:
        tmp.write(file.file.read())
        tmp.flush()
        result = model.transcribe(tmp.name)
    return result['text']

# #FOR WINDOWS:
# import whisper
# import tempfile
# import os
# import asyncio
# import json
# from fastapi import UploadFile
# from fastapi import WebSocket
# import wave
# import numpy as np
# from websockets.exceptions import ConnectionClosed

# model = whisper.load_model("base")

# def transcribe_audio(file: UploadFile) -> str:
#     # Step 1: Save file to a temp .wav file
#     with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
#         tmp.write(file.file.read())
#         tmp_path = tmp.name  # Save path before closing file

#     try:
#         # Step 2: Transcribe using Whisper
#         result = model.transcribe(tmp_path)
#         assert isinstance(result["text"], str)
#         return result["text"]

#     finally:
#         # Step 3: Delete the temp file
#         os.remove(tmp_path)

# # Live transcription functionality
# class LiveTranscriber:
#     def __init__(self):
#         self.model = whisper.load_model("base")
#         self.audio_buffer = []
#         self.is_recording = False
#         self.session_buffer = []  # Buffer for the current session
    
#     def start_recording(self):
#         """Start a new recording session"""
#         self.audio_buffer = []
#         self.session_buffer = []
#         self.is_recording = True
    
#     def add_audio_chunk(self, audio_chunk: bytes):
#         """Add an audio chunk to the buffer"""
#         if self.is_recording:
#             self.audio_buffer.append(audio_chunk)
    
#     def transcribe_session_buffer(self, audio_chunk: bytes) -> str:
#         """Transcribe accumulated audio from the session buffer"""
#         if not audio_chunk:
#             return ""

#         # Add to session buffer
#         self.session_buffer.append(audio_chunk)

#         # Only transcribe if we have accumulated enough audio (at least 3 seconds worth)
#         # Assuming ~16KB per second of audio, we need at least 48KB
#         total_size = sum(len(chunk) for chunk in self.session_buffer)
#         if total_size < 48000:  # 48KB minimum
#             return ""

#         try:
#             # Combine all chunks in session buffer (growing buffer)
#             combined_audio = b''.join(self.session_buffer)

#             # Save as a complete WebM file
#             with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as webm_file:
#                 webm_file.write(combined_audio)
#                 webm_path = webm_file.name

#             # Convert WebM to WAV using ffmpeg
#             import subprocess
#             wav_path = webm_path.replace('.webm', '.wav')

#             try:
#                 # Use ffmpeg to convert WebM to WAV
#                 result = subprocess.run([
#                     'ffmpeg', '-i', webm_path, '-acodec', 'pcm_s16le', 
#                     '-ar', '16000', '-ac', '1', wav_path, '-y'
#                 ], capture_output=True, text=True, timeout=10)

#                 if result.returncode != 0:
#                     print(f"FFmpeg conversion failed: {result.stderr}")
#                     # Clean up files
#                     os.remove(webm_path)
#                     return ""

#                 # Transcribe the WAV file
#                 result = self.model.transcribe(wav_path)
#                 transcribed_text = result["text"]

#                 # Do NOT clear the session buffer here; keep accumulating for next chunk
#                 # Only clear on stop_recording

#                 return transcribed_text

#             except subprocess.TimeoutExpired:
#                 print("FFmpeg conversion timed out")
#                 return ""
#             except Exception as e:
#                 print(f"Error during FFmpeg conversion: {e}")
#                 return ""
#             finally:
#                 # Clean up temporary files
#                 try:
#                     os.remove(webm_path)
#                     if os.path.exists(wav_path):
#                         os.remove(wav_path)
#                 except:
#                     pass

#         except Exception as e:
#             print(f"Error saving session buffer: {e}")
#             return ""

#     def stop_recording(self) -> str:
#         """Stop recording and transcribe the complete audio"""
#         self.is_recording = False
#         if not self.audio_buffer:
#             return ""
#         # Combine all chunks and transcribe
#         combined_audio = b''.join(self.audio_buffer)
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
#             tmp.write(combined_audio)
#             tmp_path = tmp.name
#         try:
#             result = self.model.transcribe(tmp_path)
#             # Clear session buffer on stop
#             self.session_buffer = []
#             return result["text"]
#         finally:
#             os.remove(tmp_path)

# # Global transcriber instance
# live_transcriber = LiveTranscriber()

# async def handle_live_transcription(websocket: WebSocket):
#     """Handle live transcription via WebSocket"""
#     await websocket.accept()
#     print("WebSocket connection established for live transcription")
    
#     # Send a test message to verify connection
#     try:
#         test_message = {
#             "type": "connection_test",
#             "message": "WebSocket connection established",
#             "timestamp": asyncio.get_event_loop().time()
#         }
#         await websocket.send_text(json.dumps(test_message))
#         print("Test message sent to frontend")
#     except Exception as e:
#         print(f"Error sending test message: {e}")
    
#     try:
#         while True:
#             # Receive audio chunk from client
#             try:
#                 audio_data = await websocket.receive_bytes()
#                 print(f"Received audio chunk of size: {len(audio_data)} bytes")
                
#                 # Transcribe the accumulated session buffer
#                 transcript = live_transcriber.transcribe_session_buffer(audio_data)
#                 print(f"Transcribed text: {transcript}")
                
#                 # Send transcript back to client if we have text
#                 if transcript and transcript.strip():
#                     response_data = {
#                         "type": "transcript",
#                         "text": transcript,
#                         "timestamp": asyncio.get_event_loop().time()
#                     }
#                     response_json = json.dumps(response_data)
#                     print(f"Sending to frontend: {response_json}")
#                     try:
#                         await websocket.send_text(response_json)
#                         print("Message sent successfully to frontend")
#                     except Exception as send_error:
#                         print(f"Error sending message to frontend: {send_error}")
#                         break
#                 else:
#                     print("No transcript to send (empty or failed transcription)")
                
#             except ConnectionClosed:
#                 print("WebSocket connection closed by client")
#                 break
#             except Exception as e:
#                 print(f"Error processing audio chunk: {e}")
#                 # Send error response to client
#                 error_data = {
#                     "type": "error",
#                     "message": str(e),
#                     "timestamp": asyncio.get_event_loop().time()
#                 }
#                 try:
#                     await websocket.send_text(json.dumps(error_data))
#                 except:
#                     break
                
#     except Exception as e:
#         print(f"WebSocket error: {e}")
#     finally:
#         print("WebSocket connection closed")
#         # Don't call websocket.close() here as it may already be closed
