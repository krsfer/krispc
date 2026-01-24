// Emoty Web Service Worker
// Provides offline functionality for pattern management

const CACHE_NAME = 'emoty-v1.2.0';
const API_CACHE_NAME = 'emoty-api-v1';
const STATIC_CACHE_NAME = 'emoty-static-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Core CSS and JS files will be auto-detected
];

// API endpoints that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/patterns',
  '/api/users',
  '/api/achievements',
  '/api/collections'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== API_CACHE_NAME && 
                     cacheName !== STATIC_CACHE_NAME;
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      // Claim clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - handle offline requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(url)) {
      event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(url)) {
      event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
      event.respondWith(handleNavigationRequest(request));
    }
  } else if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    if (isAPIRequest(url)) {
      event.respondWith(handleOfflineWrite(request));
    }
  }
});

// Handle static asset requests
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return cached version or offline fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for images
    if (request.url.includes('/icons/') || request.url.includes('/images/')) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ccc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Handle API requests with cache-first strategy for GETs
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  if (request.method === 'GET') {
    try {
      // For pattern requests, try cache first
      if (url.pathname.startsWith('/api/patterns')) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          // Return cached data but update in background
          fetchAndUpdateCache(request);
          return cachedResponse;
        }
      }

      // Fetch from network
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache successful responses for GET requests
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      // Return cached response if network fails
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline response
      return createOfflineAPIResponse(url);
    }
  }
  
  // For non-GET requests, always try network first
  try {
    return await fetch(request);
  } catch (error) {
    throw error; // Will be handled by handleOfflineWrite
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached app shell
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback offline page
    return new Response(
      createOfflinePage(),
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
}

// Handle offline write operations
async function handleOfflineWrite(request) {
  try {
    // Try to make the request
    return await fetch(request);
  } catch (error) {
    // Store request for background sync
    const url = new URL(request.url);
    
    if (isPatternRequest(url)) {
      await storeOfflinePatternRequest(request);
      return createOfflineSuccessResponse(request.method);
    }
    
    // Return appropriate offline response
    return new Response(
      JSON.stringify({
        error: 'Offline - request queued for sync',
        offline: true,
        queued: true
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'pattern-sync') {
    event.waitUntil(syncOfflinePatterns());
  } else if (event.tag === 'general-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

// Store offline pattern request for later sync
async function storeOfflinePatternRequest(request) {
  try {
    const requestData = {
      id: generateRequestId(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now(),
      synced: false
    };

    // Store in IndexedDB (same database as pattern cache)
    const db = await openDB();
    const transaction = db.transaction(['offline_requests'], 'readwrite');
    const store = transaction.objectStore('offline_requests');
    await store.add(requestData);
    
    // Register background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('pattern-sync');
    }
  } catch (error) {
    console.error('Failed to store offline request:', error);
  }
}

// Sync offline patterns when back online
async function syncOfflinePatterns() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offline_requests'], 'readwrite');
    const store = transaction.objectStore('offline_requests');
    
    const requests = await store.getAll();
    const patternRequests = requests.filter(req => 
      !req.synced && req.url.includes('/api/patterns')
    );

    for (const requestData of patternRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });

        if (response.ok) {
          // Mark as synced
          requestData.synced = true;
          await store.put(requestData);
          
          // Update cache with new data
          if (requestData.method === 'GET') {
            const cache = await caches.open(API_CACHE_NAME);
            await cache.put(requestData.url, response.clone());
          }
        }
      } catch (error) {
        console.error('Failed to sync request:', requestData.id, error);
      }
    }
  } catch (error) {
    console.error('Failed to sync offline patterns:', error);
  }
}

// Fetch and update cache in background
async function fetchAndUpdateCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, response.clone());
    }
  } catch (error) {
    // Ignore background update errors
  }
}

// Utility functions
function isStaticAsset(url) {
  return url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/images/') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.js') ||
         url.pathname === '/manifest.json' ||
         url.pathname === '/favicon.ico';
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isPatternRequest(url) {
  return url.pathname.startsWith('/api/patterns');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && 
          request.headers.get('accept') &&
          request.headers.get('accept').includes('text/html'));
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createOfflineAPIResponse(url) {
  if (url.pathname.startsWith('/api/patterns')) {
    return new Response(
      JSON.stringify({
        data: [],
        pagination: { total: 0, page: 1, limit: 20 },
        offline: true,
        message: 'Offline - showing cached patterns only'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response(
    JSON.stringify({
      error: 'Offline',
      offline: true,
      message: 'This feature requires an internet connection'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

function createOfflineSuccessResponse(method) {
  const action = method === 'POST' ? 'created' : 
                method === 'PUT' ? 'updated' : 
                method === 'DELETE' ? 'deleted' : 'processed';
  
  return new Response(
    JSON.stringify({
      success: true,
      offline: true,
      message: `Pattern ${action} offline - will sync when connection restored`,
      id: `temp_${Date.now()}`
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Emoty</title>
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif;
          text-align: center;
          padding: 2rem;
          background: #f8f9fa;
        }
        .offline-container {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .emoji { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #495057; margin-bottom: 1rem; }
        p { color: #6c757d; line-height: 1.5; }
        .retry-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="emoji">📱</div>
        <h1>You're Offline</h1>
        <p>
          You can still view your cached patterns and create new ones. 
          They'll sync automatically when you're back online.
        </p>
        <button class="retry-btn" onclick="location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
}

// Open IndexedDB (reuse same database as pattern cache)
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EmotoPatternCache', 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offline_requests')) {
        const store = db.createObjectStore('offline_requests', { 
          keyPath: 'id' 
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('synced', 'synced');
        store.createIndex('url', 'url');
      }
    };
  });
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_PATTERNS') {
    // Handle pattern caching requests from main thread
    handleCachePatternsMessage(event.data.patterns);
  }
});

async function handleCachePatternsMessage(patterns) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    
    for (const pattern of patterns) {
      const request = new Request(`/api/patterns/${pattern.id}`);
      const response = new Response(JSON.stringify(pattern), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(request, response);
    }
  } catch (error) {
    console.error('Failed to cache patterns from message:', error);
  }
}