import React, { useState, useEffect, useRef, useCallback } from 'react';
// import './Dashboard.css'; // REMOVED: Internal CSS is now used

// Import the placeholder components
// IMPORTANT: For Dashboard.js to call methods on these child components via ref
// (e.g., profilePageRef.current.handleEditClick()),
// EACH of these components MUST be wrapped in React.forwardRef and use useImperativeHandle
// to expose the methods you intend to call.
// Example:
// export default forwardRef(function ProfilePage({ ...props }, ref) {
//   useImperativeHandle(ref, () => ({
//     handleEditClick: () => { /* ... */ },
//     handleSaveProfile: () => { /* ... */ },
//     handleCancelClick: () => { /* ... */ },
//   }));
//   return ( /* ... */ );
// });
import ProfilePage from './components/dashboard_pages/ProfilePage';
import EmergencyAlertsPage from './components/dashboard_pages/EmergencyAlertsPage';
import HealthMonitoringPage from './components/dashboard_pages/HealthMonitoringPage';
import MedicationsRemindersPage from './components/dashboard_pages/MedicationsRemindersPage';
import ConsultationsPage from './components/dashboard_pages/ConsultationsPage';
import CommunityPage from './components/dashboard_pages/CommunityPage';
import CallPage from './components/dashboard_pages/CallPage';
import HistoryPage from './components/dashboard_pages/HistoryPage';

// Internal CSS styles object
const styles = {
  // Global body styling simulation. In a real app, this would be in a global CSS or a higher-level component.
  // Here, we apply font-family and a default background gradient to the main container.
  rootBackground: {
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px', // Add some padding around the central dashboard
  },

  dashboardContainer: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    maxWidth: '900px', // Max width for a clean, centered layout
    width: '100%', // Take full width up to maxWidth
    margin: 'auto', // Center horizontally
    textAlign: 'center',
    color: '#333',

    // Basic responsiveness for container (adjust padding, width)
    '@media (max-width: 768px)': {
      padding: '25px',
      width: 'calc(100% - 30px)',
    },
    '@media (max-width: 480px)': {
      padding: '15px',
      width: 'calc(100% - 20px)',
    },
  },

  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },

  dashboardHeaderH2: {
    fontSize: '2em',
    color: '#2c3e50',
    margin: 0,
    flexGrow: 1,
    textAlign: 'left',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      fontSize: '1.5em',
      marginBottom: '15px',
      textAlign: 'center',
      width: '100%',
    },
    '@media (max-width: 480px)': {
      fontSize: '1.3em',
    },
  },

  // Button Base Styles
  btn: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease, transform 0.1s ease, box-shadow 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.08)',
    textDecoration: 'none', // Ensure text decoration is off for anchor-like buttons
  },

  // Hover and Disabled states (managed via JS state and conditional styles)
  btnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
  },
  btnDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#a0a0a0',
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none',
  },

  // Specific Button Styles
  btnBack: {
    backgroundColor: '#f0f0f0',
    color: '#555',
    border: '1px solid #ddd',
    marginBottom: '25px',
  },
  btnBackHover: {
    backgroundColor: '#e5e5e5',
    color: '#333',
  },

  btnVoiceCommand: {
    backgroundColor: '#2ecc71', // Green for voice command
    color: '#fff',
  },
  btnVoiceCommandHover: {
    backgroundColor: '#27ae60',
  },

  btnLogout: {
    backgroundColor: '#e74c3c', // Red for logout
    color: '#fff',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      marginLeft: '0',
      width: '100%', // Full width logout button on smaller screens
    },
  },

  // Dashboard Grid (for 4x4 on large screens, responsive otherwise)
  dashboardGrid: {
    display: 'grid',
    // auto-fit will create as many columns as fit (min 180px wide) within the container.
    // Given maxWidth: 900px, 4 columns (4*180px = 720px + gaps) will fit comfortably.
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '25px', // Increased space between grid items
    marginTop: '30px',
    marginBottom: '30px',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', // Smaller cards
      gap: '15px',
    },
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr', // Single column on very small screens
    },
  },

  dashboardCard: {
    background: 'linear-gradient(145deg, #f0f2f5, #e0e4eb)', // Subtle gradient
    borderRadius: '12px',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    minHeight: '140px', // Larger card size
    transition: 'all 0.3s ease',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08), 0 2px 5px rgba(0, 0, 0, 0.05)',
    border: '1px solid #dcdfe6',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      minHeight: '120px',
      padding: '20px',
    },
    '@media (max-width: 480px)': {
      minHeight: '100px',
      padding: '15px',
    },
  },

  dashboardCardHover: {
    background: 'linear-gradient(145deg, #e0e4eb, #f0f2f5)', // Invert gradient on hover
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-5px) scale(1.02)', // More pronounced lift and slight scale
  },

  cardIcon: {
    fontSize: '3.5em', // Even larger icons
    marginBottom: '12px',
    color: '#007bff', // Primary blue for icons
    transition: 'transform 0.2s ease',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      fontSize: '3em',
    },
    '@media (max-width: 480px)': {
      fontSize: '2.5em',
    },
  },

  cardIconHover: {
    transform: 'scale(1.1)', // Scale icon on hover
  },

  cardLabel: {
    fontSize: '1.1em', // Slightly larger text
    fontWeight: '600',
    color: '#34495e', // Darker text for readability
    lineHeight: '1.3',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',

    // Responsive adjustments
    '@media (max-width: 768px)': {
      fontSize: '0.95em',
    },
  },

  // Message Area Styling (consistent with Login/Register)
  messageArea: {
    marginTop: '25px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: '#f8f8f8',
    border: '1px solid #eee',
    color: '#666',
    textAlign: 'center',
    fontSize: '0.95em',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    wordBreak: 'break-word',
  },
  messageAreaError: {
    backgroundColor: '#fbecec',
    borderColor: '#e6a0a0',
    color: '#c0392b',
  },
  messageAreaSuccess: {
    backgroundColor: '#e8f9ed',
    borderColor: '#a4e0b3',
    color: '#27ae60',
  },
  messageAreaInfo: {
    backgroundColor: '#eaf6fd',
    borderColor: '#acdceb',
    color: '#2196f3',
  },
};

// Helper function to apply responsive styles based on window width
const applyResponsiveStyles = (baseStyle, windowWidth) => {
  let combinedStyle = { ...baseStyle };
  for (const key in baseStyle) {
    if (key.startsWith('@media')) {
      const mediaQuery = key.replace('@media ', '');
      let match = false;
      if (mediaQuery.includes('max-width')) {
        const maxWidth = parseInt(mediaQuery.match(/max-width:\s*(\d+)px/)[1]);
        if (windowWidth <= maxWidth) {
          match = true;
        }
      }
      // Add more media query types (min-width, etc.) if needed
      if (match) {
        combinedStyle = { ...combinedStyle, ...baseStyle[key] };
      }
      delete combinedStyle[key]; // Remove the media query key itself
    }
  }
  return combinedStyle;
};

// A component to render the main grid
const MainDashboardGrid = ({ features, handleCardClick }) => {
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getResponsiveCardStyle = (featureId) => {
    const baseCardStyle = applyResponsiveStyles(styles.dashboardCard, windowWidth);
    let currentCardStyle = { ...baseCardStyle };

    // Apply specific font size for longer labels on specific cards
    if (featureId === 'medications_reminders' || featureId === 'health_monitoring') {
      if (windowWidth > 768) { // Only apply the specific smaller size on larger screens where it fits 4 cols
          currentCardStyle.fontSize = '1em'; // Override for specific cards
      } else {
          currentCardStyle.fontSize = '0.95em'; // Keep smaller for mobile
      }
    }
    return currentCardStyle;
  };

  const getResponsiveCardIconStyle = () => applyResponsiveStyles(styles.cardIcon, windowWidth);
  const getResponsiveCardLabelStyle = () => applyResponsiveStyles(styles.cardLabel, windowWidth);
  const getResponsiveGridStyle = () => applyResponsiveStyles(styles.dashboardGrid, windowWidth);


  return (
    <div style={getResponsiveGridStyle()}>
      {features.map((feature) => (
        <div
          key={feature.id}
          style={{
            ...getResponsiveCardStyle(feature.id),
            ...(hoveredCardId === feature.id && styles.dashboardCardHover),
          }}
          onClick={() => handleCardClick(feature)}
          onMouseEnter={() => setHoveredCardId(feature.id)}
          onMouseLeave={() => setHoveredCardId(null)}
        >
          <div
            style={{
              ...getResponsiveCardIconStyle(),
              ...(hoveredCardId === feature.id && styles.cardIconHover),
            }}
          >
            {feature.icon}
          </div>
          <div
            style={{
                ...getResponsiveCardLabelStyle(),
                // Apply specific font size for longer labels directly here to override global if needed
                ...(feature.id === 'medications_reminders' || feature.id === 'health_monitoring' ? { fontSize: windowWidth > 768 ? '1em' : '0.95em' } : {}),
            }}
          >
            {feature.name}
          </div>
        </div>
      ))}
    </div>
  );
};


export default function Dashboard({ username, onLogout, generateAudio, startTemporaryListening, isListening, isSpeaking, token }) {
  const [currentDashboardPage, setCurrentDashboardPage] = useState('main');
  const [message, setMessage] = useState('');
  const [isDashboardVoiceListening, setIsDashboardVoiceListening] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null); // State for button hover effects
  const [windowWidth, setWindowWidth] = useState(window.innerWidth); // For responsive styles

  // Refs for child components
  const profilePageRef = useRef(null);
  const emergencyAlertsPageRef = useRef(null);
  const medicationsRemindersPageRef = useRef(null);
  const consultationsPageRef = useRef(null);
  const communityPageRef = useRef(null);
  const callPageRef = useRef(null);
  const healthMonitoringPageRef = useRef(null);
  const historyPageRef = useRef(null);

  const features = [
    { id: 'profile', name: 'சுயவிவரம்', icon: '👤', description: 'சுயவிவரப் பகுதி' },
    { id: 'emergency_alerts', name: 'அவசர எச்சரிக்கைகள்', icon: '📍', description: 'அவசர எச்சரிக்கை பகுதி' },
    { id: 'health_monitoring', name: 'சுகாதார கண்காணிப்பு', icon: '📋', description: 'சுகாதார கண்காணிப்பு பகுதி' },
    { id: 'medications_reminders', name: 'மருந்துகள் மற்றும் நினைவூட்டல்கள்', icon: '💊', description: 'மருந்துகள் மற்றும் நினைவூட்டல் பகுதி' },
    { id: 'consultations', name: 'ஆலோசனைகள்', icon: '🩺', description: 'ஆலோசனைப் பகுதி' },
    { id: 'community', name: 'சமூகம்', icon: '👥', description: 'சமூகப் பகுதி' },
    { id: 'call', name: 'அழைப்பு', icon: '📞', description: 'அழைப்பு பகுதி' },
    { id: 'history', name: 'வரலாறு', icon: '🖥️', description: 'வரலாற்றுப் பகுதி' },
    { id: 'logout', name: 'வெளியேறு', icon: '🔒', isLogout: true, description: 'வெளியேறுகிறது' },
  ];

  const pageComponents = {
    'profile': ProfilePage,
    'emergency_alerts': EmergencyAlertsPage,
    'medications_reminders': MedicationsRemindersPage,
    'consultations': ConsultationsPage,
    'community': CommunityPage,
    'call': CallPage,
    'health_monitoring': HealthMonitoringPage,
    'history': HistoryPage,
  };

  // Reset message and listening state when navigating between pages
  useEffect(() => {
    setMessage('');
    setIsDashboardVoiceListening(false);
  }, [currentDashboardPage]);

  // Effect to update windowWidth on resize for responsive styles
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCardClick = useCallback((feature) => {
    if (feature.isLogout) {
      generateAudio(feature.description + '. மறுபடியும் வருக.');
      // Give time for audio to play before logging out
      setTimeout(() => {
        onLogout();
      }, 1500);
    } else {
      setCurrentDashboardPage(feature.id);
      generateAudio(feature.description + ' திறக்கப்பட்டது.');
      console.log(`Dashboard: Navigating to ${feature.id}`);
    }
  }, [generateAudio, onLogout]);

  const handleDashboardVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    setMessage(`Recognized: "${command}"`);
    console.log('Dashboard: Processing voice command:', command);

    // --- ProfilePage specific commands ---
    if (currentDashboardPage === 'profile' && profilePageRef.current) {
        if (lowerCommand.includes('திருத்து') || lowerCommand.includes('edit')) {
            if (typeof profilePageRef.current.handleEditClick === 'function') {
                profilePageRef.current.handleEditClick();
                return; // Command handled, stop processing
            } else {
                console.warn("ProfilePage: handleEditClick not exposed via ref. Ensure ProfilePage uses forwardRef and useImperativeHandle.");
                generateAudio('திருத்து கட்டளை கிடைக்கவில்லை.');
            }
        }
        if (lowerCommand.includes('சேமி') || lowerCommand.includes('save')) {
             if (typeof profilePageRef.current.handleSaveProfile === 'function') {
                profilePageRef.current.handleSaveProfile();
                return;
            } else {
                console.warn("ProfilePage: handleSaveProfile not exposed via ref. Ensure ProfilePage uses forwardRef and useImperativeHandle.");
                generateAudio('சேமி கட்டளை கிடைக்கவில்லை.');
            }
        }
        if (lowerCommand.includes('ரத்து செய்') || lowerCommand.includes('cancel')) {
             if (typeof profilePageRef.current.handleCancelClick === 'function') {
                profilePageRef.current.handleCancelClick();
                return;
            } else {
                console.warn("ProfilePage: handleCancelClick not exposed via ref. Ensure ProfilePage uses forwardRef and useImperativeHandle.");
                generateAudio('ரத்து செய் கட்டளை கிடைக்கவில்லை.');
            }
        }
    }
    // --- EmergencyAlertsPage specific commands ---
    if (currentDashboardPage === 'emergency_alerts' && emergencyAlertsPageRef.current) {
        if (lowerCommand.includes('புதிய தொடர்பு') || lowerCommand.includes('add contact')) {
            if (typeof emergencyAlertsPageRef.current.handleAddContactClick === 'function') {
                emergencyAlertsPageRef.current.handleAddContactClick();
                return;
            }
        }
        if (lowerCommand.includes('சேமி தொடர்பு') || lowerCommand.includes('save contact')) {
            if (typeof emergencyAlertsPageRef.current.handleSaveContactClick === 'function') {
                emergencyAlertsPageRef.current.handleSaveContactClick();
                return;
            }
        }
        if (lowerCommand.includes('ரத்து செய் தொடர்பு') || lowerCommand.includes('cancel contact')) {
            if (typeof emergencyAlertsPageRef.current.handleCancelEditClick === 'function') {
                emergencyAlertsPageRef.current.handleCancelEditClick();
                return;
            }
        }
    }
    // --- MedicationsRemindersPage specific commands ---
    if (currentDashboardPage === 'medications_reminders' && medicationsRemindersPageRef.current) {
        if (lowerCommand.includes('புதிய மருந்து') || lowerCommand.includes('add medicine')) {
            if (typeof medicationsRemindersPageRef.current.handleAddMedicineClick === 'function') {
                medicationsRemindersPageRef.current.handleAddMedicineClick();
                return;
            }
        }
        if (lowerCommand.includes('சேமி மருந்து') || lowerCommand.includes('save medicine')) {
            if (typeof medicationsRemindersPageRef.current.handleSaveMedicineClick === 'function') {
                medicationsRemindersPageRef.current.handleSaveMedicineClick();
                return;
            }
        }
        if (lowerCommand.includes('ரத்து செய் மருந்து') || lowerCommand.includes('cancel medicine')) {
            if (typeof medicationsRemindersPageRef.current.handleCancelEditClick === 'function') {
                medicationsRemindersPageRef.current.handleCancelEditClick();
                return;
            }
        }
    }
    // --- ConsultationsPage specific commands ---
    if (currentDashboardPage === 'consultations' && consultationsPageRef.current) {
        if (lowerCommand.includes('புதிய ஆலோசனை') || lowerCommand.includes('add consultation')) {
            if (typeof consultationsPageRef.current.handleAddConsultationClick === 'function') {
                consultationsPageRef.current.handleAddConsultationClick();
                return;
            }
        }
        if (lowerCommand.includes('சேமி ஆலோசனை') || lowerCommand.includes('save consultation')) {
            if (typeof consultationsPageRef.current.handleSaveConsultationClick === 'function') {
                consultationsPageRef.current.handleSaveConsultationClick();
                return;
            }
        }
        if (lowerCommand.includes('ரத்து செய் ஆலோசனை') || lowerCommand.includes('cancel consultation')) {
            if (typeof consultationsPageRef.current.handleCancelEditClick === 'function') {
                consultationsPageRef.current.handleCancelEditClick();
                return;
            }
        }
    }
    // --- CommunityPage specific commands ---
    if (currentDashboardPage === 'community' && communityPageRef.current) {
        if (lowerCommand.includes('புதிய இடுகை') || lowerCommand.includes('new post')) {
            if (typeof communityPageRef.current.handleNewPostClick === 'function') {
                communityPageRef.current.handleNewPostClick();
                return;
            }
        }
        if (lowerCommand.includes('இடுகையைச் சேமி') || lowerCommand.includes('save post')) {
            if (typeof communityPageRef.current.handleSavePostClick === 'function') {
                communityPageRef.current.handleSavePostClick();
                return;
            }
        }
        if (lowerCommand.includes('இடுகையை ரத்து செய்') || lowerCommand.includes('cancel post')) {
            if (typeof communityPageRef.current.handleCancelPostClick === 'function') {
                communityPageRef.current.handleCancelPostClick();
                return;
            }
        }
    }
    // --- CallPage specific commands ---
    if (currentDashboardPage === 'call' && callPageRef.current) {
        if (lowerCommand.includes('புதிய தொடர்பு') || lowerCommand.includes('add contact')) {
            if (typeof callPageRef.current.handleAddContactClick === 'function') {
                callPageRef.current.handleAddContactClick();
                return;
            }
        }
        if (lowerCommand.includes('சேமி தொடர்பு') || lowerCommand.includes('save contact')) {
            if (typeof callPageRef.current.handleSaveContactClick === 'function') {
                callPageRef.current.handleSaveContactClick();
                return;
            }
        }
        if (lowerCommand.includes('ரத்து செய் தொடர்பு') || lowerCommand.includes('cancel contact')) {
            if (typeof callPageRef.current.handleCancelEditClick === 'function') {
                callPageRef.current.handleCancelEditClick();
                return;
            }
        }
    }
    // --- HealthMonitoringPage specific commands ---
    if (currentDashboardPage === 'health_monitoring' && healthMonitoringPageRef.current) {
        if (lowerCommand.includes('புதிய பதிவு') || lowerCommand.includes('add record')) {
            if (typeof healthMonitoringPageRef.current.handleAddRecordClick === 'function') {
                healthMonitoringPageRef.current.handleAddRecordClick();
                return;
            }
        }
        if (lowerCommand.includes('சேமி பதிவு') || lowerCommand.includes('save record')) {
            if (typeof healthMonitoringPageRef.current.handleSaveRecordClick === 'function') {
                healthMonitoringPageRef.current.handleSaveRecordClick();
                return;
            }
        }
        if (lowerCommand.includes('ரத்து செய் பதிவு') || lowerCommand.includes('cancel record')) {
            if (typeof healthMonitoringPageRef.current.handleCancelEditClick === 'function') {
                healthMonitoringPageRef.current.handleCancelEditClick();
                return;
            }
        }
    }

    // Universal Dashboard commands
    if (lowerCommand.includes('திரும்பிச் செல்') || lowerCommand.includes('பின் செல்') || lowerCommand.includes('back')) {
      setCurrentDashboardPage('main');
      generateAudio('முக்கியப் பகுதிக்குத் திரும்புகிறது.');
      return;
    }

    if (lowerCommand.includes('வெளியேறு') || lowerCommand.includes('logout')) {
       // Find the logout feature object and call handleCardClick
       const logoutFeature = features.find(f => f.id === 'logout');
       if (logoutFeature) {
          handleCardClick(logoutFeature);
          return;
       }
    }

    // Navigating to features from main grid (or any page)
    const matchedFeature = features.find(f => lowerCommand.includes(f.name.toLowerCase()));

    if (matchedFeature && !matchedFeature.isLogout) {
      handleCardClick(matchedFeature);
    } else {
      generateAudio('தெரியாத கட்டளை. மீண்டும் முயற்சிக்கவும்.');
      setMessage('Unknown command. Please try again.');
    }
  };

  const startListeningForDashboardCommands = () => {
    if (isListening || isSpeaking || isDashboardVoiceListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setIsDashboardVoiceListening(true);
    setMessage('🎧 டாஷ்போர்டு கட்டளைக்காக கேட்கிறது...');
    console.log('Dashboard: Directly attempting to start temporary listening for commands.');

    startTemporaryListening(
      (text) => {
        handleDashboardVoiceCommand(text);
        setIsDashboardVoiceListening(false);
      },
      (error) => {
        setMessage('Error: ' + error);
        setIsDashboardVoiceListening(false);
        generateAudio('குரல் அங்கீகாரத்தில் ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => {
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setIsDashboardVoiceListening(false);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  };

  const renderPage = () => {
    if (currentDashboardPage === 'main') {
      return <MainDashboardGrid features={features} handleCardClick={handleCardClick} />;
    }
    const ComponentToRender = pageComponents[currentDashboardPage];

    if (!ComponentToRender) {
      return <p>பக்கம் இல்லை.</p>;
    }

    let refToPass = null;
    if (currentDashboardPage === 'profile') {
        refToPass = profilePageRef;
    } else if (currentDashboardPage === 'emergency_alerts') {
        refToPass = emergencyAlertsPageRef;
    } else if (currentDashboardPage === 'medications_reminders') {
        refToPass = medicationsRemindersPageRef;
    } else if (currentDashboardPage === 'consultations') {
        refToPass = consultationsPageRef;
    } else if (currentDashboardPage === 'community') {
        refToPass = communityPageRef;
    } else if (currentDashboardPage === 'call') {
        refToPass = callPageRef;
    } else if (currentDashboardPage === 'health_monitoring') {
        refToPass = healthMonitoringPageRef;
    } else if (currentDashboardPage === 'history') {
        refToPass = historyPageRef;
    }

    return (
      <ComponentToRender
        ref={refToPass}
        username={username}
        generateAudio={generateAudio}
        startTemporaryListening={startTemporaryListening}
        isListening={isListening}
        isSpeaking={isSpeaking}
        token={token}
      />
    );
  };

  const isAnyInteractionActive = isListening || isSpeaking || isDashboardVoiceListening;

  // Function to determine message style object
  const getMessageStyle = () => {
    const baseStyle = styles.messageArea;
    if (message.startsWith('Error')) return { ...baseStyle, ...styles.messageAreaError };
    if (message.startsWith('Success')) return { ...baseStyle, ...styles.messageAreaSuccess };
    if (message.includes('கேட்கிறது') || message.includes('Recognized') || message.includes('பதிவு செய்யப்படுகிறது') || message.includes('திரும்புகிறது')) {
      return { ...baseStyle, ...styles.messageAreaInfo };
    }
    return baseStyle;
  };

  // Helper for conditional button styles based on disabled state and hover
  const getButtonStyle = (baseBtnStyle, hoverBtnStyle, buttonName) => {
    let currentStyle = { ...baseBtnStyle };
    // Apply responsive styles for base button first if needed
    if (buttonName === 'logout') {
        currentStyle = { ...currentStyle, ...applyResponsiveStyles(styles.btnLogout, windowWidth) };
    } else if (buttonName === 'back') {
        currentStyle = { ...currentStyle, ...applyResponsiveStyles(styles.btnBack, windowWidth) };
    } else if (buttonName === 'voiceCommand') {
        currentStyle = { ...currentStyle, ...applyResponsiveStyles(styles.btnVoiceCommand, windowWidth) };
    }


    if (isAnyInteractionActive) {
      currentStyle = { ...currentStyle, ...styles.btnDisabled };
    } else if (hoveredButton === buttonName) {
      currentStyle = { ...currentStyle, ...hoverBtnStyle };
    }

    return currentStyle;
  };

  return (
    <div style={styles.rootBackground}> {/* Apply global background to root */}
      <div style={applyResponsiveStyles(styles.dashboardContainer, windowWidth)}> {/* Apply container styles and make responsive */}
        <div style={applyResponsiveStyles(styles.dashboardHeader, windowWidth)}> {/* Apply header styles and make responsive */}
          <h2 style={applyResponsiveStyles(styles.dashboardHeaderH2, windowWidth)}>வணக்கம், {username}!</h2> {/* Apply h2 styles and make responsive */}
          <button
            onClick={() => handleCardClick(features.find(f => f.id === 'logout'))}
            disabled={isAnyInteractionActive}
            style={{ ...styles.btn, ...getButtonStyle(styles.btnLogout, styles.btnHover, 'logout') }} // Combine base, specific, disabled, and hover styles
            onMouseEnter={() => setHoveredButton('logout')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            🔒 வெளியேறு
          </button>
        </div>

        {currentDashboardPage !== 'main' && (
          <button
            onClick={() => {
              setCurrentDashboardPage('main');
              generateAudio('முக்கியப் பகுதிக்குத் திரும்புகிறது.');
            }}
            disabled={isAnyInteractionActive}
            style={{ ...styles.btn, ...getButtonStyle(styles.btnBack, styles.btnBackHover, 'back') }} // Combine base, specific, disabled, and hover styles
            onMouseEnter={() => setHoveredButton('back')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            ⬅️ திரும்பிச் செல்
          </button>
        )}

        {renderPage()}

        <div style={{ marginTop: '30px' }}>
          <button
            onClick={startListeningForDashboardCommands}
            disabled={isAnyInteractionActive}
            style={{ ...styles.btn, ...getButtonStyle(styles.btnVoiceCommand, styles.btnVoiceCommandHover, 'voiceCommand') }} // Combine base, specific, disabled, and hover styles
            onMouseEnter={() => setHoveredButton('voiceCommand')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {isDashboardVoiceListening ? '🎧 டாஷ்போர்டு கேட்கிறது...' : '🎙️ டாஷ்போர்டு கட்டளை'}
          </button>
          {message && (
            <p style={getMessageStyle()}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}