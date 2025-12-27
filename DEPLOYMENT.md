# Deployment Guide - KrisPC UI Modernization

## Overview

This guide covers deploying the modernized KrisPC Django application with Vue 3 + Vite frontend to production.

---

## Technology Stack

**Backend:**
- Python 3.13.5
- Django 6.0
- django-vite for asset integration
- django-htmx for enhanced interactions

**Frontend:**
- Vue 3.5.13 (Composition API)
- Vite 6.0.3 (build tool)
- Tailwind CSS 3.4.17
- Heroicons 2.2.0

**Key Features:**
- Server-side rendering (Django templates)
- Progressive enhancement (Vue components)
- Code splitting & lazy loading
- Modern build pipeline

---

## Pre-Deployment Checklist

### 1. Environment Preparation

- [ ] Production server provisioned
- [ ] Python 3.13+ installed
- [ ] Node.js 18+ installed
- [ ] Database location confirmed (SQLite at ./db.sqlite3)
- [ ] Nginx/Apache configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured

### 2. Code Review

- [ ] All tests passed (see TESTING.md)
- [ ] Code reviewed and approved
- [ ] No console.log/debug statements in production code
- [ ] Environment variables documented
- [ ] .gitignore properly configured

### 3. Backup

- [ ] Database backup created
- [ ] Static files backup created
- [ ] Codebase backup created
- [ ] Rollback plan documented

---

## Deployment Steps

### Step 1: Prepare Codebase

```bash
# 1. Clone/pull latest code
git pull origin main

# 2. Install Python dependencies
pipenv install --deploy

# 3. Install Node.js dependencies
npm ci  # Use 'ci' instead of 'install' for deterministic builds
```

### Step 2: Configure Environment

**Create `.env` file (or set environment variables):**

```bash
# Django settings
DEBUG=False
SECRET_KEY=your-secure-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (SQLite by default, no configuration needed)
# Optional: Override with DATABASE_URL if needed
# DATABASE_URL=sqlite:///path/to/custom/db.sqlite3

# Static files
STATIC_ROOT=/var/www/krispc/static
STATIC_URL=/static/

# Security settings (HTTPS required)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Vite/Django integration
DJANGO_VITE_DEV_MODE=False
```

**Update `_main/settings.py` for production:**

```python
# Ensure these settings are configured
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

# Static files
STATIC_ROOT = os.getenv('STATIC_ROOT', BASE_DIR / 'staticfiles')
STATIC_URL = os.getenv('STATIC_URL', '/static/')

# Security
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# DJANGO_VITE configuration
DJANGO_VITE = {
    'default': {
        'dev_mode': DEBUG,
        'dev_server_host': 'localhost',
        'dev_server_port': 5173,
        'manifest_path': BASE_DIR / 'krispc' / 'static' / 'dist' / '.vite' / 'manifest.json',
    }
}
```

### Step 3: Build Frontend Assets

```bash
# Build Vue/Vite assets for production
npm run build

# Verify build output
ls -lh krispc/static/dist/assets/

# Expected output:
# - main-[hash].js (~93 KB)
# - main-[hash].css (~45 KB)
# - ServiceModal-[hash].js (~3 KB)
# - TeamSection-[hash].js (~3 KB)
# - ContactForm-[hash].js (~6 KB)
# - manifest.json
```

### Step 4: Collect Django Static Files

```bash
# Collect all static files to STATIC_ROOT
pipenv run python manage.py collectstatic --noinput

# Verify collection
ls -lh staticfiles/
```

### Step 5: Database Migrations

```bash
# Run migrations
pipenv run python manage.py migrate

# Create superuser (if needed)
pipenv run python manage.py createsuperuser
```

### Step 6: Run Deployment Checks

```bash
# Run Django deployment checks
pipenv run python manage.py check --deploy

# Address any critical issues
# Security warnings are expected if not using HTTPS in development
```

### Step 7: Configure Web Server

#### Option A: Nginx Configuration

**Create `/etc/nginx/sites-available/krispc`:**

```nginx
upstream krispc_app {
    server unix:/run/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static files
    location /static/ {
        alias /var/www/krispc/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Gzip compression
        gzip on;
        gzip_types text/css application/javascript application/json image/svg+xml;
        gzip_min_length 1000;
    }

    # Media files (if applicable)
    location /media/ {
        alias /var/www/krispc/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Application
    location / {
        proxy_pass http://krispc_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Increase client body size for file uploads
    client_max_body_size 10M;
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/krispc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Option B: Apache Configuration

**Create `/etc/apache2/sites-available/krispc.conf`:**

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Static files
    Alias /static /var/www/krispc/static
    <Directory /var/www/krispc/static>
        Require all granted
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
    </Directory>

    # WSGI configuration
    WSGIDaemonProcess krispc python-home=/path/to/venv python-path=/path/to/krispc
    WSGIProcessGroup krispc
    WSGIScriptAlias / /path/to/krispc/_main/wsgi.py

    <Directory /path/to/krispc/_main>
        <Files wsgi.py>
            Require all granted
        </Files>
    </Directory>
</VirtualHost>
```

**Enable site:**

```bash
sudo a2ensite krispc
sudo systemctl reload apache2
```

### Step 8: Configure Application Server

#### Option A: Gunicorn (Recommended)

**Create systemd service `/etc/systemd/system/gunicorn.service`:**

```ini
[Unit]
Description=Gunicorn daemon for KrisPC
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/krispc
Environment="PATH=/var/www/krispc/.venv/bin"
ExecStart=/var/www/krispc/.venv/bin/gunicorn \
    --workers 3 \
    --bind unix:/run/gunicorn.sock \
    --timeout 60 \
    --access-logfile - \
    --error-logfile - \
    _main.wsgi:application

[Install]
WantedBy=multi-user.target
```

**Start service:**

```bash
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
sudo systemctl status gunicorn
```

#### Option B: uWSGI

**Create `/etc/uwsgi/apps-available/krispc.ini`:**

```ini
[uwsgi]
chdir = /var/www/krispc
module = _main.wsgi:application
home = /var/www/krispc/.venv
master = true
processes = 4
socket = /run/uwsgi/krispc.sock
chmod-socket = 666
vacuum = true
die-on-term = true
```

### Step 9: Verify Deployment

```bash
# Check application status
sudo systemctl status gunicorn  # or uwsgi
sudo systemctl status nginx     # or apache2

# Check logs
sudo journalctl -u gunicorn -f
sudo tail -f /var/log/nginx/error.log

# Test endpoints
curl https://yourdomain.com
curl -I https://yourdomain.com/static/dist/assets/main-*.js
```

### Step 10: Post-Deployment Testing

1. **Access the website:**
   - https://yourdomain.com
   - Verify all pages load
   - Check for 404/500 errors

2. **Test functionality:**
   - Navigation works
   - Forms submit correctly
   - Service modals open
   - All Vue components render

3. **Performance check:**
   - Run Lighthouse audit
   - Verify Core Web Vitals
   - Check bundle sizes loaded

4. **Security check:**
   - SSL certificate valid
   - HTTPS redirect works
   - Security headers present

---

## Monitoring & Maintenance

### Application Monitoring

**Set up monitoring for:**
- [ ] Server uptime
- [ ] Application errors (Sentry, Rollbar)
- [ ] Performance metrics (New Relic, DataDog)
- [ ] Database performance
- [ ] Static file delivery

**Log locations:**
```bash
# Application logs
/var/log/gunicorn/access.log
/var/log/gunicorn/error.log

# Web server logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Django logs
/var/www/krispc/logs/django.log
```

### Regular Maintenance

**Weekly:**
- [ ] Review error logs
- [ ] Check disk space
- [ ] Verify backups running

**Monthly:**
- [ ] Update dependencies (security patches)
- [ ] Review performance metrics
- [ ] Optimize database queries

**Quarterly:**
- [ ] Full security audit
- [ ] Performance optimization
- [ ] Update SSL certificates (if not auto-renewed)

---

## Rollback Procedure

### If deployment fails:

**1. Immediate rollback:**
```bash
# Restore previous codebase
git reset --hard <previous-commit>

# Rebuild assets
npm run build

# Collect static files
python manage.py collectstatic --noinput

# Restart services
sudo systemctl restart gunicorn nginx
```

**2. Database rollback (if needed):**
```bash
# Restore database backup
python manage.py migrate <app_name> <previous_migration>
# or restore from backup
```

**3. Verify rollback:**
```bash
curl https://yourdomain.com
# Check application is working
```

---

## Troubleshooting

### Common Issues

**1. Static files not loading (404)**
```bash
# Verify STATIC_ROOT is correct
echo $STATIC_ROOT

# Re-collect static files
python manage.py collectstatic --noinput

# Check nginx/apache config for static alias
```

**2. Vite assets not found**
```bash
# Verify manifest.json exists
ls -la krispc/static/dist/.vite/manifest.json

# Check DJANGO_VITE settings in settings.py
# Ensure dev_mode = False in production
```

**3. 500 Internal Server Error**
```bash
# Check application logs
sudo journalctl -u gunicorn -n 100

# Check Django logs
tail -100 /var/www/krispc/logs/django.log

# Common causes:
# - DEBUG=True in production (security risk)
# - Missing environment variables
# - Database connection issues
# - Incorrect file permissions
```

**4. CSS/JS not updating after deployment**
```bash
# Clear browser cache
# Or add cache-busting query param

# Verify new assets deployed
ls -lht krispc/static/dist/assets/ | head

# Check nginx cache (if enabled)
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

**5. Vue components not rendering**
```bash
# Check browser console for errors
# Verify Vite manifest resolves correctly
# Check that main.js loads without errors

# Test locally first:
DEBUG=False python manage.py runserver
# Open browser and check console
```

---

## Security Considerations

### Production Security Checklist

- [ ] `DEBUG = False`
- [ ] `SECRET_KEY` is random and secret
- [ ] `ALLOWED_HOSTS` configured correctly
- [ ] HTTPS enforced (SECURE_SSL_REDIRECT)
- [ ] Secure cookies enabled
- [ ] HSTS enabled
- [ ] Security headers configured
- [ ] CSRF protection enabled
- [ ] XSS protection enabled
- [ ] SQL injection prevented (Django ORM)
- [ ] Rate limiting configured (optional)
- [ ] File upload validation (if applicable)

### Regular Security Updates

```bash
# Check for vulnerabilities
pipenv check

# Update Python dependencies
pipenv update

# Update Node dependencies
npm audit
npm audit fix
```

---

## Performance Optimization

### Server-Side Optimization

**1. Enable caching:**
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

**2. Database optimization:**
```python
# Use connection pooling
# Add database indexes
# Optimize queries (select_related, prefetch_related)
```

**3. Static file optimization:**
```nginx
# Enable gzip in nginx.conf
gzip on;
gzip_types text/css application/javascript application/json;

# Add far-future expires headers
expires 1y;
add_header Cache-Control "public, immutable";
```

### Client-Side Optimization

**Already implemented:**
- ✅ Code splitting (3 lazy-loaded chunks)
- ✅ Tree-shaking (Vite + Heroicons)
- ✅ Minification & compression
- ✅ Font optimization

**Optional further optimizations:**
- [ ] Add service worker for offline support
- [ ] Implement image lazy loading
- [ ] Add preload hints for critical resources
- [ ] Configure CDN for static assets

---

## Continuous Deployment (Optional)

### GitHub Actions Example

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.13'

      - name: Install dependencies
        run: |
          npm ci
          pip install pipenv
          pipenv install --deploy

      - name: Run tests
        run: |
          pipenv run python manage.py test

      - name: Build frontend
        run: npm run build

      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v2
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          TARGET: /var/www/krispc

      - name: Restart services
        run: |
          ssh ${{ secrets.REMOTE_USER }}@${{ secrets.REMOTE_HOST }} \
            "sudo systemctl restart gunicorn nginx"
```

---

## Documentation & Support

### Additional Resources

- **Django Documentation:** https://docs.djangoproject.com/
- **Vue.js Guide:** https://vuejs.org/guide/
- **Vite Guide:** https://vitejs.dev/guide/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Heroicons:** https://heroicons.com/

### Contact

For deployment issues or questions:
- Email: support@krispc.com
- Documentation: /docs/
- Issue Tracker: GitHub Issues

---

**Last Updated:** 2025-12-25
**Version:** 1.0 (Post-Modernization)
**Maintainer:** Development Team
