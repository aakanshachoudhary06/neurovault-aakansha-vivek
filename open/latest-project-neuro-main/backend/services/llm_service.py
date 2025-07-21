import asyncio
import logging
from utils.llm_factory import get_llm_client

logger = logging.getLogger(__name__)

def create_simple_summary(text: str) -> str:
    """Create a simple summary without external APIs"""
    try:
        # Simple text processing to create a basic summary
        sentences = text.split('.')
        # Take first few sentences as summary
        summary_sentences = sentences[:3]
        summary = '. '.join(summary_sentences) + '.'
        
        # Create a structured summary
        words = text.split()
        word_count = len(words)
        
        # Extract key phrases (simple approach)
        key_phrases = []
        for sentence in sentences[:5]:
            if len(sentence.strip()) > 10:
                key_phrases.append(sentence.strip())
        
        # Create JSON response
        import json
        summary_data = {
            "title": "Auto-Generated Summary",
            "keyPoints": key_phrases[:5],
            "actionItems": [],
            "participants": [],
            "tags": ["auto-generated"],
            "summary": summary,
            "wordCount": word_count,
            "source": "local-processing"
        }
        
        return json.dumps(summary_data, indent=2)
        
    except Exception as e:
        logger.error(f"Error in create_simple_summary: {e}")
        return json.dumps({
            "title": "Summary",
            "keyPoints": ["Unable to process text"],
            "actionItems": [],
            "participants": [],
            "tags": ["error"],
            "summary": "Text processing failed",
            "error": str(e)
        })

async def summarize_with_llm(transcripts: list[str]) -> str:
    """Summarize transcripts using the configured LLM client"""
    try:
        from utils.llm_factory import get_summary_llm_client
        llm_client = get_summary_llm_client()
        
        # Create messages for the LLM with JSON formatting instructions
        messages = [
            {
                "role": "system",
                "content": """You are a helpful assistant that summarizes transcripts in a structured JSON format.

IMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON.

The JSON should have this exact structure:
{
  "title": "Brief descriptive title",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "actionItems": ["Action item 1", "Action item 2"],
  "participants": ["Participant 1", "Participant 2"],
  "tags": ["tag1", "tag2"],
  "summary": "A concise summary of the main content"
}

Rules:
- Extract key points from the transcript
- Identify any action items mentioned
- List participants if mentioned
- Add relevant tags
- Provide a concise summary
- Ensure the JSON is valid and properly formatted"""
            },
            {
                "role": "user", 
                "content": f"Please summarize the following transcripts and return ONLY valid JSON:\n\n{chr(10).join(transcripts)}"
            }
        ]
        
        # Generate summary
        summary = await llm_client.generate_response(messages)
        
        # Clean up the response to ensure it's valid JSON
        summary = summary.strip()
        
        # Remove any markdown formatting if present
        if summary.startswith('```json'):
            summary = summary.replace('```json', '').replace('```', '').strip()
        elif summary.startswith('```'):
            summary = summary.replace('```', '').strip()
        
        # Validate that it's valid JSON
        import json
        try:
            json.loads(summary)
            return summary
        except json.JSONDecodeError:
            # If the LLM didn't return valid JSON, create a structured response
            logger.warning("LLM didn't return valid JSON, creating structured response")
            return create_simple_summary(" ".join(transcripts))
        
    except Exception as e:
        logger.error(f"Error in summarize_with_llm: {e}")
        # Fallback to simple summary
        combined_text = " ".join(transcripts)
        return create_simple_summary(combined_text)

# Synchronous wrapper for backward compatibility
def summarize_with_llm_sync(transcripts: list[str]) -> str:
    """Synchronous wrapper for summarize_with_llm"""
    try:
        return asyncio.run(summarize_with_llm(transcripts))
    except Exception as e:
        logger.error(f"Error in summarize_with_llm_sync: {e}")
        # Fallback to simple summary
        combined_text = " ".join(transcripts)
        return create_simple_summary(combined_text) 