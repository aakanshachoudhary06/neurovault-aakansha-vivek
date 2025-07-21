#!/usr/bin/env python3
"""
Multimedia Processor for handling various file types
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import tempfile

logger = logging.getLogger(__name__)


class MultimediaProcessor:
    """Processor for handling multimedia files"""
    
    def __init__(self):
        self.supported_text_formats = {'.txt', '.md', '.rst', '.py', '.js', '.html', '.css', '.json', '.xml'}
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
        self.supported_audio_formats = {'.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'}
        self.supported_video_formats = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
        
    def get_support_status(self) -> Dict[str, Any]:
        """Get the status of multimedia processing capabilities"""
        status = {
            "text_processing": True,
            "image_processing": self._check_image_support(),
            "audio_processing": self._check_audio_support(),
            "video_processing": self._check_video_support(),
            "supported_formats": {
                "text": list(self.supported_text_formats),
                "image": list(self.supported_image_formats),
                "audio": list(self.supported_audio_formats),
                "video": list(self.supported_video_formats)
            }
        }
        return status
    
    def _check_image_support(self) -> bool:
        """Check if image processing libraries are available"""
        try:
            import PIL
            return True
        except ImportError:
            return False
    
    def _check_audio_support(self) -> bool:
        """Check if audio processing libraries are available"""
        try:
            import whisper
            return True
        except ImportError:
            return False
    
    def _check_video_support(self) -> bool:
        """Check if video processing libraries are available"""
        try:
            import cv2
            return True
        except ImportError:
            return False
    
    async def process_file(self, file_path: Path, content_type: Optional[str] = None) -> Dict[str, Any]:
        """Process a file and extract text content"""
        try:
            file_extension = file_path.suffix.lower()
            
            # Determine file type
            if file_extension in self.supported_text_formats:
                return await self._process_text_file(file_path)
            elif file_extension in self.supported_image_formats:
                return await self._process_image_file(file_path)
            elif file_extension in self.supported_audio_formats:
                return await self._process_audio_file(file_path)
            elif file_extension in self.supported_video_formats:
                return await self._process_video_file(file_path)
            else:
                return {
                    "error": f"Unsupported file format: {file_extension}",
                    "file_type": "unknown"
                }
                
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            return {
                "error": f"Error processing file: {str(e)}",
                "file_type": "unknown"
            }
    
    async def _process_text_file(self, file_path: Path) -> Dict[str, Any]:
        """Process text files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "text": content,
                "file_type": "text",
                "word_count": len(content.split()),
                "char_count": len(content)
            }
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
                
                return {
                    "text": content,
                    "file_type": "text",
                    "word_count": len(content.split()),
                    "char_count": len(content)
                }
            except Exception as e:
                return {"error": f"Could not decode text file: {str(e)}"}
    
    async def _process_image_file(self, file_path: Path) -> Dict[str, Any]:
        """Process image files using OCR"""
        try:
            # Try to use OCR if available
            try:
                import pytesseract
                from PIL import Image
                
                image = Image.open(file_path)
                text = pytesseract.image_to_string(image)
                
                return {
                    "text": text,
                    "file_type": "image",
                    "extraction_method": "OCR",
                    "image_size": image.size
                }
            except ImportError:
                return {
                    "text": f"Image file detected: {file_path.name}. OCR not available for text extraction.",
                    "file_type": "image",
                    "extraction_method": "metadata_only",
                    "note": "Install pytesseract for OCR text extraction"
                }
        except Exception as e:
            return {"error": f"Could not process image file: {str(e)}"}
    
    async def _process_audio_file(self, file_path: Path) -> Dict[str, Any]:
        """Process audio files using speech-to-text"""
        try:
            # Try to use Whisper if available
            try:
                import whisper
                
                model = whisper.load_model("base")
                result = model.transcribe(str(file_path))
                
                return {
                    "text": result["text"],
                    "file_type": "audio",
                    "extraction_method": "whisper",
                    "language": result.get("language", "unknown"),
                    "duration": result.get("duration", 0)
                }
            except ImportError:
                return {
                    "text": f"Audio file detected: {file_path.name}. Speech-to-text not available.",
                    "file_type": "audio",
                    "extraction_method": "metadata_only",
                    "note": "Install whisper for speech-to-text extraction"
                }
        except Exception as e:
            return {"error": f"Could not process audio file: {str(e)}"}
    
    async def _process_video_file(self, file_path: Path) -> Dict[str, Any]:
        """Process video files"""
        try:
            # Try to extract audio and use speech-to-text
            try:
                import whisper
                import tempfile
                
                # Extract audio from video (simplified approach)
                # In a real implementation, you'd use ffmpeg or similar
                model = whisper.load_model("base")
                result = model.transcribe(str(file_path))
                
                return {
                    "text": result["text"],
                    "file_type": "video",
                    "extraction_method": "whisper_video",
                    "language": result.get("language", "unknown"),
                    "duration": result.get("duration", 0)
                }
            except ImportError:
                return {
                    "text": f"Video file detected: {file_path.name}. Speech-to-text not available.",
                    "file_type": "video",
                    "extraction_method": "metadata_only",
                    "note": "Install whisper and ffmpeg for video text extraction"
                }
        except Exception as e:
            return {"error": f"Could not process video file: {str(e)}"}
    
    def is_supported_format(self, file_path: Path) -> bool:
        """Check if file format is supported"""
        file_extension = file_path.suffix.lower()
        return file_extension in (
            self.supported_text_formats | 
            self.supported_image_formats | 
            self.supported_audio_formats | 
            self.supported_video_formats
        )
