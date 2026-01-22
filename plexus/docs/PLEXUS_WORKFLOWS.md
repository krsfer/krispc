# 🧠 Plexus Workflow Examples for Software Development

## What is Plexus?

**Plexus** is a "Second Brain" system that captures unstructured input (text, voice, images), processes it through AI to classify and extract insights, and surfaces actionable items. It's designed as **infrastructure** - an API-first platform that other apps can build upon.

---

## Core Flow: `Input → Thought → Action`

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Capture   │────▶│   AI Processing  │────▶│   Output    │
│ (text/voice │     │ (classify, refine│     │ (thoughts,  │
│  /image)    │     │  extract actions)│     │  actions)   │
└─────────────┘     └──────────────────┘     └─────────────┘
```

---

## 📋 Workflow 1: Feature Request Capture

### Scenario
You're brainstorming a new sub-app for KrisPC Hub and want to capture ideas quickly.

### Steps

```bash
# 1. Capture via API
curl -X POST http://localhost:8080/api/plexus/v1/ingest/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "New app idea: Budget tracker that imports bank statements and categorizes expenses using AI. Should integrate with the Hub auth system. MVP: upload CSV, see pie chart of categories.",
    "source": "api"
  }'

# 2. Plexus AI will:
#    - Classify as "task" (high confidence)
#    - Extract actions: 
#      - "Create Django app 'budget'"
#      - "Design CSV import model"
#      - "Implement AI categorization service"
#      - "Add pie chart visualization"
```

### Result in Dashboard
```
┌────────────────────────────────────────────────────────┐
│ 🏷️ TASK | Confidence: 0.92                             │
├────────────────────────────────────────────────────────┤
│ Budget tracker app for KrisPC Hub - imports bank       │
│ statements, AI-powered expense categorization, CSV     │
│ upload with pie chart visualization.                   │
├────────────────────────────────────────────────────────┤
│ ☐ Create Django app 'budget'                           │
│ ☐ Design CSV import model                              │
│ ☐ Implement AI categorization service                  │
│ ☐ Add pie chart visualization                          │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Workflow 2: Code Review Notes via Voice

### Scenario
You're reviewing a PR and want to dictate your thoughts hands-free.

### Steps

```javascript
// 1. Record audio using the AudioRecorder component
const recorder = new AudioRecorder({
    uploadUrl: '/api/plexus/voice-capture/',
    onSuccess: (data) => console.log('Captured:', data.id)
});

// 2. Speak your review
"The calendar editor changes look good but there's a potential 
N+1 query issue in the event loading. Also need to add tests 
for the new color accessibility feature. Remember to check 
mobile responsiveness on the preview modal."

// 3. Plexus transcribes and processes:
{
  "classification": "task",
  "refined_content": "PR review notes: Calendar editor changes approved with concerns about N+1 query in event loading. Missing tests for color accessibility. Mobile responsiveness check needed for preview modal.",
  "actions": [
    "Fix N+1 query in calendar event loading",
    "Add tests for color accessibility feature", 
    "Test preview modal on mobile devices"
  ]
}
```

---

## 📋 Workflow 3: Architecture Decision Recording

### Scenario
You've made an important technical decision and want to document it for future reference.

### Steps

```python
# Using the Plexus API programmatically in a dev script
import requests

decision = """
ADR-007: Using Toast notifications instead of browser alerts

Context: Browser alert() blocks the main thread and is not accessible to screen readers.

Decision: Implement a custom Toast component with aria-live regions.

Consequences:
- Better UX with non-blocking notifications
- WCAG 2.1 AA compliance
- Additional 300 lines of JS code to maintain
- Need to ensure Toast component is loaded on all pages
"""

response = requests.post(
    'http://localhost:8080/api/plexus/v1/ingest/',
    headers={'Authorization': 'Token YOUR_TOKEN'},
    json={'content': decision, 'source': 'api'}
)

# Plexus classifies as "reference" with high confidence
# Links it to any previous thoughts mentioning "accessibility" or "alerts"
```

---

## 📋 Workflow 4: Bug Report Triage

### Scenario
A user reports a bug via email. You paste it into Plexus for processing.

### Input
```
User Report:
"When I try to upload a PDF with special characters in the filename 
(like 'März_2024.pdf'), the calendar editor shows 'Failed to load events' 
but no error details. I'm using Firefox on Mac."
```

### Plexus Output
```json
{
  "classification": "task",
  "confidence_score": 0.95,
  "refined_content": "Bug: PDF upload fails for filenames with special characters (e.g., 'März_2024.pdf'). Calendar editor shows generic error without details. Affects Firefox/Mac.",
  "actions": [
    "Reproduce bug with special character filename",
    "Add proper UTF-8 handling in PDF upload",
    "Improve error messages in calendar editor",
    "Add Firefox/Mac to test matrix"
  ]
}
```

---

## 📋 Workflow 5: Development Sprint Planning

### Scenario
You want to use Plexus to generate a sprint backlog from scattered notes.

### Using the Kanban View

```
┌──────────────────┬──────────────────┬──────────────────┐
│     PENDING      │       DONE       │    DISMISSED     │
├──────────────────┼──────────────────┼──────────────────┤
│ ☐ Add color      │ ☑ Create Toast   │ ✕ Research React │
│   names for a11y │   component      │   Native port    │
│                  │                  │                  │
│ ☐ Fix N+1 query  │ ☑ Replace all    │ ✕ Dark mode for  │
│   in events      │   alert() calls  │   PDF2Cal (v2)   │
│                  │                  │                  │
│ ☐ Mobile test    │ ☑ Add aria-live  │                  │
│   preview modal  │   regions        │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

### API Query for Sprint Items
```bash
# Get all pending actions as JSON
curl http://localhost:8080/api/plexus/v1/actions/?status=pending \
  -H "Authorization: Token YOUR_TOKEN"

# Response
{
  "count": 12,
  "results": [
    {"id": 45, "description": "Add color names for a11y", "thought_id": 23},
    {"id": 44, "description": "Fix N+1 query in event loading", "thought_id": 22},
    ...
  ]
}
```

---

## 📋 Workflow 6: Creating a New Sub-App from Plexus Insights

### Scenario
After capturing several ideas, you want Plexus to help generate a development plan.

### Step 1: Query Related Thoughts
```bash
# Search for all thoughts related to "budget"
curl "http://localhost:8080/api/plexus/v1/thoughts/?q=budget" \
  -H "Authorization: Token YOUR_TOKEN"
```

### Step 2: Use LLM Service to Generate Plan
```python
# In a management command or script
from plexus.services.llm import query_llm
from plexus.models import Thought

# Gather all budget-related thoughts
thoughts = Thought.objects.filter(content__icontains='budget')
context = "\n".join([t.content for t in thoughts])

prompt = f"""
Based on these captured ideas:
{context}

Generate a Django app structure for a 'budget' sub-app in KrisPC Hub.
Include: models, views, URLs, and a basic template layout.
"""

plan = query_llm(prompt)
print(plan)
```

### Step 3: Resulting Development Plan
```markdown
# Budget App Structure

## Models (budget/models.py)
- Transaction: amount, date, description, category (FK), source_file
- Category: name, color, is_income, ai_generated
- ImportSession: file, uploaded_at, status, user

## Views
- DashboardView: pie chart, recent transactions
- ImportView: CSV upload form
- CategoryListView: manage categories

## URLs
- /budget/ → Dashboard
- /budget/import/ → Import CSV
- /budget/categories/ → Category management
- /api/budget/transactions/ → REST API

## Integration Points
- Use Hub authentication (LoginRequiredMixin)
- Register in hub/urls.py
- Add to navigation in hub/templates/base.html
```

---

## 📋 Workflow 7: Auto-Linking Related Thoughts

### How It Works
Plexus automatically links thoughts that share semantic similarity.

```python
# In plexus/services/linking.py
def find_relevant_links(thought):
    """
    Finds and creates links to related thoughts.
    Uses embedding similarity or keyword matching.
    """
    # Get recent thoughts (excluding self)
    candidates = Thought.objects.exclude(id=thought.id).order_by('-created_at')[:50]
    
    for candidate in candidates:
        similarity = calculate_similarity(thought.content, candidate.content)
        if similarity > 0.7:
            ThoughtLink.objects.get_or_create(
                source=thought,
                target=candidate,
                defaults={'reason': f'Semantic similarity: {similarity:.2%}'}
            )
```

### Visual in Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ 🏷️ TASK | Budget tracker MVP                          │
├─────────────────────────────────────────────────────────┤
│ 🔗 Related Thoughts:                                   │
│   → "AI categorization for expenses" (92% similar)     │
│   → "Hub authentication integration" (78% similar)     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Integration Example: Adding Plexus to a New Sub-App

### In your new app's `views.py`:
```python
from plexus.services.llm import query_llm
from plexus.models import Input

class SmartSuggestionView(LoginRequiredMixin, View):
    """Use Plexus to provide AI suggestions in your app."""
    
    def post(self, request):
        user_input = request.POST.get('query')
        
        # 1. Capture to Plexus for history
        Input.objects.create(
            content=f"[MyApp Query] {user_input}",
            source="api"
        )
        
        # 2. Get AI suggestion
        suggestion = query_llm(f"Based on this request: {user_input}, suggest...")
        
        return JsonResponse({'suggestion': suggestion})
```

---

## 📊 Summary: Plexus as Development Infrastructure

| Use Case | Plexus Feature | API Endpoint |
|----------|---------------|--------------|
| Capture ideas | Input ingestion | `POST /api/plexus/v1/ingest/` |
| Voice notes | Transcription | `POST /api/plexus/voice-capture/` |
| Task tracking | Actions | `GET /api/plexus/v1/actions/` |
| Knowledge base | Thoughts | `GET /api/plexus/v1/thoughts/` |
| AI generation | LLM service | `plexus.services.llm.query_llm()` |
| Sprint planning | Kanban view | `/plexus/kanban/` |
| Review queue | Low-confidence filter | `/plexus/review/` |

---

## 🚀 Getting Started

1. **Capture something**: Use the web UI at `/plexus/capture/` or the API
2. **View processed thoughts**: Check `/plexus/dashboard/`
3. **Track actions**: Use the Kanban at `/plexus/kanban/`
4. **Build on it**: Use `plexus.services.llm.query_llm()` in your own apps

Plexus acts as the **"brain"** of your development workflow - capturing, processing, and surfacing insights that can then be used by humans or other AI agents to build new features for KrisPC Hub.
