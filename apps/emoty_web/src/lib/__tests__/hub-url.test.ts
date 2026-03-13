import { getHubBaseUrl } from '../hub-url';

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
});
