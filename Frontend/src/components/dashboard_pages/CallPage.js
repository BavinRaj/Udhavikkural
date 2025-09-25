import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { FaPhone, FaWhatsapp, FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa'; // Import icons, added FaTimes for cancel

// Internal CSS-in-JS styles for CallPage
const callPageStyles = {
  container: {
    padding: '20px',
    backgroundColor: '#f0f8ff',
    border: '1px solid #d9edf7',
    borderRadius: '8px',
    marginTop: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: '1.8em',
    color: '#007bff',
    marginBottom: '15px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1em',
    color: '#555',
    marginBottom: '25px',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: '40px 20px',
    backgroundColor: '#f0f8ff',
    border: '1px solid #d9edf7',
    borderRadius: '8px',
    marginTop: '20px',
    textAlign: 'center',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #d9edf7',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px',
  },
  noContactsContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '2px dashed #ddd',
    color: '#666',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  noContactsIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    color: '#007bff',
  },
  noContactsTitle: {
    color: '#333',
    marginBottom: '10px',
  },
  contactListHeader: {
    marginBottom: '15px',
    color: '#007bff',
    fontSize: '1.2em',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  },
  contactItem: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid #eee',
    borderRadius: '6px',
    marginBottom: '10px',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  contactItemHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  contactInfo: {
    flex: '1 1 180px',
    marginBottom: '5px',
    fontSize: '1em',
  },
  contactActions: {
    flex: '0 0 auto',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap', // Allow buttons to wrap on smaller screens
    marginTop: '5px',
  },
  buttonBase: {
    padding: '8px 15px',
    borderRadius: '5px',
    border: 'none',
    fontSize: '0.9em',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    textDecoration: 'none', // For anchor-like buttons
  },
  // Specific button base colors
  buttonPrimary: { backgroundColor: '#007bff', color: 'white' },
  buttonSuccess: { backgroundColor: '#28a745', color: 'white' },
  buttonWarning: { backgroundColor: '#ffc107', color: '#333' },
  buttonDanger: { backgroundColor: '#dc3545', color: 'white' },
  buttonInfo: { backgroundColor: '#6c757d', color: 'white' }, // For cancel
  // Hover colors
  buttonPrimaryHover: { backgroundColor: '#0056b3' },
  buttonSuccessHover: { backgroundColor: '#218838' },
  buttonWarningHover: { backgroundColor: '#e0a800' },
  buttonDangerHover: { backgroundColor: '#c82333' },
  buttonInfoHover: { backgroundColor: '#5a6268' },

  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  linkButtonBase: { // Base for links styled as buttons
    padding: '8px 15px',
    borderRadius: '5px',
    border: '1px solid', // Border color will be set by specific link styles
    fontSize: '0.9em',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    textDecoration: 'none',
    textAlign: 'center', // Ensure text centers for consistency
  },
  callLink: {
    color: '#28a745',
    borderColor: '#28a745',
    backgroundColor: '#e6ffe6',
  },
  whatsappLink: {
    color: '#25D366',
    borderColor: '#25D366',
    backgroundColor: '#e6ffe6',
  },
  // Link Hover styles
  callLinkHover: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  whatsappLinkHover: {
    backgroundColor: '#25D366',
    color: 'white',
  },

  formContainer: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginTop: '20px',
  },
  formTitle: {
    marginTop: '0',
    marginBottom: '20px',
    color: '#007bff',
    fontSize: '1.3em',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333',
  },
  inputFieldWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  input: {
    flexGrow: 1,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1em',
    transition: 'border-color 0.2s ease',
    '&:focus': { // Note: Pseudo-classes like :focus won't work directly here. Handled by JS.
      outline: 'none',
      borderColor: '#007bff',
      boxShadow: '0 0 0 2px rgba(0,123,255,0.25)',
    },
  },
  messageArea: {
    marginTop: '15px',
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
  // Keyframe for spin animation (needs to be injected into a style tag or global CSS)
  // This will be handled by injecting a <style> tag in the loading component.
};

// Helper function for responsive styles (re-using from Dashboard.js logic)
// For a fully robust solution, this might be a custom hook or styled-components
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
      if (match) {
        combinedStyle = { ...combinedStyle, ...baseStyle[key] };
      }
      delete combinedStyle[key]; // Remove the media query key itself
    }
  }
  return combinedStyle;
};


const CallPage = forwardRef(({ generateAudio, startTemporaryListening, isListening, isSpeaking, token }, ref) => {
  const [generalContacts, setGeneralContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', number: '' });
  const [editingContactId, setEditingContactId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentFieldListening, setCurrentFieldListening] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth); // For responsive styles

  const hasFetchedContacts = useRef(false);

  // Refs for volatile props/state to stabilize voice logic
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);

  // Update refs whenever the props/state they mirror change
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Effect to update windowWidth on resize for responsive styles
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Expose methods to parent (Dashboard) via ref for voice commands
  useImperativeHandle(ref, () => ({
    handleAddContactClick: () => handleAddContactClick(), // Wrap to ensure no args are passed by voice
    handleSaveContactClick: () => handleSaveContact(),   // Wrap to ensure no args are passed by voice
    handleCancelEditClick: () => handleCancelEdit(),     // Wrap to ensure no args are passed by voice
  }));


  // Fetch general contacts on component mount
  const fetchGeneralContacts = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      setInitialLoading(false);
      return;
    }

    // Only show "loading" message if not initial load to avoid flickering on fast connections
    if (!initialLoading) {
      setLoading(true);
      setMessage('தொடர்புகளைப் பெறுகிறது...');
    }
    console.log('CallPage: Fetching general contacts...');
    try {
      const res = await fetch('http://localhost:5000/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'தொடர்புகளைப் பெற முடியவில்லை');
      }
      setGeneralContacts(data.generalContacts || []);
      setMessage('தொடர்புகள் ஏற்றப்பட்டன.');

      // Logic to show/hide form on initial load based on contacts
      if (!hasFetchedContacts.current) {
         if (!data.generalContacts || data.generalContacts.length === 0) {
            generateAudio('தற்போது எந்த தொடர்புகளும் இல்லை. புதிய தொடர்பைச் சேர்க்கவும்.');
            setShowForm(true); // Show form if no contacts on initial load
         } else {
            setShowForm(false); // Hide form if contacts exist on initial load
         }
         hasFetchedContacts.current = true;
      }
    } catch (err) {
      console.error('CallPage: Error fetching general contacts:', err);
      setMessage('Error: தொடர்புகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: தொடர்புகளைப் பெற முடியவில்லை.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [token, generateAudio, initialLoading]);

  // Effect to run fetch on component mount
  useEffect(() => {
    if (!hasFetchedContacts.current) { // Only fetch once initially
      fetchGeneralContacts();
    }
  }, [fetchGeneralContacts]);

  // Handler for form input changes (for new/editing contact)
  const handleContactInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewContact(prev => ({ ...prev, [name]: value }));
  }, []);

  // Callback to start speech recognition for a specific field
  const startListeningForField = useCallback((field, promptText) => {
    if (isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening(field);
    setMessage(`🎧 ${promptText} க்காக கேட்கிறது...`);
    console.log(`CallPage: Starting listening for ${field}`);

    startTemporaryListening(
      (text) => { // onResult callback
        console.log(`CallPage: Speech recognized for ${field}:`, text);
        setNewContact(prev => ({ ...prev, [field]: text }));
        setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null);
      },
      (error) => { // onError callback
        console.error(`CallPage: Error in recognition for ${field}:`, error);
        setMessage('Error: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log(`CallPage: No input detected for ${field}.`);
        setMessage('Info: உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [currentFieldListening, startTemporaryListening, generateAudio, isListeningRef, isSpeakingRef]);


  // Add/Update Contact API call
  const handleSaveContact = useCallback(async () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
      return; // Already busy, don't re-trigger. Message is handled by calling component.
    }
    if (!newContact.name.trim() || !newContact.number.trim()) {
        generateAudio('பெயர் மற்றும் எண் தேவை. தயவுசெய்து அவற்றை உள்ளிடவும்.');
        setMessage('Error: பெயர் மற்றும் எண் தேவை.');
        return;
    }

    setLoading(true);
    setMessage(editingContactId ? 'தொடர்பு புதுப்பிக்கப்படுகிறது...' : 'புதிய தொடர்பு சேர்க்கப்படுகிறது...');
    generateAudio(editingContactId ? 'தொடர்பு புதுப்பிக்கப்படுகிறது.' : 'புதிய தொடர்பு சேர்க்கப்படுகிறது.');
    console.log('CallPage: Saving contact:', newContact);

    try {
      const method = editingContactId ? 'PUT' : 'POST';
      const url = editingContactId
        ? `http://localhost:5000/api/profile/general-contacts/${editingContactId}`
        : 'http://localhost:5000/api/profile/general-contacts';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'தொடர்பைச் சேமிக்க முடியவில்லை');
      }

      setGeneralContacts(data);
      setNewContact({ name: '', number: '' });
      setEditingContactId(null);
      setMessage('Success: தொடர்பு வெற்றிகரமாக சேமிக்கப்பட்டது!');
      generateAudio('தொடர்பு வெற்றிகரமாக சேமிக்கப்பட்டது!');
      setShowForm(false); // Hide form after successful save
    } catch (err) {
      console.error('CallPage: Error saving contact:', err);
      setMessage('Error: தொடர்பைச் சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: தொடர்பைச் சேமிக்க முடியவில்லை.');
    } finally {
      setLoading(false);
    }
  }, [loading, isListeningRef, isSpeakingRef, currentFieldListening, newContact, editingContactId, token, generateAudio]);

  // Delete Contact API call
  const handleDeleteContact = useCallback(async (contactId, contactName) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;

    if (!window.confirm(`"${contactName}" என்ற தொடர்பை நீக்க வேண்டுமா?`)) {
      return;
    }

    setLoading(true);
    setMessage('தொடர்பு நீக்கப்படுகிறது...');
    generateAudio('தொடர்பு நீக்கப்படுகிறது.');
    console.log('CallPage: Deleting contact:', contactId);

    try {
      const res = await fetch(`http://localhost:5000/api/profile/general-contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'தொடர்பை நீக்க முடியவில்லை');
      }
      setGeneralContacts(data);
      setMessage('Success: தொடர்பு வெற்றிகரமாக நீக்கப்பட்டது!');
      generateAudio('தொடர்பு வெற்றிகரமாக நீக்கப்பட்டது!');
      if (data.length === 0) {
          setShowForm(true); // If list becomes empty after delete, show form
      }
    } catch (err) {
      console.error('CallPage: Error deleting contact:', err);
      setMessage('Error: தொடர்பை நீக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: தொடர்பை நீக்க முடியவில்லை.');
    } finally {
      setLoading(false);
    }
  }, [loading, isListeningRef, isSpeakingRef, currentFieldListening, token, generateAudio]);

  // Start editing an existing contact
  const handleEditClick = useCallback((contact) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewContact({ name: contact.name, number: contact.number });
    setEditingContactId(contact._id);
    setMessage(`Info: "${contact.name}" திருத்தப்படுகிறது...`);
    generateAudio(`"${contact.name}" திருத்தப்படுகிறது.`);
    setShowForm(true); // Show form when editing
  }, [loading, isListeningRef, isSpeakingRef, currentFieldListening, generateAudio]);

  // Cancel adding or editing a contact
  const handleCancelEdit = useCallback(() => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewContact({ name: '', number: '' });
    setEditingContactId(null);
    setMessage('Info: திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    generateAudio('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    setShowForm(false); // Hide form on cancel
  }, [loading, isListeningRef, isSpeakingRef, currentFieldListening, generateAudio]);

  // Voice command action for adding a contact (exposed via ref)
  const handleAddContactClick = useCallback(() => {
      if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewContact({ name: '', number: '' }); // Clear form for new entry
      setEditingContactId(null); // Ensure not in edit mode
      setMessage('Info: புதிய தொடர்பைச் சேர்க்கவும்.');
      generateAudio('புதிய தொடர்பைச் சேர்க்கவும். பெயர் மற்றும் எண்ணைச் சொல்லவும்.');
      setShowForm(true); // Show form via voice command
  }, [loading, isListeningRef, isSpeakingRef, currentFieldListening, generateAudio]);

  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  // Helper to determine message style
  const getMessageStyle = () => {
    const baseStyle = callPageStyles.messageArea;
    if (message.startsWith('Error')) return { ...baseStyle, ...callPageStyles.messageAreaError };
    if (message.startsWith('Success')) return { ...baseStyle, ...callPageStyles.messageAreaSuccess };
    if (message.startsWith('Info')) return { ...baseStyle, ...callPageStyles.messageAreaInfo };
    if (message.includes('கேட்கிறது') || message.includes('பதிவு செய்யப்படுகிறது') || message.includes('நீக்கப்படுகிறது')) {
      return { ...baseStyle, ...callPageStyles.messageAreaInfo };
    }
    return baseStyle;
  };

  // Helper to get button styles, considering disabled state
  const getButtonCombinedStyle = useCallback((baseStyle, hoverStyle, disabled = false) => {
    return {
      ...callPageStyles.buttonBase,
      ...baseStyle,
      ...(disabled ? callPageStyles.buttonDisabled : {}),
      // Hover styles are applied by the ContactListItem sub-component or directly via onMouseEnter/Leave
      // For standalone buttons, you'd manage local hover state.
    };
  }, []); // No dependencies needed, styles are static objects

  // Helper to get link styles, considering disabled state
  const getLinkCombinedStyle = useCallback((baseStyle, hoverStyle, disabled = false) => {
    return {
      ...callPageStyles.linkButtonBase,
      ...baseStyle,
      ...(disabled ? callPageStyles.buttonDisabled : { pointerEvents: 'auto' }), // Explicitly disable pointer events for links
    };
  }, []); // No dependencies needed, styles are static objects


  if (initialLoading) {
    return (
      <div style={callPageStyles.loadingContainer}>
        <div style={callPageStyles.spinner}></div>
        {/* Inject keyframes into the DOM for the spinner animation */}
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <h3>📞 அழைப்பு பக்கம்</h3>
        <p>தொடர்புகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={callPageStyles.container}>
      <h3 style={callPageStyles.title}>📞 அழைப்பு பக்கம்</h3>
      <p style={callPageStyles.subtitle}>உங்கள் பொதுவான தொடர்புகளை இங்கே நிர்வகிக்கலாம் மற்றும் அழைக்கலாம்.</p>

      {/* General Contacts List Section */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={callPageStyles.contactListHeader}>உங்கள் தொடர்புகள்:</h4>
        {generalContacts.length === 0 && !showForm ? (
          <div style={callPageStyles.noContactsContainer}>
            <div style={callPageStyles.noContactsIcon}><FaPhone /></div>
            <h4 style={callPageStyles.noContactsTitle}>தொடர்புகள் எதுவும் இல்லை</h4>
            <p style={{ marginBottom: '20px' }}>தற்போது எந்த தொடர்புகளும் சேர்க்கப்படவில்லை.</p>
            <button
              onClick={handleAddContactClick}
              disabled={isAnyInteractionActive}
              style={{
                ...getButtonCombinedStyle(callPageStyles.buttonPrimary, callPageStyles.buttonPrimaryHover, isAnyInteractionActive),
                padding: '12px 24px', // Larger button for initial add
                fontSize: '16px',
              }}
            >
              <FaPlus style={{ marginRight: '8px' }} /> முதல் தொடர்பைச் சேர்க்கவும்
            </button>
          </div>
        ) : (
          <>
            {generalContacts.length > 0 && (
              <ul style={{ listStyleType: 'none', padding: '0' }}>
                {generalContacts.map((contact) => (
                  <ContactListItem
                    key={contact._id}
                    contact={contact}
                    isAnyInteractionActive={isAnyInteractionActive}
                    handleEditClick={handleEditClick}
                    handleDeleteContact={handleDeleteContact}
                    windowWidth={windowWidth}
                    getButtonCombinedStyle={getButtonCombinedStyle}
                    getLinkCombinedStyle={getLinkCombinedStyle}
                  />
                ))}
              </ul>
            )}
            {generalContacts.length > 0 && !showForm && (
              <button
                onClick={handleAddContactClick}
                disabled={isAnyInteractionActive}
                style={{
                  ...getButtonCombinedStyle(callPageStyles.buttonPrimary, callPageStyles.buttonPrimaryHover, isAnyInteractionActive),
                  marginTop: '10px'
                }}
              >
                <FaPlus style={{ marginRight: '8px' }} /> மேலும் தொடர்பு சேர்க்கவும்
              </button>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Contact Form Section - Only show when showForm is true */}
      {showForm && (
        <div style={callPageStyles.formContainer}>
          <h4 style={callPageStyles.formTitle}>{editingContactId ? 'தொடர்பைத் திருத்து' : 'புதிய தொடர்பைச் சேர்'}:</h4>
          <div style={callPageStyles.formGroup}>
            <label htmlFor="contactName" style={callPageStyles.label}>பெயர் (Name):</label>
            <div style={callPageStyles.inputFieldWrapper}>
              <input
                id="contactName"
                type="text"
                name="name"
                value={newContact.name}
                onChange={handleContactInputChange}
                disabled={isAnyInteractionActive}
                style={callPageStyles.input}
              />
              <button
                onClick={() => startListeningForField('name', 'தொடர்பு பெயர்')}
                disabled={isAnyInteractionActive}
                style={getButtonCombinedStyle(callPageStyles.buttonPrimary, callPageStyles.buttonPrimaryHover, isAnyInteractionActive)}
              >
                {currentFieldListening === 'name' ? '🎧 கேட்கிறது...' : '🎙️ பெயர்'}
              </button>
            </div>
          </div>
          <div style={callPageStyles.formGroup}>
            <label htmlFor="contactNumber" style={callPageStyles.label}>எண் (Number):</label>
            <div style={callPageStyles.inputFieldWrapper}>
              <input
                id="contactNumber"
                type="text"
                name="number"
                value={newContact.number}
                onChange={handleContactInputChange}
                disabled={isAnyInteractionActive}
                style={callPageStyles.input}
              />
              <button
                onClick={() => startListeningForField('number', 'தொடர்பு எண்')}
                disabled={isAnyInteractionActive}
                style={getButtonCombinedStyle(callPageStyles.buttonPrimary, callPageStyles.buttonPrimaryHover, isAnyInteractionActive)}
              >
                {currentFieldListening === 'number' ? '🎧 கேட்கிறது...' : '🎙️ எண்'}
              </button>
            </div>
          </div>
          <button
            onClick={handleSaveContact}
            disabled={isAnyInteractionActive || !newContact.name.trim() || !newContact.number.trim()}
            style={{
              ...getButtonCombinedStyle(callPageStyles.buttonSuccess, callPageStyles.buttonSuccessHover, isAnyInteractionActive || !newContact.name.trim() || !newContact.number.trim()),
              marginRight: '10px',
              fontSize: '16px',
            }}
          >
            {loading ? 'சேமிக்கிறது...' : '💾 சேமி'}
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={isAnyInteractionActive}
            style={{
              ...getButtonCombinedStyle(callPageStyles.buttonInfo, callPageStyles.buttonInfoHover, isAnyInteractionActive),
              fontSize: '16px',
            }}
          >
            <FaTimes style={{ marginRight: '5px' }} /> ரத்து செய்
          </button>
        </div>
      )}

      {message && <p style={getMessageStyle()}>{message}</p>}
    </div>
  );
});


// Helper component for each contact list item to handle hover state individually
const ContactListItem = ({ contact, isAnyInteractionActive, handleEditClick, handleDeleteContact, getButtonCombinedStyle, getLinkCombinedStyle }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li
      style={{
        ...callPageStyles.contactItem,
        ...(isHovered && callPageStyles.contactItemHover),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={callPageStyles.contactInfo}>
        <strong>{contact.name}:</strong> {contact.number}
      </div>
      <div style={callPageStyles.contactActions}>
        {/* Call Button */}
        <a
          href={`tel:${contact.number}`}
          style={getLinkCombinedStyle(callPageStyles.callLink, callPageStyles.callLinkHover, isAnyInteractionActive)}
          aria-disabled={isAnyInteractionActive}
        >
          <FaPhone /> அழைப்பு
        </a>
        {/* WhatsApp Button */}
        <a
          href={`https://wa.me/${contact.number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={getLinkCombinedStyle(callPageStyles.whatsappLink, callPageStyles.whatsappLinkHover, isAnyInteractionActive)}
          aria-disabled={isAnyInteractionActive}
        >
          <FaWhatsapp /> WhatsApp
        </a>
        <button
          onClick={() => handleEditClick(contact)}
          disabled={isAnyInteractionActive}
          style={getButtonCombinedStyle(callPageStyles.buttonWarning, callPageStyles.buttonWarningHover, isAnyInteractionActive)}
        >
          <FaEdit /> திருத்து
        </button>
        <button
          onClick={() => handleDeleteContact(contact._id, contact.name)}
          disabled={isAnyInteractionActive}
          style={getButtonCombinedStyle(callPageStyles.buttonDanger, callPageStyles.buttonDangerHover, isAnyInteractionActive)}
        >
          <FaTrash /> நீக்கு
        </button>
      </div>
    </li>
  );
};


export default CallPage;