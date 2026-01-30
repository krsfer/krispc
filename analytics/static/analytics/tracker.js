(function () {
    let visitId = null;
    let metrics = {};
    let interactions = [];
    const API_BASE = '/analytics/api/track';

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const csrftoken = getCookie('csrftoken');

    function sendRequest(endpoint, data, keepalive = false) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (csrftoken) {
            headers['X-CSRFToken'] = csrftoken;
        }

        if (keepalive && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            // navigator.sendBeacon does not support custom headers like CSRF easily without Blob
            // But Django requires CSRF. 
            // If we use fetch with keepalive: true, it works in modern browsers.
            fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data),
                keepalive: true
            }).catch(e => console.error(e));
        } else {
            fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            }).catch(e => console.error(e));
        }
    }

    function init() {
        // Gather static info
        const data = {
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer,
            browser: getBrowser(),
            os: getOS(),
            device_type: getDeviceType(),
            network_type: getNetworkType()
        };

        fetch(`${API_BASE}/init/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify(data)
        })
            .then(res => res.json())
            .then(res => {
                visitId = res.visit_id;
                startTracking();
            })
            .catch(err => console.error('Analytics init failed', err));
    }

    function startTracking() {
        trackPerformance();
        trackScroll();
        trackRageClicks();

        // Clear any existing interval to prevent duplicates (e.g. HTMX re-execution)
        if (window.analyticsInterval) {
            clearInterval(window.analyticsInterval);
        }

        // Send updates every 10 seconds
        window.analyticsInterval = setInterval(sendUpdate, 10000);

        // Send on page hide/unload
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                sendUpdate(true);
            }
        });
    }

    function sendUpdate(isUnload = false) {
        if (!visitId) return;

        // Calculate time on page
        const timeOnPage = (performance.now()) / 1000;

        const data = {
            ...metrics,
            scroll_depth: maxScrollDepth,
            time_on_page: timeOnPage
        };

        sendRequest(`${API_BASE}/update/${visitId}/`, data, isUnload);
    }

    // --- Helpers ---

    function getBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari")) return "Safari";
        if (ua.includes("Edge")) return "Edge";
        return "Unknown";
    }

    function getOS() {
        const ua = navigator.userAgent;
        if (ua.includes("Win")) return "Windows";
        if (ua.includes("Mac")) return "MacOS";
        if (ua.includes("Linux")) return "Linux";
        if (ua.includes("Android")) return "Android";
        if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
        return "Unknown";
    }

    function getDeviceType() {
        if (/Mobi|Android/i.test(navigator.userAgent)) return "Mobile";
        return "Desktop";
    }

    function getNetworkType() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return conn ? conn.effectiveType : 'unknown';
    }

    // --- Performance Tracking ---

    function trackPerformance() {
        // TTFB
        if (performance.getEntriesByType) {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
                metrics.ttfb = nav.responseStart - nav.requestStart;
                metrics.fcp = nav.domContentLoadedEventStart; // Approximate FCP if not available
            }
        }

        // Web Vitals (LCP, CLS, INP) - simplified observation
        // Note: For production accuracy, use 'web-vitals' library. 
        // Here we implement basic observers.

        try {
            // LCP
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                metrics.lcp = lastEntry.startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // CLS
            let clsValue = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        metrics.cls = clsValue;
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });

            // INP (Approximated by First Input Delay as INP is complex to polyfill)
            new PerformanceObserver((entryList) => {
                const firstInput = entryList.getEntries()[0];
                metrics.inp = firstInput.processingStart - firstInput.startTime;
            }).observe({ type: 'first-input', buffered: true });

        } catch (e) {
            // Observers not supported
        }
    }

    // --- Scroll Tracking ---

    let maxScrollDepth = 0;
    function trackScroll() {
        window.addEventListener('scroll', () => {
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollTop = document.documentElement.scrollTop;
            const percentage = (scrollTop / docHeight) * 100;
            if (percentage > maxScrollDepth) {
                maxScrollDepth = percentage;
            }
        });
    }

    // --- Rage Click Tracking ---

    let clickLog = [];
    function trackRageClicks() {
        document.addEventListener('click', (e) => {
            const now = Date.now();
            // Filter clicks older than 1s
            clickLog = clickLog.filter(t => now - t.time < 1000);

            // Add current click
            clickLog.push({ time: now, target: e.target });

            // Check for rage clicks (3+ clicks on same element)
            const clicksOnTarget = clickLog.filter(c => c.target === e.target).length;

            if (clicksOnTarget === 3) {
                // Detected Rage Click
                reportInteraction('rage_click', e.target);
                // Clear log for this target to avoid duplicate reports
                clickLog = clickLog.filter(c => c.target !== e.target);
            }
        });
    }

    function reportInteraction(type, target) {
        if (!visitId) return;

        const selector = getSelector(target);

        const data = {
            type: type,
            selector: selector
        };

        sendRequest(`${API_BASE}/interaction/${visitId}/`, data);
    }

    function getSelector(el) {
        if (el.id) return '#' + el.id;
        if (el.className) return '.' + el.className.split(' ').join('.');
        return el.tagName.toLowerCase();
    }

    // Init on load
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
