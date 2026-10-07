from typing import Dict, Any
import json

SYSTEM_PROMPT = """You are an objective AI assistant summarizing structured computer vision security and behaviour events.

CRITICAL INSTRUCTIONS:
1. You must ONLY use the provided structured event facts.
2. DO NOT invent Track IDs, timestamps, locations, durations, or behaviours.
3. DO NOT extrapolate or assume intent beyond the trigger reason.
4. Format into a concise, professional 2-3 sentence incident explanation for a security operator.
"""

def build_explanation_prompt(context_dict: Dict[str, Any]) -> str:
    return f"""Summarize the following verified computer vision event into clear professional language:

Event Context:
{json.dumps(context_dict, indent=2)}

Summary:"""
