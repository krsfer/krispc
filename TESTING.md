# Testing Checklist - KrisPC UI Modernization

## Pre-Deployment Testing Guide

This checklist ensures the modernized KrisPC website is fully tested before production deployment.

---

## 1. Visual & Functional Testing

### 1.1 Desktop Testing (Required)

**Test on these browsers:**
- [ ] **Chrome/Chromium** (latest)
  - [ ] Navigation menu works
  - [ ] All sections render correctly
  - [ ] Service cards display properly
  - [ ] Service modal opens/closes
  - [ ] Contact form validation works
  - [ ] Dark mode toggle (if implemented)

- [ ] **Firefox** (latest)
  - [ ] All Chrome tests above
  - [ ] Glassmorphism effects render correctly

- [ ] **Safari** (latest - macOS)
  - [ ] All Chrome tests above
  - [ ] Backdrop blur effects work

- [ ] **Edge** (latest)
  - [ ] All Chrome tests above

### 1.2 Mobile Testing (Required)

**Test on these devices/viewports:**
- [ ] **iOS Safari** (iPhone)
  - [ ] Mobile menu hamburger works
  - [ ] Touch interactions smooth
  - [ ] No horizontal scroll
  - [ ] Forms keyboard-friendly

- [ ] **Android Chrome** (latest)
  - [ ] All iOS tests above

- [ ] **Responsive breakpoints:**
  - [ ] 640px (mobile)
  - [ ] 768px (tablet)
  - [ ] 1024px (laptop)
  - [ ] 1280px (desktop)

### 1.3 Component Testing

- [ ] **HeroSection**
  - [ ] Animated background shapes visible
  - [ ] Gradient text displays correctly
  - [ ] CTA buttons hover states work
  - [ ] Responsive on all screen sizes

- [ ] **AboutSection**
  - [ ] Stats grid renders correctly
  - [ ] Feature icons display (Heroicons)
  - [ ] Responsive grid on mobile

- [ ] **ServicesSection**
  - [ ] All 6 service cards render
  - [ ] Card hover effects work
  - [ ] Icons display correctly
  - [ ] Grid responsive on mobile

- [ ] **ServiceModal**
  - [ ] Opens when clicking service card
  - [ ] Close button works
  - [ ] ESC key closes modal
  - [ ] Click outside closes modal
  - [ ] Body scroll locked when open
  - [ ] Icon renders correctly

- [ ] **TeamSection**
  - [ ] All team members display
  - [ ] Icons render correctly
  - [ ] Social links visible
  - [ ] Grid responsive on mobile

- [ ] **ContactForm**
  - [ ] Form validation works
  - [ ] Required fields enforced
  - [ ] Email validation works
  - [ ] Submit button disabled while loading
  - [ ] Success message displays
  - [ ] Error messages display
  - [ ] CSRF token included

- [ ] **AppNavigation**
  - [ ] Fixed to top on scroll
  - [ ] Desktop menu links work
  - [ ] Mobile menu toggle works
  - [ ] Smooth scroll to sections
  - [ ] Logo clickable

- [ ] **AppFooter**
  - [ ] All links work
  - [ ] Current year displays
  - [ ] Responsive layout

---

## 2. Performance Testing

### 2.1 Lighthouse Audit (Chrome DevTools)

**Run Lighthouse in Incognito mode:**
- [ ] **Performance:** ≥ 90 (target)
- [ ] **Accessibility:** ≥ 90 (target: 100)
- [ ] **Best Practices:** ≥ 90 (target: 100)
- [ ] **SEO:** ≥ 90 (target: 100)

**Core Web Vitals:**
- [ ] **LCP** (Largest Contentful Paint): < 2.5s
- [ ] **FID** (First Input Delay): < 100ms
- [ ] **CLS** (Cumulative Layout Shift): < 0.1

### 2.2 Network Performance

**Test on throttled connections:**
- [ ] **Slow 3G**
  - [ ] Page loads within 10 seconds
  - [ ] Images lazy load
  - [ ] No broken resources

- [ ] **Fast 3G**
  - [ ] Page loads within 5 seconds

- [ ] **4G**
  - [ ] Page loads within 2 seconds

### 2.3 Bundle Size Verification

**Check build output:**
```bash
npm run build
```

**Verify bundle sizes:**
- [ ] Main JS (gzipped): ≤ 40 KB
- [ ] Main CSS (gzipped): ≤ 10 KB
- [ ] Lazy chunks load on demand
- [ ] No duplicate dependencies

---

## 3. Accessibility Testing

### 3.1 Keyboard Navigation

- [ ] **Tab navigation**
  - [ ] All interactive elements reachable
  - [ ] Focus visible on all elements
  - [ ] Tab order logical
  - [ ] Skip link works (Tab on page load)

- [ ] **Keyboard shortcuts**
  - [ ] ESC closes modals
  - [ ] Enter activates buttons/links
  - [ ] Space toggles checkboxes

### 3.2 Screen Reader Testing

**Test with NVDA (Windows) or VoiceOver (macOS):**
- [ ] Page landmarks announced
- [ ] Headings hierarchy correct
- [ ] Form labels associated
- [ ] ARIA labels present
- [ ] Image alt text meaningful
- [ ] Link text descriptive

### 3.3 Color Contrast

- [ ] **WCAG AA compliance** (4.5:1 for normal text)
  - [ ] Primary text on white
  - [ ] Primary text on dark
  - [ ] Links distinguishable
  - [ ] Button text readable

### 3.4 Automated Tools

- [ ] **WAVE** (browser extension)
  - [ ] No errors
  - [ ] Review warnings

- [ ] **axe DevTools** (browser extension)
  - [ ] No critical issues
  - [ ] Review moderate issues

---

## 4. Code Splitting & Lazy Loading

### 4.1 Verify Code Splitting

**Check Network tab in DevTools:**
- [ ] Main bundle loads immediately
- [ ] ServiceModal chunk loads when opening modal
- [ ] TeamSection chunk loads when scrolling
- [ ] ContactForm chunk loads when scrolling

### 4.2 Verify Lazy Loading Behavior

- [ ] **Modal lazy load**
  - [ ] Modal chunk NOT in initial load
  - [ ] Modal chunk loads on first service card click
  - [ ] No delay in modal opening

- [ ] **Below-fold sections**
  - [ ] TeamSection chunk loads before visible
  - [ ] ContactForm chunk loads before visible
  - [ ] No layout shift when loading

---

## 5. Cross-Browser Compatibility

### 5.1 Modern Browser Features

- [ ] **CSS Features**
  - [ ] CSS Grid works everywhere
  - [ ] Flexbox works everywhere
  - [ ] Custom properties (CSS variables) work
  - [ ] Backdrop filter works (or graceful fallback)

- [ ] **JavaScript Features**
  - [ ] ES6+ features work
  - [ ] Async/await works
  - [ ] Dynamic imports work

### 5.2 Fallbacks

- [ ] **No JavaScript**
  - [ ] Content still visible
  - [ ] Navigation usable
  - [ ] Forms submittable

- [ ] **No CSS**
  - [ ] Content readable
  - [ ] Links clickable

---

## 6. Security Testing

### 6.1 Form Security

- [ ] **CSRF Protection**
  - [ ] CSRF token in forms
  - [ ] CSRF token in HTMX requests
  - [ ] Token refreshed on page load

- [ ] **Input Validation**
  - [ ] Email format validated
  - [ ] Required fields enforced
  - [ ] XSS protection (no inline scripts)

### 6.2 Content Security

- [ ] **HTTPS** (production only)
  - [ ] All resources loaded over HTTPS
  - [ ] No mixed content warnings

- [ ] **Headers** (production only)
  - [ ] X-Content-Type-Options set
  - [ ] X-Frame-Options set
  - [ ] Referrer-Policy set

---

## 7. SEO Testing

### 7.1 Meta Tags

- [ ] **Page metadata**
  - [ ] Title tag present and descriptive
  - [ ] Meta description present
  - [ ] Meta keywords present (optional)
  - [ ] Canonical URL set (if needed)

- [ ] **Open Graph tags** (optional)
  - [ ] og:title
  - [ ] og:description
  - [ ] og:image

### 7.2 Structured Data

- [ ] **Schema.org markup** (if applicable)
  - [ ] LocalBusiness schema
  - [ ] ContactPoint schema

### 7.3 Sitemap & Robots

- [ ] **robots.txt** exists
- [ ] **sitemap.xml** exists (if multi-page)

---

## 8. Django Integration Testing

### 8.1 Template Rendering

- [ ] **Vite assets load**
  - [ ] In development (HMR works)
  - [ ] In production (manifest resolves)
  - [ ] CSS loads correctly
  - [ ] JS loads correctly

- [ ] **Django template tags**
  - [ ] `{% vite_hmr_client %}` works in dev
  - [ ] `{% vite_asset 'main.js' %}` works
  - [ ] Static files serve correctly

### 8.2 Form Handling

- [ ] **Contact form submission**
  - [ ] POST to `/create/` works
  - [ ] CSRF validation passes
  - [ ] Success response handled
  - [ ] Error response handled
  - [ ] Database entry created (if applicable)

---

## 9. Error Handling

### 9.1 Client-Side Errors

- [ ] **Network errors**
  - [ ] Form shows error on network failure
  - [ ] Retry mechanism (if applicable)
  - [ ] User-friendly error messages

- [ ] **Resource loading errors**
  - [ ] Graceful degradation if chunk fails
  - [ ] Fallback content shown

### 9.2 Server-Side Errors

- [ ] **404 errors**
  - [ ] Custom 404 page (if created)
  - [ ] Helpful navigation back

- [ ] **500 errors**
  - [ ] Custom 500 page (if created)
  - [ ] Error logged server-side

---

## 10. Production Readiness

### 10.1 Build Verification

```bash
# Clean build
rm -rf krispc/static/dist node_modules
npm install
npm run build

# Verify build output
ls -lh krispc/static/dist/assets/

# Collect static files
python manage.py collectstatic --noinput

# Run deployment checks
python manage.py check --deploy
```

- [ ] Build completes without errors
- [ ] No warnings in build output
- [ ] Static files collected successfully
- [ ] Django deployment checks pass (or known issues documented)

### 10.2 Environment Variables

- [ ] **Production settings**
  - [ ] `DEBUG = False`
  - [ ] `ALLOWED_HOSTS` configured
  - [ ] `SECRET_KEY` secure and secret
  - [ ] Database configured
  - [ ] Static files path set

- [ ] **Vite settings**
  - [ ] `DJANGO_VITE['dev_mode'] = not DEBUG`
  - [ ] Manifest path correct

---

## 11. Final Pre-Deploy Checklist

- [ ] All above tests passed
- [ ] Known issues documented
- [ ] Deployment plan reviewed
- [ ] Rollback plan ready
- [ ] Backup created
- [ ] Team notified
- [ ] Monitoring ready

---

## Testing Tools & Resources

**Browser DevTools:**
- Chrome DevTools (Lighthouse, Network, Console)
- Firefox Developer Tools
- Safari Web Inspector

**Extensions:**
- WAVE (Accessibility)
- axe DevTools (Accessibility)
- Lighthouse (Performance)

**Online Tools:**
- PageSpeed Insights: https://pagespeed.web.dev/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- GTmetrix: https://gtmetrix.com/

**Screen Readers:**
- NVDA (Windows): https://www.nvaccess.org/
- VoiceOver (macOS): Built-in
- JAWS (Windows): https://www.freedomscientific.com/

---

## Notes

- Mark items as complete with `[x]` once tested
- Document any issues found in a separate ISSUES.md file
- Re-test after fixing any critical issues
- Prioritize mobile and accessibility testing
- Test on real devices when possible (not just emulators)

---

**Last Updated:** 2025-12-25
**Version:** 1.0 (Post-Modernization)
