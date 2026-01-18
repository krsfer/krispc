/**
 * Audio Recorder for Voice Ingestion
 * Handles recording audio from the browser and uploading to the API.
 */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        
        // DOM Elements (assigned during init)
        this.recordButton = null;
        this.statusIndicator = null;
        this.audioPreview = null;
    }

    init(config) {
        this.recordButton = document.getElementById(config.recordButtonId);
        this.statusIndicator = document.getElementById(config.statusId);
        this.uploadUrl = config.uploadUrl;
        this.csrfToken = config.csrfToken;

        if (this.recordButton) {
            this.recordButton.addEventListener('click', () => this.toggleRecording());
        }
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stop();
        } else {
            await this.start();
        }
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                this.handleStop();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateUI('recording');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    stop() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
        }
    }

    async handleStop() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.updateUI('processing');
        await this.upload(audioBlob);
    }

    async upload(blob) {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                this.updateUI('success', data.content);
                // Redirect to dashboard after success
                setTimeout(() => {
                    window.location.href = '/dashboard/';
                }, 2000);
            } else {
                const error = await response.json();
                this.updateUI('error', error.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            this.updateUI('error', 'Network error during upload');
        }
    }

    updateUI(state, message = '') {
        if (!this.recordButton || !this.statusIndicator) return;

        switch (state) {
            case 'recording':
                this.recordButton.classList.replace('btn-outline-danger', 'btn-danger');
                this.recordButton.innerHTML = '⏹️ Stop Recording';
                this.statusIndicator.innerHTML = '<span class="badge bg-danger pulse">🔴 Recording...</span>';
                break;
            case 'processing':
                this.recordButton.disabled = true;
                this.recordButton.innerHTML = '⌛ Processing...';
                this.statusIndicator.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div> Transcribing...';
                break;
            case 'success':
                this.statusIndicator.innerHTML = `<span class="badge bg-success">✅ Transcribed: "${message.substring(0, 30)}..."</span>`;
                break;
            case 'error':
                this.recordButton.disabled = false;
                this.recordButton.classList.replace('btn-danger', 'btn-outline-danger');
                this.recordButton.innerHTML = '🎙️ Try Again';
                this.statusIndicator.innerHTML = `<span class="badge bg-warning text-dark">⚠️ ${message}</span>`;
                break;
            default:
                this.recordButton.classList.replace('btn-danger', 'btn-outline-danger');
                this.recordButton.innerHTML = '🎙️ Start Voice Note';
                this.statusIndicator.innerHTML = '';
        }
    }
}

// Global instance
const voiceRecorder = new AudioRecorder();
