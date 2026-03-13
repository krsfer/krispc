const LOCAL_HUB_BASE_URL = 'http://hub.localhost:8000';
const PRODUCTION_HUB_BASE_URL = 'https://hub.krispc.fr';

type HubUrlEnv = {
  NEXT_PUBLIC_HUB_BASE_URL?: string;
  NODE_ENV?: string;
};

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
