import os
from openai import OpenAI
from django.conf import settings

def transcribe_audio(audio_file):
    """
    Transcribes audio using OpenAI Whisper.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return "Error: No OpenAI API Key found."

    try:
        client = OpenAI(api_key=api_key)
        
        # Determine file extension/name for the API
        # The file object from Django might be in memory or temp file
        # OpenAI library handles file-like objects if they have a 'name'
        
        # Prepare file tuple for OpenAI client: (filename, file_content, content_type)
        file_tuple = (audio_file.name, audio_file, "audio/webm")

        transcript = client.audio.transcriptions.create(
            model="whisper-1", 
            file=file_tuple,
            response_format="json"
        )
        return transcript.text
    except Exception as e:
        return f"Error: Transcription failed - {str(e)[:100]}"
