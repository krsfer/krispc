console.log('Calendar progress script loaded');

if (typeof CeleryProgressBar === 'undefined') {
    class CeleryProgressBar {
        static initProgressBar(progressUrl, options) {
            // Existing CeleryProgressBar implementation
        }
    }
}

// Ensure the class is defined in the global scope
window.CalendarProgress = class CalendarProgress {
    constructor(taskId, taskType) {
        this.taskId = taskId;
        this.taskType = taskType;
        this.progressUrl = `/importpdf/celery-progress/task_status/${taskId}/`;
        this.progressContainer = document.getElementById('progress-container');
        this.progressBar = document.getElementById('progress-bar');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressMessage = document.getElementById('progress-message');
        this.progressLabel = document.getElementById('progress-label');

        console.log(`CalendarProgress initialized for task ${taskId} (${taskType})`);

        // Reset progress elements
        if (this.progressContainer) {
            this.progressContainer.classList.remove('hidden');
        }
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.style.backgroundColor = '#6366F1'; // Reset to default indigo color
        }
        if (this.progressPercentage) {
            this.progressPercentage.textContent = '0%';
        }
        if (this.progressMessage) {
            this.progressMessage.textContent = '';
        }

        // Disable form buttons during operation
        this.disableButtons(true);

        // Start progress tracking immediately
        this.start();
    }

    disableButtons(disabled) {
        const buttons = document.querySelectorAll('button[type="submit"]');
        buttons.forEach(button => {
            button.disabled = disabled;
        });
    }

    updateProgress(progress) {
        console.log('Updating progress:', progress);

        if (this.progressBar) {
            // Ensure we have a valid percent value
            const percent = progress.percent || 0;
            this.progressBar.style.width = `${percent}%`;
            this.progressBar.setAttribute('aria-valuenow', percent);
        }

        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${progress.percent || 0}%`;
        }

        if (this.progressMessage) {
            // Handle both string and object progress formats
            const description = typeof progress === 'object' ?
                (progress.description || progress.message || '') :
                progress.toString();
            this.progressMessage.textContent = description;
        }
    }

    start() {
        const pollInterval = 500; // Poll every 500ms
        const maxPendingTime = 60000; // 60 seconds timeout for PENDING state
        const startTime = Date.now();
        let lastState = null;
        let stateChangeTime = Date.now();

        console.log(`Starting to poll progress at ${this.progressUrl}`);

        const pollProgress = () => {
            fetch(this.progressUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Progress data received:', data);

                    // Track state changes to detect stuck tasks
                    const currentState = data.progress?.description || 'unknown';
                    if (currentState !== lastState) {
                        lastState = currentState;
                        stateChangeTime = Date.now();
                    }

                    // Check if task is stuck in PENDING for too long
                    const isPending = currentState.toLowerCase().includes('pending');
                    const timeSinceStateChange = Date.now() - stateChangeTime;

                    if (isPending && timeSinceStateChange > maxPendingTime) {
                        console.error('Task stuck in PENDING state for too long');
                        this.onError('Task queue is not responding. The Celery worker may not be running. Please try again later.');
                        return;
                    }

                    if (data.progress) {
                        this.updateProgress(data.progress);
                    }

                    if (data.complete === true) {
                        if (data.success === true) {
                            console.log('Task completed successfully:', data.result);
                            this.onSuccess(data.result);
                        } else {
                            console.error('Task failed:', data.error);
                            this.onError(data.error || 'Task failed');
                        }
                    } else {
                        setTimeout(pollProgress, pollInterval);
                    }
                })
                .catch(error => {
                    console.error('Error polling progress:', error);
                    this.progressMessage.textContent = `Error: ${error.message}`;
                    // Continue polling despite errors
                    setTimeout(pollProgress, pollInterval);
                });
        };

        // Start polling
        pollProgress();
    }

    onSuccess(result) {
        console.log('Task succeeded with result:', result);

        if (this.progressBar) {
            this.progressBar.style.backgroundColor = '#10B981'; // Change to success color
        }

        if (this.progressMessage) {
            const message = typeof result === 'object' ?
                (result.message || JSON.stringify(result)) :
                result.toString();
            this.progressMessage.textContent = message;
        }

        // Reset progress after a delay
        setTimeout(() => {
            if (this.progressBar) {
                this.progressBar.style.width = '0%';
            }
            if (this.progressPercentage) {
                this.progressPercentage.textContent = '0%';
            }
            if (this.progressMessage) {
                this.progressMessage.textContent = '';
            }
            this.disableButtons(false);

            // Hide progress container if it exists
            if (this.progressContainer) {
                this.progressContainer.classList.add('hidden');
            }
        }, 5000); // Wait longer (5s) so user can see completion message
    }

    onError(error) {
        console.error('Task error:', error);

        if (this.progressBar) {
            this.progressBar.style.backgroundColor = '#EF4444'; // Change to error color
        }

        if (this.progressMessage) {
            this.progressMessage.textContent = `Error: ${error}`;
        }

        // Reset progress after a delay
        setTimeout(() => {
            if (this.progressBar) {
                this.progressBar.style.width = '0%';
                this.progressBar.style.backgroundColor = '#6366F1'; // Reset to default indigo color
            }
            if (this.progressPercentage) {
                this.progressPercentage.textContent = '0%';
            }
            if (this.progressMessage) {
                this.progressMessage.textContent = '';
            }
            this.disableButtons(false);
        }, 3000);
    }
};

// Keep the handleCalendarOperation function in calendar_progress.js
window.handleCalendarOperation = function (operationType, event) {
    event.preventDefault();
    console.log(`Calendar operation requested: ${operationType}`);

    const calendarSelect = document.getElementById('calendar-select');
    if (!calendarSelect.value) {
        alert('Please select a calendar first');
        return;
    }

    const form = document.getElementById(`${operationType}-form`);
    if (!form) {
        console.error(`Form not found: ${operationType}-form`);
        return;
    }

    // Don't proceed if the form action is '#' (no document_id available)
    if (form.action === '#' || form.action.endsWith('#')) {
        alert('Please upload a PDF first');
        return;
    }

    console.log(`Submitting form to: ${form.action}`);

    // Update the calendar ID in the form
    const calendarIdInput = document.getElementById(`${operationType}-calendar-id`);
    if (calendarIdInput) {
        calendarIdInput.value = calendarSelect.value;
        console.log(`Calendar ID set to: ${calendarIdInput.value}`);
    }

    // Submit the form
    fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Operation response:', data);
            if (data.task_id) {
                console.log(`Creating progress tracker for task: ${data.task_id}`);
                // Create new instance of CalendarProgress
                new window.CalendarProgress(data.task_id, operationType);
            } else {
                console.error('No task_id in response:', data);
                alert('No task ID received from server. Operation may have failed.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(`An error occurred while processing your request: ${error.message}`);
        });
};

window.updateCalendarIds = function (calendarId) {
    ['create', 'flush'].forEach(operation => {
        const input = document.getElementById(`${operation}-calendar-id`);
        if (input) {
            input.value = calendarId;
        }
    });
};

window.fetchCalendars = function () {
    if (window.fetchCalendars.isLoading) return;
    window.fetchCalendars.isLoading = true;

    const calendarSelect = document.getElementById('calendar-select');
    if (!calendarSelect) {
        window.fetchCalendars.isLoading = false;
        return;
    }

    const fetchUrl = calendarSelect.dataset.fetchUrl || '/get-calendars/';

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (!calendarSelect) return;
            calendarSelect.innerHTML = '';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a calendar...';
            calendarSelect.appendChild(defaultOption);

            const addOption = document.createElement('option');
            addOption.value = 'ADD_NEW';
            addOption.textContent = '+ Add new calendar...';
            calendarSelect.appendChild(addOption);

            if (!data.calendars || !Array.isArray(data.calendars)) {
                throw new Error('Invalid calendar data received');
            }

            let foundSavedCalendar = false;

            data.calendars
                .forEach(calendar => {
                    const option = document.createElement('option');
                    option.value = calendar.id;

                    // Identify primary calendar using the boolean property
                    if (calendar.primary) {
                        option.textContent = `${calendar.summary} (Primary)`;
                    } else {
                        option.textContent = calendar.summary;
                    }

                    // Select saved calendar or "Test Calendar"
                    if (data.last_calendar_id === calendar.id) {
                        option.selected = true;
                        updateCalendarIds(calendar.id);
                        foundSavedCalendar = true;
                    } else if (!foundSavedCalendar && !calendar.primary && calendar.summary === 'Test Calendar') {
                        option.selected = true;
                        updateCalendarIds(calendar.id);
                    }

                    calendarSelect.appendChild(option);
                });
        })
        .catch(error => {
            console.error('Error fetching calendars:', error);
            if (calendarSelect) {
                calendarSelect.innerHTML = '<option value="">Error loading calendars</option>';
            }
        })
        .finally(() => {
            window.fetchCalendars.isLoading = false;
        });
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (typeof updateAppointmentColors === 'function') updateAppointmentColors();
    if (typeof updateShowAllButton === 'function') updateShowAllButton();
    if (typeof initializeEventFilters === 'function') initializeEventFilters();
    if (typeof updateTotalDuration === 'function') updateTotalDuration();

    // Only fetch calendars if we have the select element
    const calendarSelect = document.getElementById('calendar-select');
    if (calendarSelect) {
        calendarSelect.addEventListener('change', function (event) {
            const calendarId = event.target.value;

            if (calendarId === 'ADD_NEW') {
                const newName = prompt('Enter the name for the new calendar:');
                if (!newName) {
                    // Reset to empty selection if user cancelled
                    calendarSelect.value = '';
                    return;
                }

                // Temporary loading state
                calendarSelect.disabled = true;

                // We'll use the sync_pdf_to_calendar logic's creation part or similar
                // Actually, let's just use a dedicated creation if it existed, but we can reuse create_events with a dummy document or add a new endpoint.
                // For now, I'll assume we want a simple calendar creation.
                // The sync logic in json_views.py creates a calendar if it doesn't exist.

                // Let's create it via a small fetch if we have an endpoint, or just suggest the name.
                // The user's request was "Allow to create a calendas".

                // I will add a new endpoint or use an existing one to just create a calendar.
                // For simplicity here, I'll alert the user we're creating it and use a new name.

                // Actually, better approach: add a hidden input for custom name if ADD_NEW is selected.
                // But prompt is faster for a quick fix.

                // Let's implement a quick 'create-calendar' endpoint in views.py
                const createUrl = calendarSelect.dataset.createUrl || '/create-calendar/';
                fetch(createUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({ name: newName })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.id) {
                            // Refresh the list and select the new one
                            window.fetchCalendars.isLoading = false; // reset flag
                            fetchCalendars();
                            // We'll need to wait for refresh to select it, or just add it manually now
                            const newOption = document.createElement('option');
                            newOption.value = data.id;
                            newOption.textContent = newName;
                            newOption.selected = true;
                            calendarSelect.appendChild(newOption);
                            updateCalendarIds(data.id);
                        } else {
                            alert('Error creating calendar: ' + (data.error || 'Unknown error'));
                            calendarSelect.value = '';
                        }
                    })
                    .catch(error => {
                        alert('Error creating calendar: ' + error.message);
                        calendarSelect.value = '';
                    })
                    .finally(() => {
                        calendarSelect.disabled = false;
                    });
                return;
            }

            // Update form inputs
            updateCalendarIds(calendarId);

            // Save the selection
            const saveUrl = calendarSelect.dataset.saveUrl || '/save-selected-calendar/';
            fetch(saveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    calendar_id: calendarId
                })
            })
                .catch(error => console.error('Error saving calendar selection:', error));
        });

        fetchCalendars();
    }
});
