from typing import Dict, Any, Optional
import httpx
from app.config import settings
from app.explanation.formatter import generate_deterministic_explanation
from app.explanation.prompt import SYSTEM_PROMPT, build_explanation_prompt
from app.utils.logger import logger


class LLMExplanationEngine:
    """
    Synthesizes natural language explanations from structured event facts.
    Calls LLM API if configured and online.
    Guarantees deterministic fallback if LLM is unavailable or fails.
    """

    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.openai_key = settings.OPENAI_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY

    def explain_event(self, context_dict: Dict[str, Any]) -> str:
        """
        Explains structured event facts. Always falls back gracefully.
        """
        if self.provider == "none":
            return generate_deterministic_explanation(context_dict)

        try:
            if self.provider == "ollama":
                return self._call_ollama(context_dict)
            elif self.provider == "openai" and self.openai_key:
                return self._call_openai(context_dict)
            elif self.provider == "gemini" and self.gemini_key:
                return self._call_gemini(context_dict)
            else:
                return generate_deterministic_explanation(context_dict)
        except Exception as e:
            logger.warning(f"LLM explanation API call failed ({e}). Falling back to deterministic engine.")
            return generate_deterministic_explanation(context_dict)

    def _call_ollama(self, context_dict: Dict[str, Any]) -> str:
        prompt = build_explanation_prompt(context_dict)
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
            "stream": False,
            "options": {
                "temperature": 0.2,
                "num_predict": 150,
            },
        }
        with httpx.Client(timeout=90.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip() or generate_deterministic_explanation(context_dict)

    def _call_openai(self, context_dict: Dict[str, Any]) -> str:
        prompt = build_explanation_prompt(context_dict)
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 150,
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    def _call_gemini(self, context_dict: Dict[str, Any]) -> str:
        prompt = build_explanation_prompt(context_dict)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [
                {"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{prompt}"}]}
            ],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 150},
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()


llm_explanation_engine = LLMExplanationEngine()
