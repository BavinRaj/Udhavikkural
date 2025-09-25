import React from 'react';
import { FaRobot, FaMicrophoneAlt, FaPlay, FaStop } from 'react-icons/fa'; // Added FaPlay, FaStop for start button

export default function Home({ isSpeaking, isListening, hasStarted, onStart, onListen }) {
  return (
    <>
      {/* Google Fonts Import - Add this to your public/index.html <head> */}
      {/* <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" /> */}
      
      <div className="home-container">
        <div className="home-card">
          {/* Header Section with Robot Icon and Title */}
          <div className="home-header">
            <div className="robot-icon-wrapper">
              <FaRobot className="robot-icon" aria-label="உதவிக்குரல் ரோபோட் ஐகான்" />
            </div>
            <h1>உதவிக்குரல்</h1>
            <p className="tagline">உங்கள் குரல், எங்கள் உதவி. எளிதாக உலாவவும்!</p>
          </div>

          {/* Instructions Section */}
          <div className="home-instructions">
            <h3>எப்படி உபயோகிப்பது?</h3>
            <p>
              "<strong>புதிய பயனர்</strong>" என்று சொல்லி <span className="highlight-phrase">பதிவு பக்கத்திற்கு செல்லவும்</span>, <br />
              அல்லது <br />
              "<strong>லாகின்</strong>" என்று சொல்லி <span className="highlight-phrase">உள்நுழைவு பக்கத்திற்கு செல்லவும்</span>.
            </p>
          </div>

          {/* Action Buttons Section */}
          <div className="home-actions">
            <button
              onClick={onStart}
              disabled={isSpeaking || isListening}
              className={`action-button start-button ${hasStarted ? 'started' : ''}`}
            >
              {hasStarted ? (
                <>
                  <FaStop className="button-icon" /> ஈர்த்தல் முடிந்தது
                </>
              ) : (
                <>
                  <FaPlay className="button-icon" /> துவக்கவும்
                </>
              )}
            </button>

            <button
              onClick={onListen}
              disabled={!hasStarted || isListening || isSpeaking}
              className={`action-button listen-button ${isListening ? 'listening' : ''}`}
            >
              {isListening ? (
                <>
                  <FaMicrophoneAlt className="button-icon pulsing" /> கேட்கிறது...
                </>
              ) : (
                <>
                  <FaMicrophoneAlt className="button-icon" /> பேசவும்
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Internal CSS for the Home component - For a real project, put this in a separate CSS file */}
      <style jsx>{`
        :root {
          /* Gradient Colors - MUCH BRIGHTER! */
          --gradient-start: #00C9FF;   /* Vibrant Sky Blue */
          --gradient-end: #92FE9D;     /* Energetic Green */

          /* Primary & Accent Colors - Bright and Punchy */
          --primary-green-bright: #34D85A; /* Electric Green */
          --primary-blue-bright: #42A5F5;  /* Lively Blue */
          --primary-red-alert: #FF4081;   /* Striking Pink-Red for alert/listening */
          --disabled-soft-grey: #aebfd1;   /* Softer, pastel-like grey for disabled states */
          
          --text-dark: #1a1a1a;       /* Very dark for strong contrast on card */
          --text-light: #555555;      /* Darker grey for readability on card */
          --card-background: #ffffff;
          --border-color: #f0f0f0;    /* Keep subtle light border */
        }

        body {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 0;
          /* Super vibrant background gradient! */
          background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
          color: var(--text-dark);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .home-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 40px);
          padding: 20px;
          box-sizing: border-box;
          width: 100%;
        }

        .home-card {
          background-color: var(--card-background);
          border-radius: 20px; /* Even more rounded */
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25); /* Deeper, more distinct shadow */
          padding: 45px 55px; /* More generous padding */
          max-width: 550px; /* Slightly wider card */
          width: 100%;
          text-align: center;
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
          border: 1px solid rgba(255, 255, 255, 0.8); /* Subtle light border */
          position: relative; /* For potential future flourishes */
          overflow: hidden; /* Ensure shadows/gradients stay within bounds */
        }

        .home-card:hover {
          transform: translateY(-10px); /* More pronounced lift */
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35); /* Even deeper shadow on hover */
        }

        .home-header {
          margin-bottom: 40px;
          color: var(--text-dark);
        }

        .robot-icon-wrapper {
          /* Energetic purple-pink gradient for the robot icon */
          background: linear-gradient(45deg, #A85EE8 0%, #FF80A0 100%);
          border-radius: 50%;
          width: 110px; /* Slightly larger icon wrapper */
          height: 110px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 25px auto;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3); /* Prominent shadow for the icon */
        }

        .robot-icon {
          font-size: 5rem; /* Larger robot icon */
          color: white; /* White icon for maximum contrast */
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3)); /* More prominent icon shadow */
        }

        h1 {
          font-family: 'Montserrat', sans-serif;
          font-size: 3.2rem; /* Even larger, bolder title */
          margin: 0;
          color: var(--text-dark);
          font-weight: 800;
          letter-spacing: -1px; /* Tighter letter spacing for impact */
        }

        .tagline {
          font-size: 1.2rem; /* Larger, more inviting tagline */
          font-style: italic;
          color: var(--text-light);
          margin-top: 10px;
          line-height: 1.5;
        }

        .home-instructions {
          margin-top: 40px;
          padding-top: 35px;
          border-top: 1px solid var(--border-color);
          margin-bottom: 40px;
        }

        h3 {
          font-family: 'Montserrat', sans-serif;
          font-size: 1.8rem; /* Larger sub-heading */
          color: var(--text-dark);
          margin-bottom: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .home-instructions p {
          font-size: 1.15rem; /* Slightly larger instruction text */
          line-height: 1.8;
          color: var(--text-light);
        }

        .home-instructions strong {
          color: var(--primary-blue-bright); /* Use the new bright blue */
          font-weight: 700;
        }
        
        .home-instructions .highlight-phrase {
            background-color: rgba(66, 133, 244, 0.2); /* Brighter, more visible blue highlight */
            padding: 5px 10px;
            border-radius: 8px; /* More rounded highlight */
            font-weight: 600;
            color: #4285F4; /* Google Blue for highlight text */
            white-space: nowrap;
        }

        .home-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 25px; /* More space between buttons */
          margin-top: 50px;
        }

        .action-button {
          padding: 18px 30px; /* Larger, more substantial buttons */
          font-size: 1.2rem; /* Larger text in buttons */
          border-radius: 12px; /* More rounded button corners */
          border: none;
          color: white;
          cursor: pointer;
          transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease, opacity 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-grow: 1;
          max-width: 240px; /* Wider max width for buttons */
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15); /* Initial prominent shadow */
          text-shadow: 0 1px 3px rgba(0,0,0,0.3); /* Stronger text shadow for readability on bright gradients */
        }
        
        @media (max-width: 480px) {
            .action-button {
                max-width: 100%;
            }
            .home-card {
                padding: 30px; /* Reduce padding on small screens */
            }
            h1 {
                font-size: 2.5rem; /* Adjust title size for small screens */
            }
            h3 {
                font-size: 1.5rem;
            }
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-5px); /* Even more pronounced lift on hover */
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); /* Deeper shadow on hover */
        }

        .action-button:disabled {
          opacity: 0.8; /* Slightly less opaque to show underlying gradient */
          cursor: not-allowed;
          background: linear-gradient(45deg, #a7b7c7 0%, var(--disabled-soft-grey) 100%) !important; /* Ensure disabled color overrides gradients */
          box-shadow: none;
          transform: none;
          filter: grayscale(0%);
          text-shadow: none; /* Remove text shadow when disabled */
        }

        .button-icon {
          margin-right: 12px; /* More space for icons */
          font-size: 1.4rem; /* Larger icons in buttons */
        }

        /* Start Button Specifics - Brighter Greens! */
        .start-button {
          background: linear-gradient(45deg, #34D85A 0%, #6EEA8D 100%);
        }

        .start-button.started {
          background: linear-gradient(45deg, #a7b7c7 0%, var(--disabled-soft-grey) 100%); /* Softer grey gradient when 'started' */
        }

        /* Listen Button Specifics - Brighter Blues! */
        .listen-button {
          background: linear-gradient(45deg, #42A5F5 0%, #64B5F6 100%);
        }

        /* Listening Animation - Striking Pink-Red! */
        .listen-button.listening {
          background: linear-gradient(45deg, #FF4081 0%, #FF8A80 100%); /* Fiery pink-red for active listening */
        }

        /* More Dynamic Listening Animation */
        .button-icon.pulsing {
          animation: pulse 1s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Smoother, more engaging pulse */
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; } /* More exaggerated pulse */
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}