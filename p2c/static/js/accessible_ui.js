/**
 * Accessible UI Components
 * Toast notifications, modals, and prompts with full accessibility support
 */

// =============================================================================
// Toast Notification System
// =============================================================================

window.Toast = {
    container: null,

    /**
     * Initialize the toast container
     */
    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notifications');
        this.container.setAttribute('role', 'region');
        document.body.appendChild(this.container);
    },

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Duration in ms (default: 5000)
     */
    show(message, type = 'info', duration = 5000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast-item transform transition-all duration-300 ease-out translate-x-full opacity-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const bgColors = {
            success: 'bg-green-50 border-green-500 text-green-800',
            error: 'bg-red-50 border-red-500 text-red-800',
            warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
            info: 'bg-blue-50 border-blue-500 text-blue-800'
        };

        toast.innerHTML = `
            <div class="${bgColors[type]} border-l-4 p-4 rounded-r-lg shadow-lg flex items-start gap-3">
                <span class="text-xl flex-shrink-0" aria-hidden="true">${icons[type]}</span>
                <p class="flex-1 text-sm font-medium">${this.escapeHtml(message)}</p>
                <button type="button" 
                        class="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
                        aria-label="Dismiss notification">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        // Dismiss button handler
        toast.querySelector('button').addEventListener('click', () => this.dismiss(toast));

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    /**
     * Dismiss a toast
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    },

    /**
     * Convenience methods
     */
    success(message, duration) { return this.show(message, 'success', duration); },
    error(message, duration) { return this.show(message, 'error', duration); },
    warning(message, duration) { return this.show(message, 'warning', duration); },
    info(message, duration) { return this.show(message, 'info', duration); },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};


// =============================================================================
// Accessible Modal System
// =============================================================================

window.Modal = {
    activeModal: null,
    previouslyFocused: null,

    /**
     * Show a confirmation modal
     * @param {Object} options
     * @param {string} options.title - Modal title
     * @param {string} options.message - Modal message
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @param {string} options.type - 'confirm' | 'danger' | 'info'
     * @returns {Promise<boolean>} - Resolves true if confirmed, false if cancelled
     */
    confirm(options = {}) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'confirm'
        } = options;

        return new Promise((resolve) => {
            this.previouslyFocused = document.activeElement;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'modal-title');
            modal.setAttribute('aria-describedby', 'modal-description');

            const confirmBtnClass = type === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';

            modal.innerHTML = `
                <div class="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true"></div>
                <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
                    <div class="p-6">
                        <h3 id="modal-title" class="text-lg font-semibold text-gray-900 mb-2">${this.escapeHtml(title)}</h3>
                        <p id="modal-description" class="text-sm text-gray-600">${this.escapeHtml(message)}</p>
                    </div>
                    <div class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                        <button type="button" 
                                class="modal-cancel px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            ${this.escapeHtml(cancelText)}
                        </button>
                        <button type="button" 
                                class="modal-confirm px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmBtnClass}">
                            ${this.escapeHtml(confirmText)}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.activeModal = modal;

            // Focus the confirm button
            const confirmBtn = modal.querySelector('.modal-confirm');
            const cancelBtn = modal.querySelector('.modal-cancel');
            confirmBtn.focus();

            // Handle keyboard events
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup(false);
                } else if (e.key === 'Tab') {
                    // Trap focus within modal
                    const focusableElements = modal.querySelectorAll('button:not([disabled])');
                    const firstEl = focusableElements[0];
                    const lastEl = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                    } else if (!e.shiftKey && document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            };

            const cleanup = (result) => {
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
                this.activeModal = null;
                if (this.previouslyFocused) {
                    this.previouslyFocused.focus();
                }
                resolve(result);
            };

            document.addEventListener('keydown', handleKeydown);

            // Button handlers
            confirmBtn.addEventListener('click', () => cleanup(true));
            cancelBtn.addEventListener('click', () => cleanup(false));

            // Click outside to cancel
            modal.querySelector('.fixed.inset-0').addEventListener('click', () => cleanup(false));
        });
    },

    /**
     * Show a prompt modal for text input
     * @param {Object} options
     * @param {string} options.title - Modal title
     * @param {string} options.message - Modal message
     * @param {string} options.placeholder - Input placeholder
     * @param {string} options.defaultValue - Default input value
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @returns {Promise<string|null>} - Resolves to input value or null if cancelled
     */
    prompt(options = {}) {
        const {
            title = 'Enter value',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = 'OK',
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            this.previouslyFocused = document.activeElement;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'prompt-title');
            modal.setAttribute('aria-describedby', message ? 'prompt-description' : undefined);

            modal.innerHTML = `
                <div class="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true"></div>
                <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
                    <div class="p-6">
                        <h3 id="prompt-title" class="text-lg font-semibold text-gray-900 mb-2">${this.escapeHtml(title)}</h3>
                        ${message ? `<p id="prompt-description" class="text-sm text-gray-600 mb-4">${this.escapeHtml(message)}</p>` : ''}
                        <input type="text" 
                               id="prompt-input"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                               placeholder="${this.escapeHtml(placeholder)}"
                               value="${this.escapeHtml(defaultValue)}"
                               aria-label="${this.escapeHtml(title)}">
                    </div>
                    <div class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                        <button type="button" 
                                class="modal-cancel px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            ${this.escapeHtml(cancelText)}
                        </button>
                        <button type="button" 
                                class="modal-confirm px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            ${this.escapeHtml(confirmText)}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.activeModal = modal;

            const input = modal.querySelector('#prompt-input');
            const confirmBtn = modal.querySelector('.modal-confirm');
            const cancelBtn = modal.querySelector('.modal-cancel');

            // Focus and select input
            input.focus();
            input.select();

            // Handle keyboard events
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup(null);
                } else if (e.key === 'Enter' && document.activeElement === input) {
                    cleanup(input.value);
                } else if (e.key === 'Tab') {
                    // Trap focus within modal
                    const focusableElements = modal.querySelectorAll('input:not([disabled]), button:not([disabled])');
                    const firstEl = focusableElements[0];
                    const lastEl = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                    } else if (!e.shiftKey && document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            };

            const cleanup = (result) => {
                modal.remove();
                document.removeEventListener('keydown', handleKeydown);
                this.activeModal = null;
                if (this.previouslyFocused) {
                    this.previouslyFocused.focus();
                }
                resolve(result);
            };

            document.addEventListener('keydown', handleKeydown);

            // Button handlers
            confirmBtn.addEventListener('click', () => cleanup(input.value));
            cancelBtn.addEventListener('click', () => cleanup(null));

            // Click outside to cancel
            modal.querySelector('.fixed.inset-0').addEventListener('click', () => cleanup(null));
        });
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};


// =============================================================================
// Status Announcer for Screen Readers
// =============================================================================

window.StatusAnnouncer = {
    container: null,

    /**
     * Initialize the live region
     */
    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'status-announcer';
        this.container.className = 'sr-only';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        this.container.setAttribute('role', 'status');
        document.body.appendChild(this.container);
    },

    /**
     * Announce a message to screen readers
     * @param {string} message - The message to announce
     * @param {string} priority - 'polite' | 'assertive'
     */
    announce(message, priority = 'polite') {
        this.init();

        this.container.setAttribute('aria-live', priority);

        // Clear and re-set to trigger announcement
        this.container.textContent = '';
        requestAnimationFrame(() => {
            this.container.textContent = message;
        });
    },

    /**
     * Convenience methods
     */
    polite(message) { this.announce(message, 'polite'); },
    assertive(message) { this.announce(message, 'assertive'); }
};


// =============================================================================
// Backwards compatibility - Replace alert and prompt
// =============================================================================

// Store original functions
window._originalAlert = window.alert;
window._originalPrompt = window.prompt;

/**
 * Accessible alert replacement
 * Shows a toast notification instead of the browser alert
 */
window.accessibleAlert = function (message, type = 'info') {
    Toast.show(message, type);
};

/**
 * Accessible prompt replacement
 * Shows a modal dialog instead of the browser prompt
 */
window.accessiblePrompt = async function (message, defaultValue = '') {
    return await Modal.prompt({
        title: 'Input Required',
        message: message,
        defaultValue: defaultValue
    });
};
