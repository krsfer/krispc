import { getBrowserHubBaseUrl, getHubBaseUrl, getInitialHubBaseUrl } from '../hub-url';

describe('getHubBaseUrl', () => {
  it('prefers NEXT_PUBLIC_HUB_BASE_URL when provided', () => {
    expect(
      getHubBaseUrl({
        NEXT_PUBLIC_HUB_BASE_URL: 'https://custom.krispc.fr',
        NODE_ENV: 'production',
      })
    ).toBe('https://custom.krispc.fr');
  });

  it('uses localhost in development when NEXT_PUBLIC_HUB_BASE_URL is missing', () => {
    expect(
      getHubBaseUrl({
        NODE_ENV: 'development',
      })
    ).toBe('http://hub.localhost:8000');
  });

  it('uses the production hub URL outside development when NEXT_PUBLIC_HUB_BASE_URL is missing', () => {
    expect(
      getHubBaseUrl({
        NODE_ENV: 'production',
      })
    ).toBe('https://hub.krispc.fr');
  });

  it('uses a stable production URL for the initial server and hydration render', () => {
    expect(getInitialHubBaseUrl()).toBe('https://hub.krispc.fr');
  });

  it('uses the current origin when browsed through the local Django proxy', () => {
    expect(
      getBrowserHubBaseUrl({
        hostname: '127.0.0.1',
        origin: 'http://127.0.0.1:8000',
      })
    ).toBe('http://127.0.0.1:8000');
  });

  it('maps local subdomains back to the local hub subdomain', () => {
    expect(
      getBrowserHubBaseUrl({
        hostname: 'emo.localhost',
        origin: 'http://emo.localhost:8000',
      })
    ).toBe('http://hub.localhost:8000');
  });
});
