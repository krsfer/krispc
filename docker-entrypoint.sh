#!/bin/bash
set -e

# Write Redis mTLS certs from secret env vars to temp files at runtime.
# Set REDIS_CA_CERT, REDIS_CLIENT_CERT, REDIS_CLIENT_KEY as Fly secrets (file contents).
# This avoids committing cert files to the repo or baking them into the image.
if [ -n "$REDIS_CA_CERT" ] && [ -n "$REDIS_CLIENT_CERT" ] && [ -n "$REDIS_CLIENT_KEY" ]; then
    mkdir -p /tmp/redis_certs
    printf '%s' "$REDIS_CA_CERT"     > /tmp/redis_certs/ca.pem
    printf '%s' "$REDIS_CLIENT_CERT" > /tmp/redis_certs/client.crt
    printf '%s' "$REDIS_CLIENT_KEY"  > /tmp/redis_certs/client.key
    chmod 600 /tmp/redis_certs/client.key
    export REDIS_CA_CERT_PATH=/tmp/redis_certs/ca.pem
    export REDIS_CLIENT_CERT_PATH=/tmp/redis_certs/client.crt
    export REDIS_CLIENT_KEY_PATH=/tmp/redis_certs/client.key
    echo "[entrypoint] Redis mTLS certs written."
else
    echo "[entrypoint] REDIS_CA_CERT / REDIS_CLIENT_CERT / REDIS_CLIENT_KEY not set — skipping mTLS cert setup."
fi

exec "$@"
