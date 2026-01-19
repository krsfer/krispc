import os
import json
from google import genai
from google.genai import types
from openai import OpenAI
import anthropic
from django.conf import settings
from plexus.models import SystemConfiguration
from PIL import Image
import io

def classify_input(text, image_file=None):
    """
    Entry point for input classification. 
    Routes to the active provider based on SystemConfiguration.
    """
    config = SystemConfiguration.get_solo()
    provider = config.active_ai_provider

    if provider == "openai":
        return _classify_openai(text, image_file)
    elif provider == "anthropic":
        return _classify_anthropic(text, image_file)
    else:
        return _classify_gemini(text, image_file)

def query_llm(prompt):
    """
    Generic function to query the active LLM provider.
    Returns the raw text response.
    """
    config = SystemConfiguration.get_solo()
    provider = config.active_ai_provider
    
    try:
        if provider == "openai":
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key: return None
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
            
        elif provider == "anthropic":
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key: return None
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
            
        else: # gemini
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key: return None
            client = genai.Client(api_key=api_key)
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-pro-latest")
            response = client.models.generate_content(model=model_name, contents=prompt)
            return response.text
    except Exception as e:
        print(f"LLM Query Error: {e}")
        return None

def _classify_gemini(text, image_file=None):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _fallback_result(text, "gemini-fallback (no key)")

    try:
        client = genai.Client(api_key=api_key)
        # Use gemini-1.5-flash for speed/vision capability if not specified
        model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

        contents = []
        
        # Add system instruction as part of content since some libs vary on 'system_instruction' param
        system_prompt = _get_system_prompt(text, has_image=bool(image_file))
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=system_prompt)]))
        
        user_parts = []
        if text:
            user_parts.append(types.Part.from_text(text=text))
            
        if image_file:
            # Load image into memory
            img = Image.open(image_file)
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format=img.format or 'JPEG')
            img_bytes = img_byte_arr.getvalue()
            
            user_parts.append(types.Part.from_bytes(data=img_bytes, mime_type=f"image/{img.format.lower() if img.format else 'jpeg'}"))

        if user_parts:
            contents.append(types.Content(role="user", parts=user_parts))

        response = client.models.generate_content(
            model=model_name, 
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw_text)
        
        return _format_result(data, text, model_name)
    except Exception as e:
        print(f"Gemini Error: {e}")
        return _fallback_result(text, f"gemini-error: {str(e)[:50]}")

import base64

def _classify_openai(text, image_file=None):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _fallback_result(text, "openai-fallback (no key)")

    try:
        client = OpenAI(api_key=api_key)
        model_name = "gpt-4o-mini"
        
        system_prompt = _get_system_prompt(text, has_image=bool(image_file))
        messages = [{"role": "system", "content": system_prompt}]
        
        user_content = []
        if text:
            user_content.append({"type": "text", "text": text})
            
        if image_file:
            # Encode image to base64
            image_file.seek(0)
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            # OpenAI requires mime type, we can guess or default to jpeg/png
            # For simplicity, let's assume standard image formats or detect from PIL
            try:
                img = Image.open(image_file)
                mime_type = f"image/{img.format.lower() if img.format else 'jpeg'}"
            except:
                mime_type = "image/jpeg"
                
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{base64_image}"
                }
            })

        if not user_content:
             # Handle case where both text and image might be empty/failed
             return _fallback_result(text, "openai-error: No content provided")

        messages.append({"role": "user", "content": user_content})
        
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return _format_result(data, text, model_name)
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return _fallback_result(text, f"openai-error: {str(e)[:50]}")

def _classify_openai_text_only(text):
    # Deprecated internal helper, merged into _classify_openai
    return _classify_openai(text)

def _classify_anthropic(text, image_file=None):
    # Similar fallback for Anthropic
    return _classify_anthropic_text_only(text)

def _classify_anthropic_text_only(text):
    api_key = os.environ.get("ANTHROPIC_API_KEY")

def _get_system_prompt(text, has_image=False):
    instruction = "process unstructured input"
    if has_image:
        instruction = "analyze the provided image and text"
        
    return f"""
    You are the Intelligence Layer of a 'Second Brain' system. 
    Your goal is to {instruction} and return a structured JSON response.
    
    The JSON must have these keys:
    - 'classification': one of ["ideation", "reference", "task"]
    - 'confidence_score': a float between 0.0 and 1.0
    - 'refined_content': a polished, summary version of the input (describe the image if present)
    - 'actions': a list of specific next-step actions (strings), if any.
    
    Input Context: {text}
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