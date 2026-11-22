import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Sparkles, AudioWaveform, RotateCcw, FastForward } from 'lucide-react';
import { AvatarState } from '../types';

interface VoiceMicControlsProps {
  onSendMessage: (text: string) => void;
  avatarState: AvatarState;
  onMicStateChange: (listening: boolean) => void;
  onSkipTour?: () => void;
  isTouring?: boolean;
  disabled?: boolean;
  activeLanguage?: string;
}

export const VoiceMicControls: React.FC<VoiceMicControlsProps> = ({
  onSendMessage,
  avatarState,
  onMicStateChange,
  onSkipTour,
  isTouring,
  disabled,
  activeLanguage = 'en-US',
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition browser API support
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setMicSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = activeLanguage || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onMicStateChange(true);
        setSpeechTranscript('Listening to your voice...');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = final || interim;
        setSpeechTranscript(currentText);

        if (final) {
          setInputText(final);
          setTimeout(() => {
            onSendMessage(final);
            setSpeechTranscript('');
            setIsListening(false);
            onMicStateChange(false);
          }, 400);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        onMicStateChange(false);
        setSpeechTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        onMicStateChange(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition init failed:', e);
      setMicSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [onSendMessage, onMicStateChange]);

  const toggleListening = () => {
    if (disabled) return;
    if (!micSupported) {
      alert('Voice input is not supported on this browser. Please type your query in the input box below.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      setIsListening(false);
      onMicStateChange(false);
    } else {
      try {
        setSpeechTranscript('Listening...');
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled || avatarState === 'thinking') return;
    onSendMessage(inputText.trim());
    setInputText('');
    setSpeechTranscript('');
  };

  const suggestionChips = [
    'Help me write or debug code',
    'Troubleshoot an IT or Windows issue',
    'Help me draft a professional email',
    'Explain how modern AI models work',
    'What projects and skills does M R S have?',
    'How can I book a call or contact M R S?',
  ];

  return (
    <div id="voice-mic-controls-section" className="w-full space-y-3">
      {/* Central Interactive Voice Bar */}
      <div className="relative p-3 rounded-2xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          {/* Microphone Trigger */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              id="voice-record-btn"
              onClick={toggleListening}
              disabled={disabled || avatarState === 'thinking'}
              title={isListening ? 'Stop Listening' : 'Click to Speak (Microphone)'}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200 cursor-pointer ${
                isListening
                  ? 'bg-[var(--gold)] text-[var(--gold-ink)]'
                  : 'bg-[var(--bg)] text-[var(--gold)] ring-1 ring-[var(--border)] hover:bg-[var(--panel-raised)]'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              id="user-question-input"
              type="text"
              value={isListening ? speechTranscript || 'Listening to your voice...' : inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Camellia anything (code, IT help, email draft, science, M R S portfolio)..."
              disabled={disabled || isListening}
              className={`w-full px-3.5 py-2 rounded-xl bg-[var(--bg)] ring-1 text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none transition-colors duration-200 ${
                isListening
                  ? 'ring-[var(--gold)] text-[var(--gold)]'
                  : 'ring-[var(--border)] focus:ring-2 focus:ring-[var(--gold)]'
              }`}
            />
            {inputText && !isListening && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            id="send-question-btn"
            disabled={!inputText.trim() || disabled || avatarState === 'thinking'}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] font-mono font-semibold text-xs tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
          >
            <span className="hidden sm:inline">Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>

          {/* Skip Tour Button (Visible during tour or speaking) */}
          {isTouring && onSkipTour && (
            <button
              type="button"
              id="skip-tour-btn"
              onClick={onSkipTour}
              title="Skip Tour & Stop Audio"
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--gold-tint)] hover:opacity-90 text-[var(--gold)] text-xs font-mono tracking-wide transition-colors duration-200 cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Skip</span>
            </button>
          )}
        </form>

        {/* Live Mic Listening Waveform Status */}
        {isListening && (
          <div className="mt-2.5 pt-2.5 flex items-center justify-between text-xs font-mono text-[var(--gold)]">
            <div className="flex items-center gap-2">
              <AudioWaveform className="w-4 h-4 text-[var(--gold)]" />
              <span>Listening: Speak your question now...</span>
            </div>
            <button
              onClick={toggleListening}
              className="text-[11px] px-2.5 py-0.5 rounded bg-[var(--gold-tint)] text-[var(--gold)] hover:opacity-90 transition-colors duration-200 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-mono text-[var(--text-muted)] flex-shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[var(--gold)]" /> Suggested:
        </span>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled || avatarState === 'thinking'}
            onClick={() => {
              setInputText(chip);
              onSendMessage(chip);
            }}
            className="flex-shrink-0 px-3 py-1 rounded-lg bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] text-[11px] font-mono transition-colors duration-200 cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
};
