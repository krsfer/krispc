import React from 'react';

interface VoiceCommandOverlayProps {
  isListening: boolean;
  transcript: string;
  feedback: string;
  onToggle: () => void;
}

const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({
  isListening,
  transcript,
  feedback,
  onToggle
}) => {
  if (!isListening && !feedback) return null;

  return (
    <div className="voice-overlay">
      <div className="voice-content">
        <button 
          className={`mic-button ${isListening ? 'listening' : ''}`}
          onClick={onToggle}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? '🎙️' : '🛑'}
        </button>
        <div className="voice-text">
          {isListening && <div className="status">Listening...</div>}
          {transcript && <div className="transcript">"{transcript}"</div>}
          {feedback && <div className="feedback">{feedback}</div>}
        </div>
      </div>

      <style jsx>{`
        .voice-overlay {
          position: fixed;
          bottom: 120px; /* Above the bottom toolbar */
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          pointer-events: none; /* Let clicks pass through except for button */
        }

        .voice-content {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          padding: 12px 24px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          pointer-events: auto;
          min-width: 200px;
          justify-content: center;
        }

        .mic-button {
          background: ${isListening ? '#ff4757' : '#2ed573'};
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mic-button.listening {
          animation: pulse 1.5s infinite;
        }

        .voice-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .status {
          font-size: 12px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .transcript {
          font-size: 14px;
          font-weight: 500;
        }

        .feedback {
          font-size: 14px;
          color: #2ed573;
          font-weight: 600;
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }
      `}</style>
    </div>
  );
};

export default VoiceCommandOverlay;
