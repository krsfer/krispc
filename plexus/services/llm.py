import os
import json
from google import genai
from openai import OpenAI
import anthropic
from django.conf import settings
from plexus.models import SystemConfiguration

def classify_input(text):
    """
    Entry point for input classification. 
    Routes to the active provider based on SystemConfiguration.
    """
    config = SystemConfiguration.get_solo()
    provider = config.active_ai_provider

    if provider == "openai":
        return _classify_openai(text)
    elif provider == "anthropic":
        return _classify_anthropic(text)
    else:
        return _classify_gemini(text)

def _classify_gemini(text):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _fallback_result(text, "gemini-fallback (no key)")

    try:
        client = genai.Client(api_key=api_key)
        model_name = getattr(settings, "GEMINI_MODEL", "gemini-pro-latest")

        prompt = _get_system_prompt(text)
        response = client.models.generate_content(model=model_name, contents=prompt)
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw_text)
        
        return _format_result(data, text, model_name)
    except Exception as e:
        return _fallback_result(text, f"gemini-error: {str(e)[:50]}")

def _classify_openai(text):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _fallback_result(text, "openai-fallback (no key)")

    try:
        client = OpenAI(api_key=api_key)
        model_name = "gpt-4o-mini"
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": _get_system_prompt(text)}],
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return _format_result(data, text, model_name)
    except Exception as e:
        return _fallback_result(text, f"openai-error: {str(e)[:50]}")

def _classify_anthropic(text):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_result(text, "anthropic-fallback (no key)")

    try:
        client = anthropic.Anthropic(api_key=api_key)
        model_name = "claude-3-haiku-20240307"
        
        response = client.messages.create(
            model=model_name,
            max_tokens=1024,
            messages=[{"role": "user", "content": _get_system_prompt(text)}]
        )
        # Claude might not guarantee JSON unless prompted well, 
        # but for this refactor we assume similar structure
        raw_text = response.content[0].text
        data = json.loads(raw_text)
        return _format_result(data, text, model_name)
    except Exception as e:
        return _fallback_result(text, f"anthropic-error: {str(e)[:50]}")

def _get_system_prompt(text):
    return f"""
    You are the Intelligence Layer of a 'Second Brain' system. 
    Your goal is to process unstructured input and return a structured JSON response.
    
    The JSON must have these keys:
    - 'classification': one of ["ideation", "reference", "task"]
    - 'confidence_score': a float between 0.0 and 1.0
    - 'refined_content': a polished, summary version of the input
    - 'actions': a list of specific next-step actions (strings), if any.
    
    Input: {text}
    """

def _format_result(data, original_text, model_name):
    return {
        "classification": data.get("classification", "ideation").lower(),
        "confidence_score": float(data.get("confidence_score", 0.5)),
        "refined_content": data.get("refined_content", original_text),
        "actions": data.get("actions", []),
        "ai_model": model_name
    }

def _fallback_result(text, model_name):
    return {
        "classification": "ideation",
        "confidence_score": 0.0,
        "refined_content": text,
        "actions": [],
        "ai_model": model_name
    }