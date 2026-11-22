// Web Audio Engine for Sound FX, Gemini TTS 24kHz PCM Playback, Analyser Nodes, and Web Speech Synthesis
// Strictly locked to Female Jennifer Voice (Adobe Firefly Acoustic Profile) - Male voices banned across all languages

class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private currentSessionId: number = 0;
  private activeAbortController: AbortController | null = null;
  private speechCadenceInterval: ReturnType<typeof setInterval> | null = null;
  private speechWatchdogTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastBoundaryTimestamp: number = 0;
  private audioProcessInterval: number | null = null;
  private onAudioLevelCallback: ((level: number, phoneme: number) => void) | null = null;
  private loadedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const cacheVoices = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          if (v && v.length > 0) {
            this.loadedVoices = v;
          }
        } catch (_) {}
      };
      cacheVoices();
      try {
        window.speechSynthesis.addEventListener('voiceschanged', cacheVoices);
      } catch (_) {}
    }
  }

  public init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public unlockAudioContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopCurrentAudio();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setAudioLevelCallback(cb: (level: number, phoneme: number) => void) {
    this.onAudioLevelCallback = cb;
  }

  // Play Cyber UI sound effect
  public playSoundEffect(type: 'beep' | 'chime' | 'click' | 'power_on' | 'mic_start' | 'mic_stop') {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.18); // C6
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'power_on') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'mic_start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'mic_stop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (_) {}
  }

  // Play Broadcast-Quality WAV/MP3 or 24kHz Raw PCM Audio with real-time waveform reactivity
  public async playAudioData(
    base64Data: string,
    format: 'pcm' | 'mp3' | 'wav' | 'auto' = 'auto',
    onEnd?: () => void,
    sessionId?: number
  ): Promise<boolean> {
    if (this.isMuted) {
      onEnd?.();
      return false;
    }

    if (sessionId !== undefined && sessionId !== this.currentSessionId) {
      return false;
    }

    try {
      this.init();
      if (!this.ctx || !this.analyser) {
        onEnd?.();
        return false;
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }

      // Stop any existing Web Audio playback
      this.stopCurrentAudioSource();

      // Decode base64 to binary bytes
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check container formats: WAV (RIFF...WAVE) or MP3 (ID3 / MPEG sync)
      const isRiffWav =
        len > 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x41 &&
        bytes[10] === 0x56 &&
        bytes[11] === 0x45;

      const isWav = format === 'wav' || (format === 'auto' && isRiffWav);

      const isMp3 =
        format === 'mp3' ||
        (format === 'auto' &&
          !isRiffWav &&
          len > 3 &&
          ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
            (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)));

      let audioBuffer: AudioBuffer | null = null;

      if (isWav || isMp3) {
        try {
          // Native browser Web Audio container decoder (supports WAV 24kHz & MP3)
          audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
        } catch (decErr) {
          // Fallback to HTML5 audio element wired into analyser
          return this.playViaAudioElement(base64Data, isWav ? 'audio/wav' : 'audio/mp3', onEnd, sessionId);
        }
      } else {
        // 16-bit PCM (Little-Endian, 24000Hz, Mono) from Gemini TTS
        const sampleRate = 24000;
        const numSamples = Math.floor(len / 2);
        if (numSamples <= 0) {
          onEnd?.();
          return false;
        }

        audioBuffer = this.ctx.createBuffer(1, numSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

        for (let i = 0; i < numSamples; i++) {
          const int16 = dataView.getInt16(i * 2, true);
          channelData[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
        }
      }

      if (!audioBuffer) {
        onEnd?.();
        return false;
      }

      if (sessionId !== undefined && sessionId !== this.currentSessionId) {
        return false;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.currentSource = source;
      this.startAnalyserPolling();

      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
          this.stopAnalyserPolling();
          onEnd?.();
        }
      };

      source.start();
      return true;
    } catch (_) {
      this.stopAnalyserPolling();
      onEnd?.();
      return false;
    }
  }

  // Backward compatibility alias for Gemini PCM
  public async playGeminiPcmBase64(base64Data: string, onEnd?: () => void, sessionId?: number): Promise<boolean> {
    return this.playAudioData(base64Data, 'pcm', onEnd, sessionId);
  }

  private stopCurrentAudioSource() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (_) {}
      this.currentSource = null;
    }
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (_) {}
      this.currentAudioElement = null;
    }
  }

  private playViaAudioElement(base64Data: string, mimeType: string, onEnd?: () => void, sessionId?: number): boolean {
    try {
      if (sessionId !== undefined && sessionId !== this.currentSessionId) {
        return false;
      }
      this.stopCurrentAudioSource();
      const audio = new Audio(`data:${mimeType};base64,${base64Data}`);
      this.currentAudioElement = audio;

      // Connect HTMLAudioElement directly through real Web Audio AnalyserNode for genuine spectrum metering
      let connectedToAnalyser = false;
      if (this.ctx && this.analyser) {
        try {
          const mediaSource = this.ctx.createMediaElementSource(audio);
          mediaSource.connect(this.analyser);
          this.analyser.connect(this.ctx.destination);
          this.startAnalyserPolling();
          connectedToAnalyser = true;
        } catch (_) {}
      }

      const stopMetering = () => {
        if (this.speechCadenceInterval) {
          clearInterval(this.speechCadenceInterval);
          this.speechCadenceInterval = null;
        }
        this.stopAnalyserPolling();
      };

      audio.onended = () => {
        if (this.currentAudioElement === audio) {
          this.currentAudioElement = null;
          stopMetering();
          onEnd?.();
        }
      };

      audio.onerror = () => {
        if (this.currentAudioElement === audio) {
          this.currentAudioElement = null;
          stopMetering();
          onEnd?.();
        }
      };

      if (!connectedToAnalyser) {
        if (this.speechCadenceInterval) clearInterval(this.speechCadenceInterval);
        this.speechCadenceInterval = setInterval(() => {
          if (audio.paused || audio.ended) return;
          const phase = audio.currentTime * 7.2;
          const env = 0.42 + 0.24 * Math.sin(phase) + 0.12 * Math.cos(phase * 1.7);
          const phoneme = 0.5 + 0.45 * Math.sin(phase * 1.35);
          this.onAudioLevelCallback?.(Math.max(0.08, Math.min(1, env)), Math.max(0, Math.min(1, phoneme)));
        }, 45);
      }

      audio.play().catch(() => {
        stopMetering();
        onEnd?.();
      });

      return true;
    } catch (_) {
      onEnd?.();
      return false;
    }
  }

  // High-fidelity speech engine strictly locked to the single face verifying voice instructions across all operations
  public async speakWithClaudeAIVoice(
    text: string,
    options?: { rate?: number; pitch?: number; languageCode?: string; onStart?: () => void; onEnd?: () => void }
  ): Promise<void> {
    if (this.isMuted) {
      options?.onEnd?.();
      return;
    }

    // Cancel all previous speech/audio immediately so two voices NEVER speak simultaneously
    this.stopCurrentAudio();
    this.unlockAudioContext();
    const sessionId = ++this.currentSessionId;

    // Clean text and ensure clear "M R S" and tech acronym pronunciation
    let cleanText = text.replace(/[*#_`~[\]()<>{}^]/g, ' ');
    cleanText = cleanText.replace(/\bMRS\b/gi, 'M R S');
    cleanText = cleanText.replace(/\bMrs\.\b/gi, 'M R S');
    cleanText = cleanText.replace(/\bMrs\b/gi, 'M R S');
    cleanText = cleanText.replace(/\bmrs\b/gi, 'M R S');
    cleanText = cleanText.replace(/\bM\.R\.S\.\b/gi, 'M R S');
    cleanText = cleanText.replace(/\bM\.R\.S\b/gi, 'M R S');
    cleanText = cleanText.replace(/\bIT\b/g, 'I T');
    cleanText = cleanText.replace(/\bAI\b/g, 'A I');
    cleanText = cleanText.replace(/\bAPI\b/g, 'A P I');
    cleanText = cleanText.replace(/\bAPIs\b/g, 'A P Is');
    cleanText = cleanText.replace(/\bPDF\b/g, 'P D F');
    cleanText = cleanText.replace(/\bPDFs\b/g, 'P D Fs');
    cleanText = cleanText.replace(/\bSEO\b/g, 'S E O');
    cleanText = cleanText.replace(/\bUI\b/g, 'U I');
    cleanText = cleanText.replace(/\bUX\b/g, 'U X');
    cleanText = cleanText.replace(/\bPC\b/g, 'P C');
    cleanText = cleanText.replace(/\bFAQ\b/g, 'F A Q');
    cleanText = cleanText.replace(/\b24\/7\b/g, 'twenty-four seven');
    cleanText = cleanText.replace(/&/g, ' and ');
    cleanText = cleanText.replace(/\+/g, ' plus ');
    cleanText = cleanText.replace(/%/g, ' percent ');
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    const targetLang = options?.languageCode || 'en-US';

    // Fetch authoritative single voice audio from server TTS (identical to face verification voice)
    const abortController = new AbortController();
    this.activeAbortController = abortController;
    let fallbackToBrowser = true;

    try {
      // 25.0s timeout gives ample time to fetch and stream long multi-sentence explanations
      const timeoutId = setTimeout(() => abortController.abort(), 25000);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          text: cleanText,
          languageCode: targetLang,
        }),
      });

      clearTimeout(timeoutId);

      if (sessionId === this.currentSessionId && response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          options?.onStart?.();
          const played = await this.playAudioData(data.audioBase64, data.format || 'auto', options?.onEnd, sessionId);
          if (played) {
            fallbackToBrowser = false;
            return;
          }
        }
      }
    } catch (_) {
      // Fast fallback to browser synthesizer
    } finally {
      if (this.activeAbortController === abortController) {
        this.activeAbortController = null;
      }
    }

    // Client-side Natural Studio Female voice fallback only if network disconnects
    if (fallbackToBrowser && sessionId === this.currentSessionId) {
      this.speakWithBrowserTTS(cleanText, options, sessionId);
    }
  }

  // Aliases for compatibility
  public async speakWithCloudAIVoice(
    text: string,
    options?: { rate?: number; pitch?: number; languageCode?: string; onStart?: () => void; onEnd?: () => void }
  ): Promise<void> {
    return this.speakWithClaudeAIVoice(text, options);
  }

  public async speakWithJenniferVoice(
    text: string,
    options?: { rate?: number; pitch?: number; languageCode?: string; onStart?: () => void; onEnd?: () => void }
  ): Promise<void> {
    return this.speakWithClaudeAIVoice(text, options);
  }

  // Reload audio and speech synthesis engine
  public reloadVoiceEngine() {
    this.stopCurrentAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Trigger voices load and refresh internal cache
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.loadedVoices = v;
      }
    }
    this.unlockAudioContext();
  }

  // Web Speech API Synthesizer strictly locked to Authentic Natural Studio Female Voice with human cadence
  public speakWithBrowserTTS(
    text: string,
    options?: { rate?: number; pitch?: number; languageCode?: string; onStart?: () => void; onEnd?: () => void },
    sessionId?: number
  ) {
    if (this.isMuted) {
      options?.onEnd?.();
      return;
    }

    if (sessionId !== undefined && sessionId !== this.currentSessionId) {
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options?.onEnd?.();
      return;
    }

    try {
      // Double check cancellation to guarantee no overlap
      window.speechSynthesis.cancel();

      let cleanText = text.replace(/[*#_`~[\]()<>{}^]/g, ' ');
      cleanText = cleanText.replace(/\bMRS\b/gi, 'M R S');
      cleanText = cleanText.replace(/\bMrs\.\b/gi, 'M R S');
      cleanText = cleanText.replace(/\bMrs\b/gi, 'M R S');
      cleanText = cleanText.replace(/\bmrs\b/gi, 'M R S');
      cleanText = cleanText.replace(/\bM\.R\.S\.\b/gi, 'M R S');
      cleanText = cleanText.replace(/\bM\.R\.S\b/gi, 'M R S');
      cleanText = cleanText.replace(/\bIT\b/g, 'I T');
      cleanText = cleanText.replace(/\bAI\b/g, 'A I');
      cleanText = cleanText.replace(/\bAPI\b/g, 'A P I');
      cleanText = cleanText.replace(/\bAPIs\b/g, 'A P Is');
      cleanText = cleanText.replace(/\bPDF\b/g, 'P D F');
      cleanText = cleanText.replace(/\bPDFs\b/g, 'P D Fs');
      cleanText = cleanText.replace(/\bSEO\b/g, 'S E O');
      cleanText = cleanText.replace(/\bUI\b/g, 'U I');
      cleanText = cleanText.replace(/\bUX\b/g, 'U X');
      cleanText = cleanText.replace(/\bPC\b/g, 'P C');
      cleanText = cleanText.replace(/\bFAQ\b/g, 'F A Q');
      cleanText = cleanText.replace(/\b24\/7\b/g, 'twenty-four seven');
      cleanText = cleanText.replace(/&/g, ' and ');
      cleanText = cleanText.replace(/\+/g, ' plus ');
      cleanText = cleanText.replace(/%/g, ' percent ');
      cleanText = cleanText.replace(/\s+/g, ' ').trim();

      if (!cleanText) {
        options?.onEnd?.();
        return;
      }

      // Split into natural sentence chunks to support UNLIMITED speaking without browser pause limits
      const rawChunks = cleanText.match(/[^.!?\n]+[.!?\n]+|\S[^.!?\n]*/g) || [cleanText];
      const chunks = rawChunks.map((c) => c.trim()).filter((c) => c.length > 0);

      if (chunks.length === 0) {
        options?.onEnd?.();
        return;
      }

      const targetLang = options?.languageCode || 'en-US';

      // Exhaustive female name keywords prioritizing natural studio female profiles
      const femaleKeywords = [
        'natural', 'samantha', 'kore', 'victoria', 'karen', 'moira',
        'jennifer', 'jenny', 'aria', 'tessa', 'fiona', 'sara', 'hazel', 'ava',
        'allison', 'susan', 'joanna', 'kendra', 'ivy', 'salli', 'amy', 'emma',
        'olivia', 'serena', 'tanishaa', 'swara', 'ananya', 'kavya', 'aditi',
        'kalpana', 'lekha', 'sunita', 'pooja', 'priya', 'neerja', 'gul', 'uzma',
        'asma', 'ayesha', 'zehra', 'noor', 'hina', 'sana', 'mahnoor',
        'elvira', 'elena', 'laura', 'sofia', 'monica', 'paloma', 'carmen',
        'lucia', 'paulina', 'hilda', 'mia', 'dalia', 'conchita', 'penelope',
        'lupe', 'marta', 'sabina', 'ines', 'jimena', 'francisca', 'thalita',
        'yara', 'brenda', 'giovanna', 'raquel', 'fernanda', 'luciana', 'catarina',
        'joana', 'leticia', 'denise', 'brigitte', 'julie', 'celeste', 'hortense',
        'sylvie', 'audrey', 'aurelie', 'coralie', 'virginie', 'lea', 'amelie',
        'eloise', 'jacqueline', 'siwis', 'marie', 'roxane', 'elsa', 'isabella',
        'fabiola', 'alice', 'chiara', 'federica', 'paola', 'bianca', 'carla',
        'katja', 'hedda', 'amala', 'gisela', 'marlene', 'vicki', 'klara',
        'anna', 'petra', 'louisa', 'mady', 'zariyah', 'salma', 'fatima', 'amina',
        'laila', 'mariam', 'noura', 'hoda', 'mona', 'hala', 'rana', 'zeina',
        'yasmina', 'nanami', 'keiko', 'ayumi', 'haruka', 'kyoko', 'sayaka',
        'aoi', 'mayumi', 'mizuki', 'hikari', 'yuka', 'etsuko', 'mei', 'hana',
        'xiaoxiao', 'xiaoyi', 'xiaobei', 'xiaoni', 'xiaochen', 'tingting',
        'yaoyao', 'meijia', 'hanhan', 'zhiwei', 'sinji', 'hiujing', 'huihui',
        'svetlana', 'dariya', 'tatyana', 'irina', 'olga', 'milena', 'polina',
        'emel', 'filiz', 'seda', 'guler', 'bahar', 'leyla', 'ipek', 'yelda',
        'female', 'woman', 'femme', 'weiblich', 'feminino', 'femminile',
        'женский', 'महिला', 'fem'
      ];

      // Male voice identifiers strictly banned in ALL languages
      const maleKeywords = [
        'male', 'man', 'homme', 'mann', 'masculino', 'maschile', 'мужской',
        'पुरुष', '남성', '男性', 'ذكر', 'david', 'george', 'mark', 'guy',
        'richard', 'james', 'daniel', 'brian', 'steffan', 'alex', 'fred',
        'ralph', 'oliver', 'thomas', 'paul', 'albert', 'junior', 'lee',
        'tom', 'charles', 'edward', 'william', 'john', 'henry', 'arthur',
        'frank', 'harold', 'robert', 'peter', 'joseph', 'matthew', 'ryan',
        'eric', 'nathan', 'justin', 'steven', 'russell', 'sam', 'cody', 'jack',
        'bashkar', 'bashkor', 'pradeep', 'aniruddh', 'rahul', 'shuvo',
        'hemant', 'ajit', 'amit', 'ravi', 'neil', 'rohit', 'vikram',
        'ajay', 'sanjay', 'asad', 'salman', 'bilal', 'tariq', 'imran',
        'usman', 'farhan', 'diego', 'jorge', 'carlos', 'juan', 'pablo',
        'alvaro', 'enrique', 'manuel', 'raul', 'gonzalo', 'miguel', 'antonio',
        'pedro', 'javier', 'andres', 'fernando', 'rodrigo', 'duarte', 'julio',
        'ricardo', 'felipe', 'joao', 'gustavo', 'henri', 'claude', 'alain',
        'jerome', 'maurice', 'jean', 'pierre', 'antoine', 'nicolas',
        'mathieu', 'sebastien', 'cosimo', 'gianni', 'matteo', 'luca', 'marco',
        'francesco', 'alessandro', 'stefan', 'conrad', 'christoph', 'klaus',
        'hans', 'martin', 'bernd', 'florian', 'markus', 'michael', 'thorsten',
        'tarik', 'hamed', 'shakir', 'omar', 'ali', 'naayf', 'salim',
        'khalid', 'bassam', 'zayd', 'keita', 'daichi', 'naoki', 'takumi',
        'ichiro', 'kenji', 'taro', 'ken', 'shinji', 'kazuma', 'yunxi',
        'yunjian', 'yunyang', 'danny', 'zhiyu', 'yunfeng', 'yunze',
        'dmitry', 'pavel', 'aleksandr', 'maxim', 'ivan', 'boris', 'sergey',
        'vladimir', 'ahmet', 'berk', 'can', 'mustafa', 'murat', 'emre', 'kerem'
      ];

      // Scored selection algorithm: prioritize neural/natural online female voices and ban all male/robotic voices
      const getBestVoice = (): SpeechSynthesisVoice | null => {
        try {
          const availableVoices =
            this.loadedVoices.length > 0 ? this.loadedVoices : window.speechSynthesis.getVoices();
          if (!availableVoices || availableVoices.length === 0) return null;

          const basePrefix = targetLang.split(/[-_]/)[0].toLowerCase();

          // Premium modern natural/neural keywords across Edge, Chrome, Apple, Android
          const ultraNaturalKeywords = [
            'natural', 'online (natural)', 'neural', 'jenny', 'aria', 'michelle',
            'samantha (enhanced)', 'samantha (premium)', 'ava (premium)', 'ava',
            'victoria', 'sonia', 'serena', 'google uk english female', 'google us english',
            'clara', 'natasha', 'neerja', 'karen'
          ];

          // Score each voice candidate
          let bestCandidate: SpeechSynthesisVoice | null = null;
          let bestScore = -99999;

          for (const v of availableVoices) {
            const nameLower = v.name.toLowerCase();
            const langLower = v.lang.toLowerCase();

            // Strictly disqualify any male voice
            if (maleKeywords.some((kw) => nameLower.includes(kw))) {
              continue;
            }

            let score = 0;

            // Language matching
            const exactLang = langLower === targetLang.toLowerCase();
            const prefixLang = langLower.startsWith(basePrefix);

            if (exactLang) score += 500;
            else if (prefixLang) score += 300;

            // Ultra-natural neural online female voice check
            if (ultraNaturalKeywords.some((kw) => nameLower.includes(kw))) {
              score += 1000;
            }

            // General female keyword match
            if (femaleKeywords.some((kw) => nameLower.includes(kw))) {
              score += 200;
            }

            // Penalize robotic, flat legacy SAPI / desktop voices
            if (nameLower.includes('desktop') || nameLower.includes('zira') || nameLower.includes('espeak')) {
              score -= 400;
            }

            if (score > bestScore) {
              bestScore = score;
              bestCandidate = v;
            }
          }

          return bestCandidate;
        } catch (_) {
          return null;
        }
      };

      let chunkIndex = 0;
      let ended = false;
      let hasStarted = false;

      const cleanup = () => {
        if (ended) return;
        ended = true;
        if (this.speechCadenceInterval) {
          clearInterval(this.speechCadenceInterval);
          this.speechCadenceInterval = null;
        }
        if (this.speechWatchdogTimeout) {
          clearTimeout(this.speechWatchdogTimeout);
          this.speechWatchdogTimeout = null;
        }
        this.onAudioLevelCallback?.(0, 0);
        if (sessionId === undefined || sessionId === this.currentSessionId) {
          options?.onEnd?.();
        }
      };

      const speakNextChunk = () => {
        if (ended || (sessionId !== undefined && sessionId !== this.currentSessionId)) {
          cleanup();
          return;
        }

        if (chunkIndex >= chunks.length) {
          cleanup();
          return;
        }

        const chunkText = chunks[chunkIndex];
        chunkIndex++;

        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.lang = targetLang;
        // Warm, articulate, human conversational cadence (never dragged or robotic)
        utterance.rate = Math.min(1.15, Math.max(0.9, options?.rate || 0.98));
        utterance.pitch = Math.min(1.15, Math.max(0.9, options?.pitch || 1.0));

        const bestVoice = getBestVoice();
        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        // Dynamic watchdog timer for current sentence chunk
        if (this.speechWatchdogTimeout) clearTimeout(this.speechWatchdogTimeout);
        const chunkWords = chunkText.split(/\s+/).length;
        const chunkMaxDuration = Math.max(3000, (chunkWords / 2.0) * 1000 + 4000);
        this.speechWatchdogTimeout = setTimeout(() => {
          speakNextChunk();
        }, chunkMaxDuration);

        utterance.onboundary = () => {
          this.lastBoundaryTimestamp = performance.now();
        };

        utterance.onstart = () => {
          if (sessionId !== undefined && sessionId !== this.currentSessionId) {
            cleanup();
            return;
          }
          if (!hasStarted) {
            hasStarted = true;
            this.lastBoundaryTimestamp = performance.now();
            options?.onStart?.();
            if (this.speechCadenceInterval) clearInterval(this.speechCadenceInterval);
            this.speechCadenceInterval = setInterval(() => {
              const now = performance.now();
              const sinceBoundary = Math.min(450, Math.max(0, now - this.lastBoundaryTimestamp));
              const boundaryDecay = Math.exp(-sinceBoundary / 240);
              const phase = now * 0.012;
              const syllableWave = 0.25 + 0.35 * (Math.sin(phase) * 0.5 + 0.5) + 0.35 * boundaryDecay;
              const phoneme = Math.sin(phase * 1.45) * 0.5 + 0.5;
              this.onAudioLevelCallback?.(Math.min(1, syllableWave), phoneme);
            }, 45);
          }
        };

        utterance.onend = () => {
          // Natural conversational breath pause (160ms) between sentences
          setTimeout(() => {
            speakNextChunk();
          }, 160);
        };

        utterance.onerror = () => {
          setTimeout(() => {
            speakNextChunk();
          }, 80);
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNextChunk();
    } catch (e) {
      options?.onEnd?.();
    }
  }

  // Polling analyser node for real-time visualization data
  private startAnalyserPolling() {
    this.stopAnalyserPolling();
    const poll = () => {
      if (!this.analyser || !this.dataArray) return;
      this.analyser.getByteFrequencyData(this.dataArray);

      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const avg = sum / this.dataArray.length;
      const normalizedLevel = Math.min(1, avg / 128);

      const vowelBins = this.dataArray.slice(2, 16);
      let vowelSum = 0;
      for (let i = 0; i < vowelBins.length; i++) {
        vowelSum += vowelBins[i];
      }
      const phoneme = Math.min(1, vowelSum / (vowelBins.length * 140));

      this.onAudioLevelCallback?.(normalizedLevel, phoneme);
    };

    this.audioProcessInterval = window.setInterval(poll, 40);
  }

  private stopAnalyserPolling() {
    if (this.audioProcessInterval) {
      clearInterval(this.audioProcessInterval);
      this.audioProcessInterval = null;
    }
    this.onAudioLevelCallback?.(0, 0);
  }

  public stopCurrentAudio() {
    this.currentSessionId++;
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (_) {}
      this.activeAbortController = null;
    }
    this.stopCurrentAudioSource();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (this.speechCadenceInterval) {
      clearInterval(this.speechCadenceInterval);
      this.speechCadenceInterval = null;
    }
    if (this.speechWatchdogTimeout) {
      clearTimeout(this.speechWatchdogTimeout);
      this.speechWatchdogTimeout = null;
    }
    this.stopAnalyserPolling();
  }

  public getAnalyserData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  public getSpectrumBands(bandCount = 6, fallbackLevel = 0): number[] {
    if (this.analyser && this.dataArray && (this.currentSource || this.currentAudioElement)) {
      this.analyser.getByteFrequencyData(this.dataArray);
      const bands: number[] = [];
      // Focus on speech frequency range bins (bins 1..48 out of 128)
      const usableBins = Math.min(48, this.dataArray.length);
      const step = Math.max(1, Math.floor(usableBins / bandCount));
      for (let b = 0; b < bandCount; b++) {
        let sum = 0;
        const start = 1 + b * step;
        const end = Math.min(this.dataArray.length, start + step);
        for (let i = start; i < end; i++) {
          sum += this.dataArray[i];
        }
        const avg = sum / Math.max(1, end - start);
        bands.push(Math.min(1, avg / 180));
      }
      return bands;
    }

    if (fallbackLevel > 0.02) {
      return Array.from({ length: bandCount }, (_, idx) => {
        const taper = 1 - Math.abs(idx - (bandCount - 1) / 2) / (bandCount * 0.8);
        return Math.max(0.08, Math.min(1, fallbackLevel * taper));
      });
    }

    return Array(bandCount).fill(0);
  }
}

export const audioEngine = new AudioEngine();
