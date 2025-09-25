import React, { useState, useEffect } from 'react';

// REMOVE THE GLOBAL RECOGNITION INSTANCE HERE
// const recognition = window.webkitSpeechRecognition ? new window.webkitSpeechRecognition() : null;
// if (recognition) recognition.lang = 'ta-IN';

// Changed prop name from `startFieldListening` to `startTemporaryListening`
export default function Register({ onBack, startTemporaryListening, generateAudio, isListening, isSpeaking }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentFieldListening, setCurrentFieldListening] = useState(null); // 'username' or 'password'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // No useEffect here for speech recognition setup - it's handled by App.js

  const startListeningForField = (field) => {
    // Block if App is already globally speaking or listening
    if (isListening || isSpeaking) {
      console.log('Register: Blocking startListeningForField because App is busy (isListening:', isListening, ', isSpeaking:', isSpeaking, ')');
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    // Reset message and set listening state
    setMessage(`🎧 ${field} க்காக கேட்கிறது...`);
    setCurrentFieldListening(field);
    console.log('Register: Directly attempting to start field listening for', field);

    // Directly call startTemporaryListening (the corrected prop name)
    // The App.js's startTemporaryListening has a small internal delay before starting recognition
    startTemporaryListening( // <--- THIS IS THE CORRECTED LINE: using the prop `startTemporaryListening`
      (text) => { // onSuccess callback from App.js
        console.log('Register: Speech recognized for', field, ':', text);
        if (field === 'username') setUsername(text);
        else if (field === 'password') setPassword(text);
        setMessage(`${field} பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null); // Reset after successful capture
        // No audio feedback here for successful field capture, as per requirement
      },
      (error) => { // onError callback from App.js
        console.error('Register: Error in field recognition for', field, ':', error);
        setMessage('Error: ' + error);
        setCurrentFieldListening(null); // Reset on error
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback from App.js (recognition ended with no result)
        console.log('Register: No input detected for field:', field);
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null); // Reset on no input
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  };


  const handleRegister = async () => {
    // Prevent multiple clicks/actions while busy
    if (isListening || isSpeaking || loading || currentFieldListening) return;

    if (!username || !password) {
      setMessage('Error: பயனர் பெயரையும் கடவுச்சொல்லையும் வழங்கவும்.');
      generateAudio('பயனர் பெயரையும் கடவுச்சொல்லையும் வழங்கவும்.');
      return;
    }
    setLoading(true);
    setMessage('பதிவு செய்யப்படுகிறது...');
    generateAudio('பதிவு செய்யப்படுகிறது.'); // This prompt is fine for the overall registration action
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMessage = data.msg || 'பதிவு தோல்வியடைந்தது';
        setMessage(`Error: ${errorMessage}`);
        generateAudio(`தவறு: ${errorMessage}`);
      } else {
        setMessage('Success: பதிவு வெற்றிகரமானது! இப்போது நீங்கள் உள்நுழையலாம்.');
        generateAudio('பதிவு வெற்றிகரமானது! இப்போது நீங்கள் உள்நுழையலாம்.');
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
      generateAudio('பிழை ஏற்பட்டது: ' + err.message);
    }
    setLoading(false);
  };

  // Determine if any button should be disabled due to active speech/listening
  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  const getMessageClass = () => {
    if (message.startsWith('Error')) return 'error';
    if (message.startsWith('Success')) return 'success';
    if (message.includes('கேட்கிறது')) return 'info';
    if (message.includes('பதிவு செய்யப்படுகிறது')) return 'info';
    return '';
  };


  return (
    <div className="register-container">
      <style>{`
        .register-container {
          max-width: 500px;
          margin: 40px auto;
          padding: 30px;
          border: 1px solid #ddd;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background-color: #fff;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }

        .register-title {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
          font-size: 1.8em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #555;
          font-size: 0.95em;
        }

        .input-field-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .input-field-wrapper input {
          flex-grow: 1;
          padding: 12px 15px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 1em;
          transition: border-color 0.3s ease;
        }

        .input-field-wrapper input:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }

        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1em;
          font-weight: bold;
          transition: background-color 0.3s ease, transform 0.1s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary {
          background-color: #3498db;
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2980b9;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background-color: #f0f0f0;
          color: #555;
          border: 1px solid #ccc;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #e0e0e0;
          transform: translateY(-1px);
        }

        .btn:disabled {
          background-color: #cccccc;
          color: #999999;
          cursor: not-allowed;
          transform: none;
        }

        .message-area {
          margin-top: 25px;
          padding: 12px;
          border-radius: 6px;
          background-color: #f8f8f8;
          border: 1px solid #eee;
          color: #666;
          text-align: center;
          font-size: 0.95em;
          min-height: 40px; /* To prevent layout shift */
          display: flex;
          align-items: center;
          justify-content: center;
          word-break: break-word; /* Ensure long messages wrap */
        }

        .message-area.error {
          background-color: #fbecec;
          border-color: #e6a0a0;
          color: #c0392b;
        }

        .message-area.success {
          background-color: #e8f9ed;
          border-color: #a4e0b3;
          color: #27ae60;
        }

        .message-area.info {
          background-color: #eaf6fd;
          border-color: #acdceb;
          color: #2196f3;
        }

        .action-buttons {
          margin-top: 30px;
          display: flex;
          gap: 15px;
          justify-content: center;
        }
      `}</style>

      <h3 className="register-title">
        📝 புதிய பயனர் பதிவு (Register)
      </h3>

      <div className="form-group">
        <label htmlFor="username">பயனர் பெயர் (Username):</label>
        <div className="input-field-wrapper">
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={isAnyInteractionActive}
            placeholder="உங்கள் பயனர் பெயரை உள்ளிடவும்"
          />
          <button
            className="btn btn-secondary"
            disabled={isAnyInteractionActive}
            onClick={() => startListeningForField('username')}
          >
            {currentFieldListening === 'username' ? '🎧 கேட்கிறது...' : '🎙️ Speak Username'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="password">கடவுச்சொல் (Password):</label>
        <div className="input-field-wrapper">
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isAnyInteractionActive}
            placeholder="உங்கள் கடவுச்சொல்லை உள்ளிடவும்"
          />
          <button
            className="btn btn-secondary"
            disabled={isAnyInteractionActive}
            onClick={() => startListeningForField('password')}
          >
            {currentFieldListening === 'password' ? '🎧 கேட்கிறது...' : '🎙️ Speak Password'}
          </button>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={handleRegister}
          disabled={isAnyInteractionActive}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          disabled={isAnyInteractionActive}
        >
          ⬅️ Back
        </button>
      </div>

      {message && (
        <p className={`message-area ${getMessageClass()}`}>
          {message}
        </p>
      )}
    </div>
  );
}