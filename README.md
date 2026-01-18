# KrisPC Base & Plexus SecondBrain

A modernized Django web application featuring KrisPC IT services and the Plexus SecondBrain cognitive offloading system.

## 🚀 Overview

This project is a complete modernization of the KrisPC website, transitioning from legacy Bootstrap to a modern tech stack.

- **KrisPC IT Services:** Modern UI built with Vue 3, Vite, and Tailwind CSS.
- **Plexus SecondBrain:** A cognitive offloading system designed to autonomously transmute chaotic thoughts into structured, actionable data.

## 🛠 Tech Stack

### Frontend
- **Vue 3.5 (Composition API):** Modern component architecture.
- **Tailwind CSS 3.4:** Utility-first styling with custom design system.
- **Vite 6.0:** Fast build tool with HMR (Hot Module Replacement).
- **Heroicons:** Optimized SVG icons.
- **HTMX:** For seamless server-side interactions.

### Backend
- **Django 6.0:** Robust Python web framework.
- **Django Vite:** Seamless integration between Django and Vite.
- **Channels:** Real-time capabilities.
- **Celery & Redis:** For background task processing (used in Plexus and P2C).
- **REST Framework:** API support for external integrations.

## 🧠 Plexus SecondBrain

Plexus is integrated into this base, providing:
- **Frictionless Capture:** Single stream ingestion via web or voice.
- **AI Processing:** Intelligent classification and action extraction (Gemini/OpenAI).
- **Structured Data:** Automated organization of thoughts and tasks.

## 📦 Getting Started

### Prerequisites
- Python 3.10+
- Node.js & npm
- Redis (for Celery and Channels)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd krispcBase
   ```

2. **Set up Python environment:**
   ```bash
   pip install -r requirements.txt
   # or
   pipenv install
   ```

3. **Set up Frontend:**
   ```bash
   npm install
   npm run build
   ```

4. **Environment Variables:**
   Create a `.env` file based on `.env.example` (if available) or ensure the following are set:
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `GEMINI_API_KEY` (for Plexus)
   - `FLY_APP` (if deploying to Fly.io)

5. **Run Migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start Development Server:**
   ```bash
   # Run Django
   python manage.py runserver
   
   # Run Vite (in another terminal for HMR)
   npm run dev
   ```

## 🚢 Deployment

This project is optimized for deployment on **Fly.io**. See `DEPLOYMENT.md` for detailed instructions.

## 🧪 Testing

Run tests using pytest:
```bash
pytest
```
See `TESTING.md` for the comprehensive testing checklist.

---
© 2026 KrisPC. All rights reserved.