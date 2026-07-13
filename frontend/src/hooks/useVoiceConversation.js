import { useState, useEffect, useRef, useCallback } from 'react';

const useVoiceConversation = (onCommand, onResponse) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const pauseRecognitionRef = useRef(false);
  const lastFinalTranscriptRef = useRef('');

  // Initialize Web Speech API for Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      setIsVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      isRecognizingRef.current = true;
      console.log('[VOICE] Speech recognition started');
    };

    recognition.onend = () => {
      console.log('[VOICE] Speech recognition ended');
      isRecognizingRef.current = false;

      if (pauseRecognitionRef.current) {
        pauseRecognitionRef.current = false;
        setIsListening(false);
        return;
      }

      if (isListeningRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          try {
            if (recognitionRef.current && !isRecognizingRef.current && isListeningRef.current) {
              recognitionRef.current.start();
            }
          } catch (err) {
            console.warn('[VOICE] Failed to auto-restart recognition:', err);
          }
        }, 50);
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // Process final commands
      if (finalTranscript && onCommand) {
        const trimmedText = finalTranscript.trim();
        if (!trimmedText || trimmedText === lastFinalTranscriptRef.current) {
          return;
        }
        lastFinalTranscriptRef.current = trimmedText;

        if (isSpeakingRef.current) {
          console.log('[VOICE] Interruption detected. Stopping ongoing speech.');
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        }
        
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          onCommand(trimmedText);
          // Stop recognition to clear the buffer; it will auto-restart via onend
          if (recognitionRef.current && isRecognizingRef.current) {
            recognitionRef.current.stop();
          }
        }, 100);
      }
    };

    recognition.onerror = (event) => {
      // Ignore no-speech errors as they're normal during silence
      if (event.error === 'no-speech') {
        console.log('[VOICE] No speech detected, continuing to listen...');
        return;
      }
      if (event.error === 'not-allowed') {
        console.error('[VOICE] Microphone permission denied');
        setIsVoiceSupported(false);
        return;
      }
      console.error('[VOICE] Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onCommand]);

  // Initialize Web Audio API for Voice Activity Detection (VAD)
  const initializeAudioContext = useCallback(async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = source;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);

      // Start monitoring audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const monitorAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Normalize to 0-1 range
        const normalizedLevel = average / 255;
        setAudioLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };

      monitorAudioLevel();

      return stream;
    } catch (error) {
      console.error('[VOICE] Error initializing audio context:', error);
      setIsVoiceSupported(false);
      return null;
    }
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isVoiceSupported) {
      console.warn('[VOICE] Voice features not supported');
      return;
    }

    try {
      isListeningRef.current = true;
      pauseRecognitionRef.current = false;
      setIsListening(true);
      
      // Initialize audio context for VAD
      await initializeAudioContext();

      // Start speech recognition with retry logic
      if (recognitionRef.current && !isRecognizingRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.warn('[VOICE] Recognition already started, retrying...');
          setTimeout(() => {
            if (recognitionRef.current && !isRecognizingRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('[VOICE] Error starting listening:', error);
      setIsListening(false);
    }
  }, [isVoiceSupported, initializeAudioContext]);

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    pauseRecognitionRef.current = false;
    if (recognitionRef.current && isRecognizingRef.current) {
      recognitionRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(err => {
        console.warn('[VOICE] Error closing audio context:', err);
      });
    }

    setIsListening(false);
    setAudioLevel(0);
  }, []);

  // Speak text using Speech Synthesis API
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) {
      console.warn('[VOICE] Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Load voices and select a good one
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && (
          voice.name.includes('Google') || 
          voice.name.includes('Natural') ||
          voice.name.includes('Samantha') ||
          voice.name.includes('Daniel') ||
          voice.name.includes('Microsoft') ||
          voice.name.includes('Zira') ||
          voice.name.includes('Karen')
        )
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else if (voices.length > 0) {
        // Fallback to first English voice
        const englishVoice = voices.find(v =>(v.lang.includes('en')));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    };

    // Voices load asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      pauseRecognitionRef.current = true;
      if (recognitionRef.current && isRecognizingRef.current) {
        recognitionRef.current.stop();
      }
      console.log('[VOICE] Speaking:', text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      pauseRecognitionRef.current = false;
      console.log('[VOICE] Finished speaking');
      if (onResponse) {
        onResponse();
      }
      // Delay restart to avoid immediate re-trigger
      setTimeout(() => {
        if (isListeningRef.current && recognitionRef.current && !isRecognizingRef.current) {
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.warn('[VOICE] Failed to restart recognition after speech:', err);
          }
        }
      }, 500);
    };

    utterance.onerror = (event) => {
      console.error('[VOICE] Speech synthesis error:', event.error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      pauseRecognitionRef.current = false;
    };
  }, [onResponse]);

  // Interrupt current speech
  const interruptSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      console.log('[VOICE] Speech interrupted');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopListening]);

  return {
    isListening,
    isSpeaking,
    transcript,
    audioLevel,
    isVoiceSupported,
    startListening,
    stopListening,
    speak,
    interruptSpeech,
  };
};

export default useVoiceConversation;
