// Frontend API Configuration
// Note: In production, use environment variables instead of hardcoding keys

export const API_CONFIG = {
  // Anthropic Claude API Key (preferred for summarization)
  ANTHROPIC_API_KEY: "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",
  
  // OpenRouter API Key (fallback)
  OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY || "",
  
  // API URLs
  CLAUDE_API_URL: "https://api.anthropic.com/v1/messages",
  OPENROUTER_API_URL: "https://openrouter.ai/api/v1/chat/completions",
  OLLAMA_API_URL: "http://pierai.tunell.live/v1/chat/completions",
  
  // Models
  CLAUDE_MODEL: "claude-3-5-sonnet-20241022",
  OPENROUTER_MODEL: "openchat/openchat-3.5-0106",
  OLLAMA_MODEL: "gemma3n:e4b",
  // Backend API URL for enhanced chat - Updated to port 5001
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5001/enhanced-chat"
}; 