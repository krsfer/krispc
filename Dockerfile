# Stage 1: Build frontend assets with Node.js
FROM node:18-slim AS node-builder

WORKDIR /app

# Copy package files and install dependencies (Root/Vite)
COPY package*.json ./
RUN npm install

# Copy frontend source files (Root/Vite)
COPY krispc/static/src ./krispc/static/src
COPY vite.config.js postcss.config.js tailwind.config.js ./

# Build Vite assets
RUN npm run build

# --- Build Next.js App (Emoty Web) ---
WORKDIR /app/apps/emoty_web
COPY apps/emoty_web/package*.json ./
RUN npm install

COPY apps/emoty_web ./
RUN npm run build
# -------------------------------------

# Stage 2: Install Python dependencies
FROM python:3.13-slim AS python-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pipenv
RUN pip install --no-cache-dir pipenv

# Copy Pipfile and Pipfile.lock
COPY Pipfile Pipfile.lock ./

# Install Python dependencies into system Python
RUN pipenv install --system --deploy --ignore-pipfile

# Stage 3: Production runtime
FROM python:3.13-slim

WORKDIR /app

# Install runtime dependencies including Node.js for Next.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder stage
COPY --from=python-builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=python-builder /usr/local/bin /usr/local/bin

# Copy Vite build artifacts from node builder
COPY --from=node-builder /app/krispc/static/dist ./krispc/static/dist

# Copy Next.js build artifacts from node builder
COPY --from=node-builder /app/apps/emoty_web ./apps/emoty_web

# Copy application code
COPY . .

# Collect static files (includes Vite assets)
# Use dummy values for build stage (real values set via Fly.io secrets)
ENV SECRET_KEY="build-stage-dummy-key-not-used-in-production" \
    MAPBOX_TOKEN="build-dummy" \
    GOOGLE_MAPS_API_KEY="build-dummy" \
    SENDGRID_API_KEY="build-dummy"
RUN python manage.py collectstatic --noinput

# Create non-root user for security
RUN useradd -m -u 1000 django && \
    chown -R django:django /app

USER django

# Expose port 8080 (fly.io standard)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()"
