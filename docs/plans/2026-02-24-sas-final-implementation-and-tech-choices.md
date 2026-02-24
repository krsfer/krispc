# SAS Secure File Sharing: Final Implementation and Tech Choices

Date: 2026-02-24
Target domain: `sas.krispc.fr`

## 1. Goal
Deliver a minimal, secure file-sharing "sas" service where:
- Django admin uploads one active file with optional caption.
- Public users pass Cloudflare Turnstile, then download the file.
- Maximum successful downloads per uploaded file: 2.
- Every access attempt (allowed or blocked) is logged and alerts admin by email.
- Access analytics include client IP, best-guess geo data (IPinfo), and request context.

## 2. Core Functional Rules

### 2.1 Download counting
- Counter increments only for successful file deliveries.
- Failed Turnstile, blocked by limit, or invalid request does not increment.
- New admin upload creates the new active file and resets count to `0`.

### 2.2 Turnstile policy
- Both client and server integration are required.
- Backend validates Cloudflare response on each download POST.
- Validation checks include:
  - `success == true`
  - `hostname == sas.krispc.fr` (or environment-specific allowed host)
  - expected `action` value
  - `error-codes` captured for logs/alerts.

### 2.3 Access attempts and email policy
- Email is sent for all access attempts (success and failure).
- Failed Turnstile attempts are notified and logged.

## 3. Security and Abuse Controls

### 3.1 Link secrecy / anti-enumeration
- Download URLs use UUID-based identifiers, not sequential IDs.
- Route format: `/download/<uuid>/`.

### 3.2 Trusted IP hierarchy
- Preferred extraction order:
  1. `Fly-Client-IP`
  2. `CF-Connecting-IP` (only when traffic is known to pass Cloudflare)
  3. safe handling of `X-Forwarded-For` first hop under trusted proxy config.
- Do not trust arbitrary forwarded headers from untrusted clients.

### 3.3 Rate limiting
- Apply per-IP rate limit on download POST endpoint.
- Initial policy: `5 requests / minute / IP`.
- Store rate-limit state in shared cache backend (Redis), not local memory.

### 3.4 File safety
- Upload is admin-only.
- Enforce strict max upload size at:
  - Django settings (`DATA_UPLOAD_MAX_MEMORY_SIZE`, `FILE_UPLOAD_MAX_MEMORY_SIZE` if used)
  - edge/proxy/platform (Fly/nginx equivalent body size controls).
- Malware scanning is explicitly out of scope for V1.

## 4. Data Model and Auditability

### 4.1 Source of truth
- `AccessLog` database table is the primary audit source.
- Email is alerting only, not authoritative retention storage.

### 4.2 Minimum logged fields
- `file_id`, `created_at`, `was_allowed`, `reason`
- `ip_address`, `user_agent`, `method`, `path`, `referrer`, `accept_language`
- Turnstile details:
  - `turnstile_success`
  - `turnstile_error_codes` (JSON array)
  - `turnstile_hostname`
  - `turnstile_action`
- Geo/IPinfo details:
  - `geo_latitude`, `geo_longitude`, `geo_payload`
  - `ipinfo_error` (timeout, 429, parse error, etc.)
- Email details:
  - `email_sent` boolean
  - `email_error` (SMTP exception text when failed).

## 5. Privacy and Compliance (GDPR)
- Legal basis: Legitimate Interest (GDPR Art. 6(1)(f)) for abuse prevention/access control.
- Public notice on page near Turnstile:
  - IP and approximate location are processed for anti-abuse and admin alerting.
- Third-party disclosure:
  - Cloudflare Turnstile
  - IPinfo geolocation.
- Retention:
  - hard-delete logs older than 30 days.
  - run scheduled DB maintenance for SQLite reclamation (see section 8.4).

## 6. External Service Failure Behavior

### 6.1 SMTP failure
- Fail-open for download when user is otherwise authorized.
- Log `email_error`.
- Keep request processing successful if file can be served.

### 6.2 IPinfo failure
- Fail-open for download when user is otherwise authorized.
- Timeout target: 2 seconds.
- Fallback to raw IP-only analytics.
- Log `ipinfo_error`.

## 7. Secret Management

### 7.1 Storage policy
- Secrets are environment-only.
- Production source of truth: Fly secrets.
- Local development: `.env` (gitignored).
- Never commit secrets or cert keys to repository.

### 7.2 Required secrets for production
- `SECRET_KEY`
- `TURNSTILE_SITEKEY`
- `TURNSTILE_SECRET`
- `SAS_IPINFO_TOKEN`
- SMTP credentials as needed (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, etc.).

### 7.3 Exposure rules
- `TURNSTILE_SITEKEY` is public-by-design but still configured via env for consistency.
- `TURNSTILE_SECRET` and `SAS_IPINFO_TOKEN` are server-only.
- Admin alert email must not include full plaintext API tokens.
  - Any helper curl snippet must redact token value.

## 8. Deployment and Runtime Choices

### 8.1 Database topology
- DB engine: SQLite.
- Fly deployment must remain single-machine topology (single writable volume).
- No horizontal scaling while SQLite is primary write store.
- If multi-machine HA is required, migrate to PostgreSQL first.

### 8.2 DNS/TLS and host security
- DNS: `sas.krispc.fr` points to app.
- TLS termination handled by Fly.
- `CSRF_TRUSTED_ORIGINS` includes `https://sas.krispc.fr`.
- `ALLOWED_HOSTS` should be environment-driven and include all active subdomains needed by the monolith.

### 8.3 Logging
- Structured log output to stdout/stderr for platform capture.
- Include attempt outcome and external integration errors.

### 8.4 SQLite maintenance
- 30-day purge runs on schedule (Celery beat/cron).
- `VACUUM` runs scheduled off-peak (daily/weekly), not per request.
  - Rationale: reduces lock contention and operational impact.

## 9. HTTP Response Hardening
- For challenge page and file responses:
  - `Cache-Control: no-store, no-cache, must-revalidate`
  - `X-Robots-Tag: noindex, nofollow`

## 10. Test Strategy

### 10.1 Automated tests
- Unit tests:
  - counter increment behavior
  - limit enforcement
  - IP extraction hierarchy
  - fail-open behavior for SMTP/IPinfo
  - secret requirement behavior in production mode.
- Integration tests:
  - subdomain routing (`sas.krispc.fr`)
  - Turnstile pass/fail server validation path
  - email outbox assertions
  - rate-limit assertions.
- End-to-end style (Django TestCase/pytest-django):
  - mock IPinfo API response
  - validate structured log + AccessLog row creation
  - verify response headers.

### 10.2 Production-like headers
- Include `Fly-Client-IP` and forwarded header scenarios in tests.

## 11. Technology Choices
- Framework: Django (existing monolith structure).
- Bot protection: Cloudflare Turnstile (`django-turnstile` + explicit response checks).
- Geo lookup: IPinfo lite endpoint.
- Email: Django `send_mail` via configured SMTP provider.
- Rate limiting: `django-ratelimit` backed by Redis cache.
- Storage: SQLite (single-machine Fly volume).
- Scheduling: Celery beat or cron for retention/maintenance jobs.

## 12. Non-Goals (V1)
- Public multi-file management portal.
- Per-recipient invitations/access lists.
- Malware scanning pipeline.
- Multi-region or multi-writer HA topology.

## 13. Production Readiness Checklist
- [ ] Fly secrets set for all required keys.
- [ ] `sas.krispc.fr` DNS + TLS validated.
- [ ] Turnstile server validation checks `success`, `hostname`, `action`.
- [ ] UUID download links enabled.
- [ ] Rate limiting enabled with Redis cache backend.
- [ ] 30-day purge job scheduled.
- [ ] Off-peak `VACUUM` schedule configured.
- [ ] Token redaction in alert email confirmed.
- [ ] Structured logging verified in Fly logs.
- [ ] End-to-end tests passing on subdomain path.

