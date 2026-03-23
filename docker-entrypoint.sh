#!/bin/bash
set -e

# No mTLS setup needed — Valkey runs on Fly private networking (plain redis://)

exec "$@"
