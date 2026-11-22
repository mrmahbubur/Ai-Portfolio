import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Download,
  Plus,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sparkles,
  FileText,
  AlertCircle,
  Globe,
  ChevronDown,
  Radio,
  Pencil,
} from 'lucide-react';
import { Message, BioProfile } from '../types';
import { audioEngine } from '../utils/audio';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';

export interface ChatAttachment {
  name: string;
  mimeType: string;
  size: number;
  data: string; // base64 string
  previewUrl?: string;
}

export interface ExtendedMessage extends Message {
  attachments?: ChatAttachment[];
  sources?: Array<{ title?: string; uri?: string }>;
  rating?: 'up' | 'down';
  isStreaming?: boolean;
  isError?: boolean;
}

interface CamelliaChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeLanguage?: string;
  onSelectLanguage?: (langCode: string) => void;
  profile?: BioProfile;
  onOpenLiveVoice?: () => void;
  queuedPrompt?: { id: string; text: string } | null;
}

const QUICK_START_CHIPS = [
  { label: 'Write an email', prompt: 'Please help me write a polite, professional business inquiry email.' },
  { label: 'Fix my Wi-Fi', prompt: 'My Wi-Fi keeps disconnecting and has high ping. What step-by-step IT diagnostics should I run?' },
  { label: 'Improve my CV', prompt: 'How much is a CV, and how can I download or improve my professional resume with M R S?' },
  { label: 'Explain a topic', prompt: 'Explain how modern Large Language Models and neural networks process reasoning step by step.' },
  { label: 'Translate this', prompt: 'Please translate the following message into Bengali, Hindi, and Urdu with natural professional phrasing:' },
  { label: 'Help me code', prompt: 'Help me write and debug a clean TypeScript function with error handling and comments.' },
  { label: 'View services', prompt: 'What remote IT support, web management, and document formatting services does M R S provide?' },
];

const CHAT_LANGUAGES = [
  { code: 'en-US', label: 'English', native: 'English' },
  { code: 'bn-BD', label: 'বাংলা', native: 'Bengali' },
  { code: 'hi-IN', label: 'हिन्दी', native: 'Hindi' },
  { code: 'ur-PK', label: 'اردو', native: 'Urdu' },
];

export const CamelliaChatPanel: React.FC<CamelliaChatPanelProps> = ({
  isOpen,
  onClose,
  activeLanguage = 'en-US',
  onSelectLanguage,
  profile,
  onOpenLiveVoice,
  queuedPrompt,
}) => {
  const CHAT_STORAGE_KEY = 'mrs_camellia_chat_history_v1';
  const createWelcomeMessage = (): ExtendedMessage => ({
    id: 'camellia-welcome',
    role: 'assistant',
    text: "Hello and welcome! I'm Camellia, M R S's AI assistant.\n\nI'm equipped with full general intelligence to assist you with anything — coding, writing, IT diagnostics, math, research, translations, or exploring M R S's verified platforms and services. How can I help you today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [messages, setMessages] = useState<ExtendedMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({ ...m, isStreaming: false }));
        }
      }
    } catch {}
    return [createWelcomeMessage()];
  });

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>(activeLanguage || 'en-US');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const lastAttemptRef = useRef<{
    text: string;
    attachments: ChatAttachment[];
    assistantMessageId: string;
  } | null>(null);

  const handledQueueIdRef = useRef<string | null>(null);
  const isRtlLanguage = selectedLang.toLowerCase().startsWith('ur') || selectedLang.toLowerCase().startsWith('ar');

  // Persist non-streaming chat turns cleanly to browser storage
  useEffect(() => {
    try {
      const persistable = messages
        .filter((m) => !m.isStreaming && !m.isError)
        .slice(-24)
        .map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          timestamp: m.timestamp,
          sources: m.sources,
          rating: m.rating,
        }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(persistable));
    } catch {}
  }, [messages]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Sync incoming language prop
  useEffect(() => {
    if (activeLanguage) {
      setSelectedLang(activeLanguage);
    }
  }, [activeLanguage]);

  // Focus input on panel open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      audioEngine.stopCurrentAudio();
      setSpeakingMessageId(null);
    }
  }, [isOpen]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang || 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    } catch (_) {}

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
    };
  }, [selectedLang]);

  const toggleSpeechRecognition = async () => {
    // 1. Use browser SpeechRecognition if natively supported
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        try {
          recognitionRef.current.lang = selectedLang || 'en-US';
          recognitionRef.current.start();
          setIsListening(true);
        } catch (_) {
          setIsListening(false);
        }
      }
      return;
    }

    // 2. Universal fallback: MediaRecorder + Gemini 3.5 Transcribe (/api/transcribe)
    if (isListening && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorMessage('Audio recording is unavailable on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        recordedChunksRef.current = [];
        if (blob.size < 100) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64, mimeType }),
            });
            const data = await res.json();
            if (res.ok && data.transcript) {
              setInputText((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
            } else {
              setErrorMessage(data.error || 'Could not transcribe audio.');
            }
          } catch {
            setErrorMessage('Audio transcription request failed.');
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsListening(true);
    } catch {
      setErrorMessage('Microphone permission was declined.');
      setIsListening(false);
    }
  };

  // Handle Stop Streaming Generation
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((msg, i) => (i === prev.length - 1 && msg.role === 'assistant' ? { ...msg, isStreaming: false } : msg))
    );
  }, []);

  const buildProfileContextPayload = useCallback(() => {
    if (!profile) return undefined;
    return {
      ownerName: profile.ownerName,
      headline: profile.headline,
      certification: profile.certification,
      coursesCertifications: profile.coursesCertifications,
      projects: profile.projects,
      whatICanHelpWith: profile.whatICanHelpWith,
      skillsList: profile.skillsList,
      socials: profile.socials,
    };
  }, [profile]);

  // Execute request against streaming endpoint with JSON fallback and full Retry preservation
  const dispatchToCamellia = useCallback(
    async (
      query: string,
      currentAttachments: ChatAttachment[],
      assistantMessageId: string,
      historyPayload: Array<{
        role: 'user' | 'assistant';
        text: string;
        attachments?: Array<{ mimeType: string; data: string; name?: string }>;
      }>
    ) => {
      setIsGenerating(true);
      setErrorMessage(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const profileContextPayload = buildProfileContextPayload();

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: query,
            history: historyPayload,
            languageCode: selectedLang,
            profileContext: profileContextPayload,
            attachments: currentAttachments.map((a) => ({
              mimeType: a.mimeType,
              data: a.data,
              name: a.name,
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Streaming unavailable');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Unable to read stream');
        }

        const decoder = new TextDecoder('utf-8');
        let sseBuffer = '';
        let accumulatedText = '';
        let sourcesFound: Array<{ title?: string; uri?: string }> = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;

            let parsed: any = null;
            try {
              parsed = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (parsed.error) {
              throw new Error(String(parsed.error));
            }
            if (parsed.chunk) {
              accumulatedText += parsed.chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, text: accumulatedText, isStreaming: true, isError: false }
                    : msg
                )
              );
            }
            if (parsed.sources && Array.isArray(parsed.sources)) {
              sourcesFound = parsed.sources;
            }
            if (parsed.done) {
              accumulatedText = parsed.fullText || accumulatedText;
              sourcesFound = parsed.sources || sourcesFound;
            }
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  text: accumulatedText || "I'm Camellia, MRS's AI assistant. How may I assist you further?",
                  sources: sourcesFound.length > 0 ? sourcesFound : undefined,
                  isStreaming: false,
                  isError: false,
                }
              : msg
          )
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg))
          );
          return;
        }
        try {
          const fbRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: query,
              history: historyPayload,
              languageCode: selectedLang,
              profileContext: profileContextPayload,
              attachments: currentAttachments.map((a) => ({
                mimeType: a.mimeType,
                data: a.data,
                name: a.name,
              })),
            }),
            signal: controller.signal,
          });
          const fbData = await fbRes.json().catch(() => ({}));
          if (!fbRes.ok || fbData.error || !fbData.text) {
            throw new Error('Temporary service unavailability');
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    text: fbData.text,
                    sources: fbData.sources,
                    isStreaming: false,
                    isError: false,
                  }
                : msg
            )
          );
        } catch (fallbackErr: any) {
          if (fallbackErr?.name === 'AbortError') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg))
            );
            return;
          }
          setErrorMessage('Camellia is momentarily busy. Please try again shortly.');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    text: 'Camellia is momentarily busy. Please try again shortly.',
                    isStreaming: false,
                    isError: true,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [buildProfileContextPayload, selectedLang]
  );

  // Handle Sending Message
  const handleSend = useCallback(
    async (textToSend?: string, overrideAttachments?: ChatAttachment[]) => {
      const query = (textToSend ?? inputText).trim();
      const currentAttachments = overrideAttachments ?? [...attachments];

      if (!query && currentAttachments.length === 0) return;
      if (isGenerating) return;

      setErrorMessage(null);
      if (textToSend === undefined) {
        setInputText('');
      }
      if (!overrideAttachments) {
        setAttachments([]);
      }

      const userMessageId = `user-${Date.now()}`;
      const userMessage: ExtendedMessage = {
        id: userMessageId,
        role: 'user',
        text: query,
        attachments: currentAttachments,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const assistantMessageId = `assistant-${Date.now() + 1}`;
      const placeholderAssistantMessage: ExtendedMessage = {
        id: assistantMessageId,
        role: 'assistant',
        text: '',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      lastAttemptRef.current = {
        text: query,
        attachments: currentAttachments,
        assistantMessageId,
      };

      const historyPayload = messages
        .filter((m) => m.id !== 'camellia-welcome' && !m.isError)
        .slice(-20)
        .map((m) => ({
          role: m.role,
          text: m.text,
          attachments: m.attachments?.map((a) => ({ mimeType: a.mimeType, data: a.data, name: a.name })),
        }));

      setMessages((prev) => [...prev, userMessage, placeholderAssistantMessage]);
      await dispatchToCamellia(query, currentAttachments, assistantMessageId, historyPayload);
    },
    [attachments, dispatchToCamellia, inputText, isGenerating, messages]
  );

  // Retry last failed message in-place
  const handleRetry = useCallback(async () => {
    if (isGenerating) return;
    const attempt = lastAttemptRef.current;
    if (!attempt) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === attempt.assistantMessageId
          ? { ...msg, text: '', isStreaming: true, isError: false }
          : msg
      )
    );

    const historyPayload = messages
      .filter((m) => m.id !== 'camellia-welcome' && m.id !== attempt.assistantMessageId && !m.isError)
      .slice(-21, -1)
      .map((m) => ({
        role: m.role,
        text: m.text,
        attachments: m.attachments?.map((a) => ({ mimeType: a.mimeType, data: a.data, name: a.name })),
      }));

    await dispatchToCamellia(attempt.text, attempt.attachments, attempt.assistantMessageId, historyPayload);
  }, [dispatchToCamellia, isGenerating, messages]);

  // File Upload Handlers (Images, PDF, Text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB limit

    Array.from(files).forEach((file: File) => {
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(ts|js|py|txt|md|csv|json)$/i)) {
        setErrorMessage(`File "${file.name}" has an unsupported format. Supported formats: Images, PDF, Text/Code.`);
        return;
      }
      if (file.size > maxFileSize) {
        setErrorMessage(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;
        const attachment: ChatAttachment = {
          name: file.name,
          mimeType: file.type || 'text/plain',
          size: file.size,
          data: result,
          previewUrl: file.type.startsWith('image/') ? result : undefined,
        };
        setAttachments((prev) => [...prev.slice(-2), attachment]); // Max 3 attachments
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Copy Message Text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy Code snippet
  const handleCopyCode = (codeKey: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(codeKey);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Read Aloud Message reusing the authentic Claude female voice profile
  const handleReadAloud = (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      audioEngine.stopCurrentAudio();
      setSpeakingMessageId(null);
    } else {
      audioEngine.stopCurrentAudio();
      setSpeakingMessageId(msgId);
      audioEngine.speakWithClaudeAIVoice(text, {
        languageCode: selectedLang,
        onStart: () => setSpeakingMessageId(msgId),
        onEnd: () => setSpeakingMessageId(null),
      });
    }
  };

  // Thumbs up / down
  const handleRate = (id: string, rating: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, rating: msg.rating === rating ? undefined : rating } : msg))
    );
  };

  // Regenerate Response
  const handleRegenerate = (index: number) => {
    let lastUserQuery = '';
    let lastUserAttachments: ChatAttachment[] | undefined;
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserQuery = messages[i].text;
        lastUserAttachments = messages[i].attachments;
        break;
      }
    }
    if (lastUserQuery || (lastUserAttachments && lastUserAttachments.length > 0)) {
      setMessages((prev) => prev.slice(0, index));
      handleSend(lastUserQuery, lastUserAttachments);
    }
  };

  // Edit and resend user message cleanly
  const handleEditAndResend = (index: number, currentText: string) => {
    handleStopGeneration();
    setMessages((prev) => prev.slice(0, index));
    setInputText(currentText);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  // New Chat
  const handleNewChat = () => {
    handleStopGeneration();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: "New chat started! I'm Camellia, M R S's AI assistant. What would you like to explore or solve together?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMessage(null);
  };

  // Clear Chat History
  const handleClearChat = () => {
    handleStopGeneration();
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    setMessages([]);
    setErrorMessage(null);
  };

  // Export Chat
  const handleExportChat = () => {
    const chatTranscript = messages
      .map((m) => `[${m.timestamp}] ${m.role === 'user' ? 'Visitor' : 'Camellia (M R S Assistant)'}:\n${m.text}\n`)
      .join('\n---\n\n');

    const blob = new Blob([`M R S Portfolio · Camellia AI Chat Transcript\nExported: ${new Date().toLocaleString()}\n\n` + chatTranscript], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Camellia_AI_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Language Change
  const handleLanguageSelect = (langCode: string) => {
    setSelectedLang(langCode);
    setShowLangMenu(false);
    onSelectLanguage?.(langCode);
  };

  // Auto-dispatch prompts forwarded from Neural Semantic Search (Cmd+K)
  useEffect(() => {
    if (
      isOpen &&
      queuedPrompt &&
      queuedPrompt.id &&
      queuedPrompt.text.trim() &&
      handledQueueIdRef.current !== queuedPrompt.id &&
      !isGenerating
    ) {
      handledQueueIdRef.current = queuedPrompt.id;
      handleSend(queuedPrompt.text.trim());
    }
  }, [isOpen, queuedPrompt, isGenerating, handleSend]);

  // Safe URL sanitizer blocking javascript:, data:, vbscript: URIs
  const getSafeHref = (rawUrl?: string): string | null => {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  };

  // Block-level Markdown renderer (code blocks, tables, headings, blockquotes, lists)
  const renderFormattedMarkdown = (rawText: string, messageId: string) => {
    if (!rawText) return null;

    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      const precedingText = rawText.slice(lastIndex, match.index);
      if (precedingText) {
        parts.push(
          <div key={`text-${blockCounter}`} className="space-y-1.5 font-sans text-[13.5px] leading-relaxed">
            {renderRichBlocks(precedingText, `b-${blockCounter}`)}
          </div>
        );
      }

      const lang = match[1] || 'code';
      const code = match[2];
      const codeKey = `${messageId}-${blockCounter}`;
      const isCodeCopied = copiedCodeIdx === codeKey;

      parts.push(
        <div key={`code-${blockCounter}`} className="my-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--code-bg)] shadow-lg">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--code-header-bg)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--gold)]">
            <span className="uppercase tracking-wider font-semibold">{lang}</span>
            <button
              type="button"
              onClick={() => handleCopyCode(codeKey, code)}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-[var(--gold)] transition-colors cursor-pointer"
            >
              {isCodeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCodeCopied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="p-3.5 overflow-x-auto text-xs font-mono text-[var(--code-text)] leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
      blockCounter++;
    }

    const remainingText = rawText.slice(lastIndex);
    if (remainingText) {
      parts.push(
        <div key="text-remaining" className="space-y-1.5 font-sans text-[13.5px] leading-relaxed">
          {renderRichBlocks(remainingText, 'rem')}
        </div>
      );
    }

    return parts;
  };

  // Parse Markdown tables, headings, blockquotes, horizontal rules, bullets, and numbered lists
  const renderRichBlocks = (text: string, prefix: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let i = 0;

    const splitTableCells = (rowLine: string): string[] => {
      const stripped = rowLine.trim().replace(/^\|/, '').replace(/\|$/, '');
      return stripped.split('|').map((c) => c.trim());
    };

    const isTableSeparator = (rowLine: string): boolean => {
      const cells = splitTableCells(rowLine);
      return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect Markdown Table
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        lines[i + 1].trim().includes('|') &&
        isTableSeparator(lines[i + 1])
      ) {
        const headers = splitTableCells(line);
        i += 2; // Skip header & separator
        const bodyRows: string[][] = [];
        while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
          bodyRows.push(splitTableCells(lines[i]));
          i++;
        }

        nodes.push(
          <div key={`${prefix}-tbl-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[var(--panel-raised)] border-b border-[var(--border)]">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-mono font-semibold text-[var(--gold)] whitespace-nowrap">
                      {parseFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[var(--panel)]/60 transition-colors">
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-[var(--text)] align-top">
                        {parseFormatting(row[cIdx] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (/^---+$|^\*\*\*+$/.test(trimmed)) {
        nodes.push(<hr key={`${prefix}-hr-${i}`} className="my-2 border-[var(--border)]" />);
      } else if (trimmed.startsWith('#### ')) {
        nodes.push(
          <h5 key={`${prefix}-h4-${i}`} className="font-heading font-semibold text-[13px] text-[var(--gold)] mt-2.5 mb-0.5">
            {parseFormatting(trimmed.slice(5))}
          </h5>
        );
      } else if (trimmed.startsWith('### ')) {
        nodes.push(
          <h4 key={`${prefix}-h3-${i}`} className="font-heading font-bold text-sm text-[var(--gold)] mt-3 mb-1">
            {parseFormatting(trimmed.slice(4))}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        nodes.push(
          <h3 key={`${prefix}-h2-${i}`} className="font-heading font-bold text-base text-[var(--text)] mt-3.5 mb-1.5">
            {parseFormatting(trimmed.slice(3))}
          </h3>
        );
      } else if (trimmed.startsWith('> ')) {
        nodes.push(
          <blockquote
            key={`${prefix}-bq-${i}`}
            className="px-3.5 py-2 rounded-lg bg-[var(--panel-raised)]/55 text-[var(--text-secondary)] italic my-1.5"
          >
            {parseFormatting(trimmed.slice(2))}
          </blockquote>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        nodes.push(
          <div key={`${prefix}-ul-${i}`} className="flex items-start gap-2 pl-2 my-0.5">
            <span className="text-[var(--gold)] font-bold shrink-0">•</span>
            <span className="flex-1">{parseFormatting(trimmed.slice(2))}</span>
          </div>
        );
      } else {
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          nodes.push(
            <div key={`${prefix}-ol-${i}`} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-[var(--gold)] font-mono font-semibold shrink-0">{numMatch[1]}.</span>
              <span className="flex-1">{parseFormatting(numMatch[2])}</span>
            </div>
          );
        } else {
          nodes.push(
            <p key={`${prefix}-p-${i}`} className={trimmed === '' ? 'h-1.5' : 'my-0.5'}>
              {parseFormatting(line)}
            </p>
          );
        }
      }
      i++;
    }

    return nodes;
  };

  // Helper for bold, italic, inline code, and sanitized links
  const parseFormatting = (str: string): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\(([^)\s]+)\)/g;
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;
    let m: RegExpExecArray | null;

    while ((m = linkRegex.exec(str)) !== null) {
      if (m.index > lastIdx) {
        segments.push(parseBoldItalic(str.slice(lastIdx, m.index)));
      }
      const safeHref = getSafeHref(m[2]);
      if (safeHref) {
        segments.push(
          <a
            key={`link-${m.index}`}
            href={safeHref}
            target={safeHref.startsWith('http') ? '_blank' : undefined}
            rel={safeHref.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-[var(--gold)] underline underline-offset-2 hover:text-[var(--text)] transition-colors inline-flex items-center gap-0.5"
          >
            <span>{m[1]}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      } else {
        segments.push(m[1]);
      }
      lastIdx = m.index + m[0].length;
    }

    if (lastIdx < str.length) {
      segments.push(parseBoldItalic(str.slice(lastIdx)));
    }

    return segments.length > 0 ? segments : parseBoldItalic(str);
  };

  const parseBoldItalic = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={i} className="font-semibold text-[var(--gold)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={i} className="italic text-[var(--text-secondary)]">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-[var(--panel-raised)] text-[var(--gold)] font-mono text-[11.5px] border border-[var(--border)]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camellia AI Assistant Chat Panel"
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={`w-full ${
          isExpanded ? 'max-w-none' : 'md:max-w-xl'
        } bg-[var(--bg)] h-[100dvh] md:h-full flex flex-col shadow-[var(--shadow-panel)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative animate-slideInRight will-change-transform`}
      >
        {/* Top Header Bar */}
        <header className="px-4 sm:px-6 py-3 bg-[var(--panel)] flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Camellia's Real Persona Portrait */}
            <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-[var(--gold)]/70 bg-[var(--panel-raised)] p-0.5 shrink-0 shadow-md">
              <img
                src={CAMELLIA_AVATAR_SRC}
                alt="Camellia AI Assistant"
                className="w-full h-full object-cover object-top rounded-full"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm sm:text-base text-[var(--text)] truncate">
                  Camellia AI
                </h3>
                <span className="text-[11px] font-mono text-[var(--gold)] font-medium">
                  · M R S Assistant
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-secondary)] truncate">
                {isGenerating ? 'Camellia is thinking & formulating...' : 'General Intelligence · Coding · IT Support · M R S Hub'}
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu((prev) => !prev)}
                title="Change Chat Language"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono"
              >
                <Globe className="w-4 h-4 text-[var(--gold)]" />
                <span className="hidden sm:inline font-semibold">
                  {CHAT_LANGUAGES.find((l) => l.code === selectedLang)?.native || 'English'}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-1 w-36 rounded-xl bg-[var(--panel-raised)] shadow-xl z-50 py-1 text-xs font-mono">
                  {CHAT_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleLanguageSelect(l.code)}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                        selectedLang === l.code
                          ? 'bg-[var(--gold)]/15 text-[var(--gold)] font-semibold'
                          : 'text-[var(--text)] hover:bg-[var(--panel)]'
                      }`}
                    >
                      <span>{l.native}</span>
                      {selectedLang === l.code && <Check className="w-3 h-3 text-[var(--gold)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Real-Time Live Voice & Vision Launch */}
            {onOpenLiveVoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLiveVoice();
                }}
                title="Switch to Real-Time Live Voice & Vision"
                className="p-1.5 rounded-lg text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
              >
                <Radio className="w-4 h-4" />
              </button>
            )}

            {/* New Chat */}
            <button
              type="button"
              onClick={handleNewChat}
              title="Start New Conversation"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Export Chat */}
            <button
              type="button"
              onClick={handleExportChat}
              title="Export Conversation as Text"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              onClick={handleClearChat}
              title="Clear Conversation"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger-text)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Expand / Collapse (Desktop) */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
              className="hidden md:inline-flex p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Chat Panel"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="px-4 py-2 bg-rose-500/12 border-b border-rose-500/25 text-[var(--danger-text)] text-xs flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--danger-text)]" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                handleRetry();
              }}
              className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-[var(--danger-text)] font-mono text-[11px] font-semibold cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isCopied = copiedId === msg.id;
            const isSpeaking = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-full ${
                  isUser ? 'flex-row-reverse ml-6' : 'mr-6'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center ${
                    isUser
                      ? 'bg-[var(--panel-raised)] text-[var(--text)]'
                      : 'ring-1 ring-[var(--gold)]/65 bg-[var(--panel)] shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <span className="font-mono text-xs font-semibold">U</span>
                  ) : (
                    <img src={CAMELLIA_AVATAR_SRC} alt="Camellia" className="w-full h-full object-cover object-top rounded-full" />
                  )}
                </div>

                {/* Message Body */}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Speaker Label & Timestamp */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="font-mono text-[10.5px] uppercase font-semibold text-[var(--gold)]">
                      {isUser ? 'Visitor' : 'Camellia'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{msg.timestamp}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl p-4 shadow-sm text-sm transition-all ${
                      isUser
                        ? 'bg-[var(--panel-raised)] text-[var(--text)] rounded-tr-none'
                        : 'bg-[var(--panel)] text-[var(--text)] rounded-tl-none'
                    }`}
                  >
                    {/* Rendered Uploaded Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {msg.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--gold)]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[140px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formatted Content (RTL-aware for Urdu & Arabic) */}
                    {isUser ? (
                      <div className="space-y-1.5" dir={isRtlLanguage ? 'rtl' : 'ltr'}>
                        <p className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">{msg.text}</p>
                        {!isGenerating && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleEditAndResend(index, msg.text)}
                              title="Edit and resend this message"
                              className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1" dir={isRtlLanguage ? 'rtl' : 'ltr'}>
                        {renderFormattedMarkdown(msg.text, msg.id)}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-[var(--gold)] animate-pulse" />
                        )}
                      </div>
                    )}

                    {/* Live Grounding Source Links (If provided via Google Search Grounding) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3.5 pt-2.5 border-t border-[var(--border)]/60 text-xs font-mono">
                        <span className="text-[10.5px] uppercase tracking-wider text-[var(--gold)] font-semibold flex items-center gap-1 mb-1.5">
                          <Sparkles className="w-3 h-3" /> Grounded Search Sources:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--gold)] border border-[var(--border)] inline-flex items-center gap-1 text-[11px] truncate max-w-[200px]"
                            >
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{src.title || src.uri}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for Assistant Message */}
                  {!isUser && !msg.isStreaming && (
                    <div className="mt-1.5 flex items-center gap-2 px-1 text-[11px] font-mono text-[var(--text-muted)]">
                      {msg.isError && lastAttemptRef.current?.assistantMessageId === msg.id && (
                        <>
                          <button
                            type="button"
                            onClick={handleRetry}
                            title="Retry request"
                            className="inline-flex items-center gap-1 text-[var(--danger-text)] hover:underline font-semibold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                          <span>•</span>
                        </>
                      )}
                      {/* Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy Response"
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-[var(--success-text)]" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <span>•</span>

                      {/* Read Aloud */}
                      <button
                        type="button"
                        onClick={() => handleReadAloud(msg.id, msg.text)}
                        title={isSpeaking ? 'Stop Reading' : 'Listen with Authentic Claude Female Voice'}
                        className={`inline-flex items-center gap-1 hover:text-[var(--gold)] transition-colors cursor-pointer ${
                          isSpeaking ? 'text-[var(--gold)] font-bold' : ''
                        }`}
                      >
                        {isSpeaking ? <VolumeX className="w-3 h-3 text-[var(--gold)]" /> : <Volume2 className="w-3 h-3" />}
                        <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                      </button>

                      <span>•</span>

                      {/* Regenerate */}
                      <button
                        type="button"
                        onClick={() => handleRegenerate(index)}
                        title="Regenerate this response"
                        className="inline-flex items-center gap-1 hover:text-[var(--gold)] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>

                      <span>•</span>

                      {/* Thumbs Up / Down */}
                      <button
                        type="button"
                        onClick={() => handleRate(msg.id, 'up')}
                        title="Helpful"
                        className={`p-0.5 hover:text-[var(--success-text)] cursor-pointer ${
                          msg.rating === 'up' ? 'text-[var(--success-text)]' : ''
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate(msg.id, 'down')}
                        title="Not helpful"
                        className={`p-0.5 hover:text-[var(--danger-text)] cursor-pointer ${
                          msg.rating === 'down' ? 'text-[var(--danger-text)]' : ''
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick-Start Suggestion Chips */}
        <div className="px-4 sm:px-6 py-2.5 bg-[var(--panel)]/65 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_START_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isGenerating}
                onClick={() => handleSend(chip.prompt)}
                className="px-3 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text)] hover:text-[var(--gold)] text-xs font-mono whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 shrink-0 cursor-pointer disabled:opacity-50 select-none touch-manipulation"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Uploaded File Previews in Tray */}
        {attachments.length > 0 && (
          <div className="px-4 sm:px-6 py-2 bg-[var(--panel-raised)] flex flex-wrap gap-2 shrink-0">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg)] text-xs font-mono"
              >
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt={att.name} className="w-6 h-6 object-cover rounded" />
                ) : (
                  <FileText className="w-4 h-4 text-[var(--gold)]" />
                )}
                <span className="truncate max-w-[120px] text-[var(--text)]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-[var(--text-muted)] hover:text-[var(--danger-text)] ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Area */}
        <footer className="p-3 sm:p-4 safe-pb bg-[var(--panel)] shrink-0">
          <div className="relative flex items-end gap-2 bg-[var(--bg)] rounded-xl focus-within:ring-1 focus-within:ring-[var(--gold)] transition-all p-2 shadow-inner">
            {/* File Upload Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image, PDF, or Code file (Max 10MB)"
              className="p-2 sm:p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] active:scale-90 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0 mb-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/*,.ts,.js,.py,.json,.csv,.md"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Speech Recognition Mic */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              title={isListening ? 'Stop listening' : 'Speak to Camellia'}
              className={`p-2 sm:p-2.5 rounded-lg active:scale-90 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0 mb-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation ${
                isListening
                  ? 'bg-rose-500/15 text-[var(--danger-text)] ring-1 ring-[var(--danger-text)]/40'
                  : 'text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Multi-line Text Area (RTL-aware for Urdu & Arabic) */}
            <textarea
              ref={inputRef}
              dir={isRtlLanguage ? 'rtl' : 'ltr'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, code, write, diagnose, or translate (Enter to send, Shift+Enter for new line)..."
              rows={1}
              className="flex-1 bg-transparent text-[var(--text)] text-xs sm:text-sm placeholder:text-[var(--text-muted)] resize-none outline-hidden min-h-[38px] max-h-[140px] py-2 px-1 font-sans leading-relaxed transition-colors duration-150"
            />

            {/* Send / Stop Button */}
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                title="Stop Generating"
                className="p-2.5 sm:p-3 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-md shrink-0 mb-0.5 min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputText.trim() && attachments.length === 0}
                title="Send Message"
                className="p-2.5 sm:p-3 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-95 text-[var(--gold-ink)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-md shrink-0 mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-2 text-center text-[10.5px] font-mono text-[var(--text-muted)] flex items-center justify-center gap-1">
            <span>Camellia can make mistakes. Please verify important information.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
