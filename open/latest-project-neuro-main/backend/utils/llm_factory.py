#!/usr/bin/env python3
"""
LLM Factory for creating and managing LLM clients
"""

import os
import logging
from typing import List, Dict, Any, Optional
import httpx
from abc import ABC, abstractmethod

# Import API keys configuration
try:
    from backend.config.api_keys import OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
except ImportError:
    try:
        from config.api_keys import OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
    except ImportError:
        OPENROUTER_API_KEY = None
        ANTHROPIC_API_KEY = None
        OPENAI_API_KEY = None

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    """Abstract base class for LLM clients"""
    
    def __init__(self, provider: str, model_name: str):
        self.provider = provider
        self.model_name = model_name
    
    @abstractmethod
    async def generate_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate response from messages"""
        pass


class OllamaClient(LLMClient):
    """Ollama LLM client"""
    
    def __init__(self, model_name: str = "gemma3n:e4b", base_url: str = "http://pierai.tunell.live/v1"):
        super().__init__("ollama", model_name)
        self.base_url = base_url
    
    async def generate_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate response using Ollama API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": 0.7,
                        "stream": False
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"Ollama API error: {response.status_code}")
                    return "I apologize, but I'm currently unable to process your request due to a service issue."
                    
        except Exception as e:
            logger.error(f"Error calling Ollama API: {e}")
            return "I apologize, but I'm currently unable to process your request due to a technical issue."


class ClaudeClient(LLMClient):
    """Anthropic Claude LLM client"""
    
    def __init__(self, model_name: str = "claude-3-5-sonnet-20241022", api_key: Optional[str] = None):
        super().__init__("anthropic", model_name)
        self.api_key = api_key or ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY")
        self.base_url = "https://api.anthropic.com/v1"
    
    async def generate_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate response using Claude API"""
        if not self.api_key:
            logger.error("Anthropic API key not configured")
            return "I apologize, but the Claude service is not properly configured."
        
        try:
            # Extract system message and user messages
            system_message = None
            user_messages = []
            
            for message in messages:
                if message.get("role") == "system":
                    system_message = message.get("content", "")
                else:
                    user_messages.append(message)
            
            # Prepare the request payload
            payload = {
                "model": self.model_name,
                "max_tokens": 4096,
                "messages": user_messages,
                "temperature": 0.7
            }
            
            # Add system message if present
            if system_message:
                payload["system"] = system_message
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    json=payload,
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["content"][0]["text"].strip()
                else:
                    logger.error(f"Claude API error: {response.status_code} - {response.text}")
                    return "I apologize, but I'm currently unable to process your request due to a service issue."
                    
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return "I apologize, but I'm currently unable to process your request due to a technical issue."


class OpenRouterClient(LLMClient):
    """OpenRouter LLM client"""
    
    def __init__(self, model_name: str = "anthropic/claude-3.5-sonnet", api_key: Optional[str] = None):
        super().__init__("openrouter", model_name)
        self.api_key = api_key or OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1"
    
    async def generate_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate response using OpenRouter API"""
        if not self.api_key:
            logger.error("OpenRouter API key not configured")
            return "I apologize, but the OpenRouter service is not properly configured."
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": 0.7
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"OpenRouter API error: {response.status_code}")
                    return "I apologize, but I'm currently unable to process your request due to a service issue."
                    
        except Exception as e:
            logger.error(f"Error calling OpenRouter API: {e}")
            return "I apologize, but I'm currently unable to process your request due to a technical issue."


class OpenAIClient(LLMClient):
    """OpenAI LLM client for summaries"""
    
    def __init__(self, model_name: str = "gpt-3.5-turbo", api_key: Optional[str] = None):
        super().__init__("openai", model_name)
        self.api_key = api_key or OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        self.base_url = "https://api.openai.com/v1"
    
    async def generate_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate response using OpenAI API"""
        if not self.api_key:
            logger.error("OpenAI API key not configured")
            return "I apologize, but the OpenAI service is not properly configured."
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2000
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                    return "I apologize, but I'm currently unable to process your request due to a service issue."
                    
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return "I apologize, but I'm currently unable to process your request due to a technical issue."


class LocalLLMClient(LLMClient):
    """Local LLM client (fallback)"""
    
    def __init__(self, model_name: str = "local", base_url: str = "http://tunellutility2.tunell.live/v1"):
        super().__init__("local", model_name)
        self.base_url = base_url
        self.model_id = "hf.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF:Q4_K_M"
    
    async def generate_response(self, messages: List[Dict[str, str]]) -> str:
        """Generate response using local LLM API"""
        try:
            # Convert messages to prompt format
            prompt = self._messages_to_prompt(messages)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/completions",
                    json={
                        "model": self.model_id,
                        "prompt": prompt,
                        "max_tokens": 256,
                        "temperature": 0.7,
                        "stream": False
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["text"].strip()
                else:
                    logger.error(f"Local LLM API error: {response.status_code}")
                    return "I apologize, but I'm currently unable to process your request due to a service issue."
                    
        except Exception as e:
            logger.error(f"Error calling Local LLM API: {e}")
            return "I apologize, but I'm currently unable to process your request due to a technical issue."
    
    def _messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        """Convert messages to prompt format"""
        prompt_parts = []
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        
        prompt_parts.append("Assistant:")
        return "\n".join(prompt_parts)


def get_llm_client() -> LLMClient:
    """Factory function to get the appropriate LLM client"""
    # Try to determine the best available LLM client
    
    # Check for Anthropic API key (Claude) - preferred for summarization
    anthropic_key = ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        logger.info("Using Claude LLM client")
        return ClaudeClient(api_key=anthropic_key)
    
    # Check for OpenRouter API key (from config or environment)
    openrouter_key = OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY")
    if openrouter_key:
        logger.info("Using OpenRouter LLM client with Claude")
        return OpenRouterClient(api_key=openrouter_key)
    
    # Default to Ollama client
    logger.info("Using Ollama LLM client")
    return OllamaClient()


def get_summary_llm_client() -> LLMClient:
    """Factory function to get LLM client specifically for summaries (prefers OpenAI)"""
    # Check for OpenAI API key first (preferred for summaries)
    openai_key = OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if openai_key:
        logger.info("Using OpenAI LLM client for summaries")
        return OpenAIClient(api_key=openai_key)
    
    # Fallback to other clients
    return get_llm_client()


def get_fallback_client() -> LLMClient:
    """Get fallback LLM client"""
    logger.info("Using Local LLM client as fallback")
    return LocalLLMClient()
