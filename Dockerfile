# Stage 1: Build frontend assets with Node.js
FROM node:20-slim AS node-builder

WORKDIR /app

# Install Python and build tools for native modules (better-sqlite3, canvas)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

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
RUN npm install --legacy-peer-deps

COPY apps/emoty_web ./
RUN npm run build

# Prepare for production run
RUN echo "Next.js build complete"
# -------------------------------------

# Stage 2: Install Python dependencies
FROM python:3.13-slim AS python-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Production runtime
FROM python:3.13-slim

WORKDIR /app

# Install runtime dependencies (no NodeSource — we copy the node binary directly)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

# Copy node binary from node-builder (same Debian bookworm-slim base, compatible libs)
COPY --from=node-builder /usr/local/bin/node /usr/local/bin/node

# Copy Python packages from builder stage
COPY --from=python-builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=python-builder /usr/local/bin /usr/local/bin

# Copy Vite build artifacts from node builder
COPY --from=node-builder /app/krispc/static/dist ./krispc/static/dist

# Copy Next.js standalone bundle (output: 'standalone' — no node_modules needed at runtime)
COPY --from=node-builder /app/apps/emoty_web/.next/standalone ./apps/emoty_web/.next/standalone
COPY --from=node-builder /app/apps/emoty_web/.next/static     ./apps/emoty_web/.next/standalone/apps/emoty_web/.next/static
COPY --from=node-builder /app/apps/emoty_web/public           ./apps/emoty_web/.next/standalone/apps/emoty_web/public

# Copy application code
COPY . .
RUN chmod +x /app/start-fly-app.sh

# Entrypoint: writes Redis mTLS certs from env vars to temp files at runtime
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Collect static files (includes Vite assets)
# Use dummy values for build stage (real values set via Fly.io secrets)
ENV SECRET_KEY="build-stage-dummy-key-not-used-in-production" \
    MAPBOX_TOKEN="build-dummy"
RUN python manage.py collectstatic --noinput

# Create non-root user for security
RUN useradd -m -u 1000 django && \
    chown -R django:django /app

USER django

# Expose port 8080 (fly.io standard)
EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()"
