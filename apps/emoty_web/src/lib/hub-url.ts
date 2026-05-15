const LOCAL_HUB_BASE_URL = 'http://hub.localhost:8000';
const PRODUCTION_HUB_BASE_URL = 'https://hub.krispc.fr';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

type HubUrlEnv = {
  NEXT_PUBLIC_HUB_BASE_URL?: string;
  NODE_ENV?: string;
};

type BrowserLocation = Pick<Location, 'hostname' | 'origin'>;

export function getHubBaseUrl(env: HubUrlEnv = process.env): string {
  const explicitHubUrl = env.NEXT_PUBLIC_HUB_BASE_URL?.trim();

  if (explicitHubUrl) {
    return explicitHubUrl;
  }

  if (env.NODE_ENV === 'development') {
    return LOCAL_HUB_BASE_URL;
  }

  return PRODUCTION_HUB_BASE_URL;
}

export function getInitialHubBaseUrl(): string {
  return PRODUCTION_HUB_BASE_URL;
}

export function getBrowserHubBaseUrl(location: BrowserLocation = window.location): string {
  if (LOCAL_HOSTNAMES.has(location.hostname)) {
    return location.origin;
  }

  if (location.hostname.endsWith('.localhost')) {
    const localHubUrl = new URL(location.origin);
    localHubUrl.hostname = 'hub.localhost';
    return localHubUrl.origin;
  }

  return getHubBaseUrl({
    NEXT_PUBLIC_HUB_BASE_URL: process.env.NEXT_PUBLIC_HUB_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}
