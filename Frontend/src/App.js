import React, { useState, useEffect, useRef, useCallback } from 'react';
import Home from './Home';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';

const MURF_API_KEY = 'ap2_6367dcd1-2632-4082-899e-9f9706680ada';
const VOICE_ID = 'ta-IN-iniya';

function App() {
  const [page, setPage] = useState('home');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [recognitionErrorCooldown, setRecognitionErrorCooldown] = useState(false); // State for error cooldown

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const startTimeoutRef = useRef(null); // For start recognition timeout
  const recognitionErrorCooldownTimeoutRef = useRef(null); // For network error cooldown

  const currentOnResultHandlerRef = useRef(null); // To store the global recognition.onresult handler

  // Ref to hold the latest `isListening` state for use inside callbacks
  // This helps prevent stale closures when `isListening` state changes
  const isListeningRef = useRef(isListening);
  useEffect(() => {
      isListeningRef.current = isListening;
  }, [isListening]);

  // Effect to handle persistent login (if token exists in localStorage)
  useEffect(() => {
    if (token) {
        setPage('dashboard');
    }
  }, [token]);


  const generateAudio = useCallback(async (inputText, callback = () => {}) => {
    if (!inputText.trim()) {
      callback();
      return;
    }
    console.log('App: generateAudio started for:', inputText);
    setIsSpeaking(true);
    setAudioUrl('');
    try {
      const response = await fetch('https://api.murf.ai/v1/speech/generate', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': MURF_API_KEY,
        },
        body: JSON.stringify({
          voiceId: VOICE_ID,
          style: 'Conversational',
          text: inputText,
          format: 'MP3',
          sampleRate: 44100,
          effect: 'none',
          masterSpeed: 1,
          masterPitch: 1,
          masterVolume: 10,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data.audioFile) throw new Error('No audio file returned');

      setAudioUrl(data.audioFile);
    } catch (err) {
      console.error('App: TTS API error:', err);
      setIsSpeaking(false);
      callback();
    }
  }, []);

  const processCommand = useCallback((command) => {
    if (page === 'dashboard') {
      console.log('App: Ignoring global command, dashboard is active.');
      if (isListeningRef.current && recognitionRef.current) {
         recognitionRef.current.stop(); // Stop global recognition if on dashboard
      }
      return;
    }

    const lower = command.toLowerCase();
    let responseText = '';

    if (
      lower.includes('புதிய பயனர்') ||
      lower.includes('puthiya payan') ||
      lower.includes('register')
    ) {
      setPage('register');
      responseText = 'புதிய பயனர் பதிவு பக்கம் திறக்கப்பட்டது';
    } else if (
      lower.includes('உள்நுழை') ||
      lower.includes('ulnoolai') ||
      lower.includes('login') ||
      lower.includes('லாகின்') ||
      lower.includes('இணையவும்') ||
      lower.includes('அணுகவும்')
    ) {
      setPage('login');
      responseText = 'உள்நுழைவு பக்கம் திறக்கப்பட்டது';
    } else {
      responseText = 'தயவு செய்து "புதிய பயனர்" அல்லது "லாகின்" என்று சொல்லவும்';
    }
    generateAudio(responseText);
  }, [generateAudio, page, isListeningRef]); // Added isListeningRef as dependency

  // Function to start global listening on the Home page
  const startListening = useCallback(() => {
    if (recognitionErrorCooldown) {
      console.warn('App: Cannot start global listening: currently in network error cooldown.');
      return;
    }
    if (!recognitionRef.current) {
      console.warn('App: Speech recognition not initialized.');
      return;
    }

    // Use the ref for the most current state check
    if (isListeningRef.current || isSpeaking) {
      console.warn('App: Blocking start global listening: isListening:', isListeningRef.current, 'isSpeaking:', isSpeaking);
      return;
    }

    try {
      console.log('App: Attempting to start global listening (Home page).');
      recognitionRef.current.onresult = currentOnResultHandlerRef.current; // Ensure global handler is set
      recognitionRef.current.stop(); // Ensure any previous session is stopped before starting a new one
      recognitionRef.current.start();
    } catch (e) {
      console.warn('App: Error when trying to start global listening:', e);
      // No need to setIsListening(false) here, onstart/onerror will handle it
    }
  }, [isSpeaking, isListeningRef, recognitionErrorCooldown, recognitionRef]); // Added recognitionRef as dependency


  // Main Speech Recognition setup useEffect
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech Recognition not supported. Use Chrome.');
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'ta-IN';
    recognition.continuous = false; // Global commands are generally one-shot
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('App: Speech recognition started.');
      setIsListening(true);
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };
    recognition.onend = () => {
      console.log('App: Speech recognition ended.');
      setIsListening(false);
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      // Restore default onresult handler if it was temporarily overridden
      if (recognitionRef.current && recognitionRef.current.onresult !== currentOnResultHandlerRef.current) {
        console.log('App: Restoring default onresult handler on end.');
        recognitionRef.current.onresult = currentOnResultHandlerRef.current;
      }
      // Do NOT directly restart global listening here. The dedicated home page effect will handle it.
    };
    recognition.onerror = (e) => {
      console.error('App: Speech recognition error:', e.error);
      setIsListening(false);
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      // Restore default onresult handler if it was temporarily overridden
      if (recognitionRef.current && recognitionRef.current.onresult !== currentOnResultHandlerRef.current) {
        console.log('App: Restoring default onresult handler on error.');
        recognitionRef.current.onresult = currentOnResultHandlerRef.current;
      }

      if (e.error === 'network') {
        setRecognitionErrorCooldown(true);
        console.warn('App: Network error detected. Entering cooldown for 5 seconds.');
        if (recognitionErrorCooldownTimeoutRef.current) {
          clearTimeout(recognitionErrorCooldownTimeoutRef.current);
        }
        recognitionErrorCooldownTimeoutRef.current = setTimeout(() => {
          setRecognitionErrorCooldown(false);
          recognitionErrorCooldownTimeoutRef.current = null;
          console.log('App: Network error cooldown ended.');
          // Do NOT directly restart global listening here. The dedicated home page effect will handle it.
        }, 5000); // 5-second cooldown
      }
    };

    // This is the handler for global commands on the Home page
    currentOnResultHandlerRef.current = (event) => {
      const spokenText = event.results[0][0].transcript.trim();
      console.log('App: Global command detected:', spokenText);
      processCommand(spokenText);
    };
    recognition.onresult = currentOnResultHandlerRef.current;

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current);
        }
        if (recognitionErrorCooldownTimeoutRef.current) {
          clearTimeout(recognitionErrorCooldownTimeoutRef.current);
        }
      }
    };
  }, [processCommand]); // Dependencies only for setup, state changes handled by refs and other effects


  // Audio playback effect
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.src = audioUrl;
    audioRef.current.load();
    audioRef.current.play().catch(e => {
      console.error('App: Audio playback error:', e);
      setIsSpeaking(false);
    });
  }, [audioUrl]);

  // Audio ended effect
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const onEnded = () => {
      console.log('App: Audio ended, isSpeaking set to false.');
      setIsSpeaking(false);
      // Only set hasStarted here. The dedicated home page effect will start listening.
      if (!hasStarted && page === 'home') {
          setHasStarted(true);
      }
    };

    audioEl.addEventListener('ended', onEnded);
    audioEl.addEventListener('error', onEnded);

    return () => {
      audioEl.removeEventListener('ended', onEnded);
      audioEl.removeEventListener('error', onEnded);
    };
  }, [hasStarted, page]); // Only `hasStarted` and `page` as dependencies here


  // Function to start a temporary, field-specific listening session
  const startTemporaryListening = useCallback((onResultCallback, onErrorCallback, onNoInputCallback) => {
    if (!recognitionRef.current) {
      onErrorCallback('Speech recognition not available.');
      return;
    }

    // Check global busy states using refs BEFORE attempting to stop/start
    if (isListeningRef.current || isSpeaking) {
      const errorMessage = `Cannot start temporary listening: App is busy (isListening=${isListeningRef.current}, isSpeaking=${isSpeaking}).`;
      console.warn('App:', errorMessage);
      onErrorCallback(errorMessage);
      return;
    }

    console.log('App: Preparing temporary listening session.');

    // Temporarily override recognition handlers for this specific session
    recognitionRef.current.onresult = (event) => {
      const spokenText = event.results[0][0].transcript.trim();
      console.log('App: Temporary session recognized:', spokenText);
      onResultCallback(spokenText);
      setIsListening(false);
      // Restore default handler immediately after result
      recognitionRef.current.onresult = currentOnResultHandlerRef.current;
      recognitionRef.current.onerror = null; // Clear temporary error handler
      recognitionRef.current.onend = null; // Clear temporary end handler
    };

    recognitionRef.current.onerror = (e) => {
      console.error('App: Temporary recognition error:', e.error);
      let userFriendlyError = 'பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.';
      if (e.error === 'no-speech') {
        userFriendlyError = 'நீங்கள் பேசுவதை நான் கேட்கவில்லை. மைக்ரோஃபோனை சரிபார்த்து, "🎧 கேட்கிறது..." என்று வந்தவுடன் தெளிவாகப் பேசவும்.';
      } else if (e.error === 'not-allowed') {
        userFriendlyError = 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. உங்கள் உலாவியில் மைக்ரோஃபோன் அனுமதியை சரிபார்க்கவும்.';
      } else if (e.error === 'network') {
        userFriendlyError = 'மைக்ரோஃபோன் சேவைக்கு நெட்வொர்க் இணைப்பு தேவை. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.';
      }
      onErrorCallback(userFriendlyError);

      setIsListening(false);
      // Restore default handler after error
      recognitionRef.current.onresult = currentOnResultHandlerRef.current;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
    };

    recognitionRef.current.onend = () => {
      console.log('App: Temporary recognition ended.');
      setIsListening(false);
      // If the onresult handler is still the temporary one, it means no speech was recognized
      // and no error occurred that would have already reset it.
      if (recognitionRef.current.onresult !== currentOnResultHandlerRef.current) {
        console.log('App: No input detected for temporary session, calling onNoInputCallback.');
        onNoInputCallback();
      } else {
        console.log('App: Temporary recognition ended, handler already restored by result/error.');
      }
      // Always restore default handler and clear temporary ones
      recognitionRef.current.onresult = currentOnResultHandlerRef.current;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      // Do NOT directly restart global listening here. The dedicated home page effect will handle it.
    };

    // Ensure any existing start timeout is cleared
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);

    // Start recognition after a small delay to allow UI updates
    startTimeoutRef.current = setTimeout(() => {
      try {
        if (recognitionRef.current) {
          if (isListeningRef.current) {
              console.log("App: Forcing recognition stop before new temporary session.");
              recognitionRef.current.stop();
          }
          recognitionRef.current.start();
          setIsListening(true);
          console.log('App: Temporary listening STARTED via setTimeout.');

          // Set a timeout to detect if recognition.onstart doesn't fire
          startTimeoutRef.current = setTimeout(() => {
            if (!isListeningRef.current && recognitionRef.current.onresult !== currentOnResultHandlerRef.current) {
              console.warn('App: Recognition.onstart did not fire for temporary session within time. Forcing stop.');
              recognitionRef.current.stop(); // Attempt to stop it
              onErrorCallback('மைக்ரோஃபோன் தயாராக இல்லை அல்லது தடுக்கப்பட்டுள்ளது. அனுமதியை சரிபார்த்து, மீண்டும் முயற்சிக்கவும்.');
              setIsListening(false);
              recognitionRef.current.onresult = currentOnResultHandlerRef.current; // Restore
            }
          }, 3000); // 3-second timeout for onstart to fire
        } else {
          onErrorCallback('Speech recognition not available.');
        }
      } catch (e) {
        console.error('App: Error calling recognitionRef.current.start() for temporary session:', e);
        onErrorCallback('குரல் அங்கீகாரம் தொடங்க முடியவில்லை: ' + e.message + '. மைக்ரோஃபோன் கிடைக்கிறதா மற்றும் பயன்பாட்டில் இல்லையா என்பதை உறுதிப்படுத்தவும்.');
        setIsListening(false);
        recognitionRef.current.onresult = currentOnResultHandlerRef.current; // Restore
      }
    }, 500); // Increased delay to 500ms
  }, [isSpeaking, isListeningRef, recognitionRef]); // Only core states/refs needed for useCallback deps


  const handleStart = () => {
    if (isSpeaking || isListeningRef.current) {
      console.warn('App: Cannot start welcome audio: already speaking or listening.');
      return;
    }
    const welcomeText =
      'உதவிக்குரல். உங்கள் விருப்பத்தை சொல்லுங்கள்: புதிய பயனர் பதிவு செய்ய "புதிய பயனர்" அல்லது உள்நுழைய "லாகின்" என்று சொல்லவும்.';
    generateAudio(welcomeText);
  };

  const handleLoginSuccess = (loginData) => {
    setUsername(loginData.user.username);
    setToken(loginData.token);
    localStorage.setItem('token', loginData.token);
    setPage('dashboard');
    generateAudio(`வணக்கம் ${loginData.user.username}! உங்கள் கணினி வரவேற்கிறது.`);
  };

  const handleLogout = () => {
    setUsername('');
    setToken(null);
    localStorage.removeItem('token');
    setPage('home');
    generateAudio('வெளியேறல் செயல் முடிந்தது. மறுபடியும் வருக.');
  };

  // Dedicated useEffect for starting/restarting global listening when on the home page
  useEffect(() => {
    if (page === 'home' && hasStarted && !isSpeaking && !isListening && !recognitionErrorCooldown) {
      console.log('App: Global listening triggered by home page effect.');
      startListening();
    }
    // Cleanup function: if we navigate away from home, stop global listening
    return () => {
        if (recognitionRef.current && (page !== 'home' || !hasStarted)) {
            console.log('App: Stopping global listening due to page change or !hasStarted.');
            recognitionRef.current.stop();
        }
    };
  }, [page, hasStarted, isSpeaking, isListening, recognitionErrorCooldown, startListening, recognitionRef]);


  return (
    <div
      style={{
        maxWidth: 600,
        margin: '2rem auto',
        fontFamily: 'Arial, sans-serif',
        padding: 20,
        backgroundColor: '#f0f0f5',
        borderRadius: 10,
        userSelect: 'none',
      }}
    >
      {page === 'home' && (
        <Home
          isSpeaking={isSpeaking}
          isListening={isListening}
          hasStarted={hasStarted}
          onStart={handleStart}
          onListen={startListening}
          recognitionErrorCooldown={recognitionErrorCooldown}
        />
      )}

      {page === 'register' && (
        <Register
          onBack={() => setPage('home')}
          startTemporaryListening={startTemporaryListening} // Correctly passing the function
          generateAudio={generateAudio}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />
      )}

      {page === 'login' && (
        <Login
          onBack={() => setPage('home')}
          onLoginSuccess={handleLoginSuccess}
          startTemporaryListening={startTemporaryListening}
          generateAudio={generateAudio}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />
      )}

      {page === 'dashboard' && (
        <Dashboard
          username={username}
          onLogout={handleLogout}
          generateAudio={generateAudio}
          startTemporaryListening={startTemporaryListening}
          isListening={isListening}
          isSpeaking={isSpeaking}
          token={token}
        />
      )}

      <audio ref={audioRef} style={{ display: 'none' }} />

      <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
        {isSpeaking && '🎤 பேசுகிறது...'}
        {isListening && '🎧 கேட்கிறது...'}
        {!isSpeaking && !isListening && page === 'home' && recognitionErrorCooldown && (
          <span style={{ color: 'red' }}>⚠️ பிணைய பிழை: 5 வினாடிகளுக்குப் பிறகு மீண்டும் முயற்சிக்கும்</span>
        )}
        {!isSpeaking && !isListening && page === 'home' && !recognitionErrorCooldown && 'பேசுவதற்கு துவக்க பொத்தானை அழுத்தவும்'}
        {!isSpeaking && !isListening && page !== 'home' && 'இப்போழுது கேட்கவில்லை.'}
      </div>
    </div>
  );
}

export default App;