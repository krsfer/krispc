import json
from plexus.models import Thought, ThoughtLink
from .llm import query_llm

def find_relevant_links(thought):
    """
    Finds and creates connections between the given thought and existing thoughts.
    """
    # 1. Fetch Candidates (Naive: last 10 thoughts)
    candidates = Thought.objects.exclude(id=thought.id).order_by('-created_at')[:10]
    if not candidates:
        return

    candidates_list = []
    for c in candidates:
        candidates_list.append(f"ID {c.id}: {c.content[:200]}")
    
    candidates_text = "\n".join(candidates_list)

    # 2. Prompt LLM
    prompt = f"""
    You are a knowledge graph agent.
    
    New Thought (ID {thought.id}): "{thought.content}"
    
    Existing Thoughts:
    {candidates_text}
    
    Task: Identify any existing thoughts that are strongly related to the new thought.
    Return a JSON object with a list of "links".
    
    Each link must have:
    - "target_id": The ID of the existing thought.
    - "reason": A short explanation of the connection.
    - "score": A relevance score between 0.0 and 1.0 (only include > 0.7).
    
    Example response:
    {{
        "links": [
            {{"target_id": 12, "reason": "Both discuss Python decorators", "score": 0.9}}
        ]
    }}
    
    If no strong links are found, return empty list.
    """

    response_text = query_llm(prompt)
    if not response_text:
        return

    # 3. Parse and Create Links
    try:
        # Cleanup markdown if present
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        links = data.get("links", [])
        for link in links:
            target_id = link.get("target_id")
            reason = link.get("reason")
            
            try:
                target_thought = Thought.objects.get(id=target_id)
                ThoughtLink.objects.get_or_create(
                    source=thought,
                    target=target_thought,
                    defaults={"reason": reason}
                )
            except Thought.DoesNotExist:
                continue
                
    except Exception as e:
        print(f"Linking Error: {e}")
