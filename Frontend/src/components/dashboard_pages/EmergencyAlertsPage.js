// src/components/dashboard_pages/EmergencyAlertsPage.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';

// Using forwardRef to allow parent (Dashboard) to call methods on this component
const EmergencyAlertsPage = forwardRef(({ generateAudio, startTemporaryListening, isListening, isSpeaking, token }, ref) => {
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', number: '' });
  const [editingContactId, setEditingContactId] = useState(null); // ID of contact being edited
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentFieldListening, setCurrentFieldListening] = useState(null); // 'name' or 'number' for current voice input

  const hasFetchedContacts = useRef(false); // To prevent redundant initial audio prompts

  // Expose methods to parent (Dashboard) via ref
  useImperativeHandle(ref, () => ({
    handleAddContactClick: handleAddContactClick,
    handleSaveContactClick: handleSaveContact, // Map to save (add/edit)
    handleCancelEditClick: handleCancelEdit,   // Map to cancel add/edit
    // For "edit [name]" or "delete [name]", more sophisticated parsing
    // would be needed in Dashboard.js and then calling a method like
    // handleVoiceEdit(name) or handleVoiceDelete(name) here.
    // For now, we'll keep it to basic actions.
  }));

  // Fetch emergency contacts on component mount
  const fetchEmergencyContacts = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      return;
    }
    setLoading(true);
    setMessage('அவசர தொடர்புகளைப் பெறுகிறது...');
    console.log('EmergencyAlertsPage: Fetching contacts...');
    try {
      // Fetch full profile to get contacts from the `emergencyContacts` array
      const res = await fetch('http://localhost:5000/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'அவசர தொடர்புகளைப் பெற முடியவில்லை');
      }
      setEmergencyContacts(data.emergencyContacts || []);
      setMessage('அவசர தொடர்புகள் ஏற்றப்பட்டன.');
      if (data.emergencyContacts && data.emergencyContacts.length === 0 && !hasFetchedContacts.current) {
         generateAudio('தற்போது அவசர தொடர்புகள் எதுவும் இல்லை. புதிய தொடர்பைச் சேர்க்கவும்.');
      }
      hasFetchedContacts.current = true; // Mark as fetched
    } catch (err) {
      console.error('EmergencyAlertsPage: Error fetching contacts:', err);
      setMessage('பிழை: அவசர தொடர்புகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: அவசர தொடர்புகளைப் பெற முடியவில்லை.');
    }
    setLoading(false);
  }, [token, generateAudio]);

  // Effect to run fetch on component mount
  useEffect(() => {
    fetchEmergencyContacts();
  }, [fetchEmergencyContacts]);

  // Handler for form input changes (for new/editing contact)
  const handleContactInputChange = (e) => {
    const { name, value } = e.target;
    setNewContact(prev => ({ ...prev, [name]: value }));
  };

  // Callback to start speech recognition for a specific field (contact name/number)
  const startListeningForField = useCallback((field, promptText) => {
    if (isListening || isSpeaking || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening(field); // Indicate which field is currently active for voice input
    setMessage(`🎧 ${promptText} க்காக கேட்கிறது...`);
    console.log(`EmergencyAlertsPage: Starting listening for ${field}`);

    startTemporaryListening( // Use the generic listener from App.js
      (text) => { // onResult callback
        console.log(`EmergencyAlertsPage: Speech recognized for ${field}:`, text);
        setNewContact(prev => ({ ...prev, [field]: text })); // Update the newContact state
        setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null); // Reset after successful capture
      },
      (error) => { // onError callback
        console.error(`EmergencyAlertsPage: Error in recognition for ${field}:`, error);
        setMessage('பிழை: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log(`EmergencyAlertsPage: No input detected for ${field}.`);
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [isListening, isSpeaking, currentFieldListening, startTemporaryListening, generateAudio]);

  // Add/Update Contact API call
  const handleSaveContact = async () => {
    // Prevent action if busy or required fields are empty
    if (isAnyInteractionActive || !newContact.name.trim() || !newContact.number.trim()) {
      generateAudio('பெயர் மற்றும் எண் தேவை.');
      setMessage('பெயர் மற்றும் எண் தேவை.');
      return;
    }

    setLoading(true);
    setMessage(editingContactId ? 'தொடர்பு புதுப்பிக்கப்படுகிறது...' : 'புதிய தொடர்பு சேர்க்கப்படுகிறது...');
    generateAudio(editingContactId ? 'தொடர்பு புதுப்பிக்கப்படுகிறது.' : 'புதிய தொடர்பு சேர்க்கப்படுகிறது.');
    console.log('EmergencyAlertsPage: Saving contact:', newContact);

    try {
      const method = editingContactId ? 'PUT' : 'POST';
      const url = editingContactId
        ? `http://localhost:5000/api/profile/contacts/${editingContactId}` // Use contact ID for PUT
        : 'http://localhost:5000/api/profile/contacts'; // No ID for POST (new contact)

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(newContact),
      });
      const data = await res.json(); // Backend returns the updated list of contacts
      if (!res.ok) {
        throw new Error(data.msg || 'தொடர்பைச் சேமிக்க முடியவில்லை');
      }

      setEmergencyContacts(data); // Update state with the new list of contacts
      setNewContact({ name: '', number: '' }); // Clear the form
      setEditingContactId(null); // Exit edit mode
      setMessage('தொடர்பு வெற்றிகரமாக சேமிக்கப்பட்டது!');
      generateAudio('தொடர்பு வெற்றிகரமாக சேமிக்கப்பட்டது!');
    } catch (err) {
      console.error('EmergencyAlertsPage: Error saving contact:', err);
      setMessage('பிழை: தொடர்பைச் சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: தொடர்பைச் சேமிக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Delete Contact API call
  const handleDeleteContact = async (contactId, contactName) => {
    if (isAnyInteractionActive) return;

    if (!window.confirm(`"${contactName}" என்ற தொடர்பை நீக்க வேண்டுமா?`)) {
      return;
    }

    setLoading(true);
    setMessage('தொடர்பு நீக்கப்படுகிறது...');
    generateAudio('தொடர்பு நீக்கப்படுகிறது.');
    console.log('EmergencyAlertsPage: Deleting contact:', contactId);

    try {
      const res = await fetch(`http://localhost:5000/api/profile/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });
      const data = await res.json(); // Backend returns the updated list of contacts
      if (!res.ok) {
        throw new Error(data.msg || 'தொடர்பை நீக்க முடியவில்லை');
      }
      setEmergencyContacts(data); // Update state with the new list of contacts
      setMessage('தொடர்பு வெற்றிகரமாக நீக்கப்பட்டது!');
      generateAudio('தொடர்பு வெற்றிகரமாக நீக்கப்பட்டது!');
    } catch (err) {
      console.error('EmergencyAlertsPage: Error deleting contact:', err);
      setMessage('பிழை: தொடர்பை நீக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: தொடர்பை நீக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Start editing an existing contact
  const handleEditClick = (contact) => {
    if (isAnyInteractionActive) return;
    setNewContact({ name: contact.name, number: contact.number }); // Pre-fill form with contact data
    setEditingContactId(contact._id); // Set the ID of the contact being edited
    setMessage(`"${contact.name}" திருத்தப்படுகிறது...`);
    generateAudio(`"${contact.name}" திருத்தப்படுகிறது.`);
  };

  // Cancel adding or editing a contact
  const handleCancelEdit = () => {
    if (isAnyInteractionActive) return;
    setNewContact({ name: '', number: '' }); // Clear form
    setEditingContactId(null); // Exit edit mode
    setMessage('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    generateAudio('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
  };

  // Voice command action for adding a contact (exposed via ref)
  const handleAddContactClick = () => {
      if (isAnyInteractionActive) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewContact({ name: '', number: '' }); // Clear form for new entry
      setEditingContactId(null); // Ensure not in edit mode
      setMessage('புதிய தொடர்பைச் சேர்க்கவும்.');
      generateAudio('புதிய தொடர்பைச் சேர்க்கவும். பெயர் மற்றும் எண்ணைச் சொல்லவும்.');
  };


  // Determine if any button or input should be disabled (global busy states or local listening)
  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  // Show loading indicator until initial profile data is fetched
  if (loading && !hasFetchedContacts.current) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginTop: '20px', textAlign: 'center' }}>
        <p>அவசர தொடர்புகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#e0f7fa', border: '1px solid #b2ebf2', borderRadius: '8px', marginTop: '20px' }}>
      <h3>📍 அவசர எச்சரிக்கைகள் பக்கம்</h3>
      <p>முக்கிய அவசர தொடர்புகளை இங்கே நிர்வகிக்கலாம்.</p>

      {/* Fixed Emergency Numbers Section */}
      <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h4 style={{ marginTop: '0', marginBottom: '10px', color: '#007bff' }}>அரசு அவசர எண்கள்:</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <span><strong>காவல் துறை (Police):</strong> 100</span>
          <div>
            {/* Using a tags with tel: and sms: protocols for direct action */}
            <a href="tel:100" style={{ marginRight: '10px', color: '#28a745', textDecoration: 'none', pointerEvents: isAnyInteractionActive ? 'none' : 'auto', opacity: isAnyInteractionActive ? 0.6 : 1 }} aria-disabled={isAnyInteractionActive}>📞 அழைப்பு</a>
            <a href="sms:100" style={{ color: '#007bff', textDecoration: 'none', pointerEvents: isAnyInteractionActive ? 'none' : 'auto', opacity: isAnyInteractionActive ? 0.6 : 1 }} aria-disabled={isAnyInteractionActive}>💬 செய்தி</a>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>ஆம்புலன்ஸ் (Ambulance):</strong> 108</span>
          <div>
            <a href="tel:108" style={{ marginRight: '10px', color: '#28a745', textDecoration: 'none', pointerEvents: isAnyInteractionActive ? 'none' : 'auto', opacity: isAnyInteractionActive ? 0.6 : 1 }} aria-disabled={isAnyInteractionActive}>📞 அழைப்பு</a>
            <a href="sms:108" style={{ color: '#007bff', textDecoration: 'none', pointerEvents: isAnyInteractionActive ? 'none' : 'auto', opacity: isAnyInteractionActive ? 0.6 : 1 }} aria-disabled={isAnyInteractionActive}>💬 செய்தி</a>
          </div>
        </div>
      </div>

      {/* Custom Emergency Contacts List Section */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ marginBottom: '10px', color: '#007bff' }}>உங்கள் அவசர தொடர்புகள்:</h4>
        {emergencyContacts.length === 0 ? (
          <p>தற்போது எந்த அவசர தொடர்புகளும் இல்லை.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            {emergencyContacts.map((contact) => (
              <li key={contact._id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#fff' }}>
                <div style={{ flex: '1 1 150px', marginBottom: '5px' }}> {/* Adjusted flex for better wrapping */}
                  <strong>{contact.name}:</strong> {contact.number}
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}> {/* Use gap for spacing */}
                  <a href={`tel:${contact.number}`} style={{ color: '#28a745', textDecoration: 'none', pointerEvents: isAnyInteractionActive ? 'none' : 'auto', opacity: isAnyInteractionActive ? 0.6 : 1 }} aria-disabled={isAnyInteractionActive}>📞 அழைப்பு</a>
                  <a href={`sms:${contact.number}`} style={{ color: '#007bff', textDecoration: 'none', pointerEvents: isAnyInteractionActive ? 'none' : 'auto', opacity: isAnyInteractionActive ? 0.6 : 1 }} aria-disabled={isAnyInteractionActive}>💬 செய்தி</a>
                  <button onClick={() => handleEditClick(contact)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ffc107', backgroundColor: '#ffc107', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                    ✏️ திருத்து
                  </button>
                  <button onClick={() => handleDeleteContact(contact._id, contact.name)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: '#dc3545', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                    🗑️ நீக்கு
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add/Edit Contact Form Section */}
      <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#007bff' }}>{editingContactId ? 'தொடர்பைத் திருத்து' : 'புதிய தொடர்பைச் சேர்'}:</h4>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>பெயர் (Name):</label>
          <input
            type="text"
            name="name"
            value={newContact.name}
            onChange={handleContactInputChange}
            disabled={isAnyInteractionActive}
            style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button
            onClick={() => startListeningForField('name', 'தொடர்பு பெயர்')}
            disabled={isAnyInteractionActive}
            style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
          >
            {currentFieldListening === 'name' ? '🎧 கேட்கிறது...' : '🎙️ பெயர்'}
          </button>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>எண் (Number):</label>
          <input
            type="text"
            name="number"
            value={newContact.number}
            onChange={handleContactInputChange}
            disabled={isAnyInteractionActive}
            style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button
            onClick={() => startListeningForField('number', 'தொடர்பு எண்')}
            disabled={isAnyInteractionActive}
            style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
          >
            {currentFieldListening === 'number' ? '🎧 கேட்கிறது...' : '🎙️ எண்'}
          </button>
        </div>
        <button
          onClick={handleSaveContact}
          disabled={isAnyInteractionActive || !newContact.name.trim() || !newContact.number.trim()} // Disable if busy or fields empty
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: (isAnyInteractionActive || !newContact.name.trim() || !newContact.number.trim()) ? 'not-allowed' : 'pointer', fontSize: '16px', marginRight: '10px' }}
        >
          {loading ? 'சேமிக்கிறது...' : '💾 சேமி'}
        </button>
        <button
          onClick={handleCancelEdit}
          disabled={isAnyInteractionActive || (!editingContactId && !newContact.name && !newContact.number)} // Disable if nothing to cancel
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: (isAnyInteractionActive || (!editingContactId && !newContact.name && !newContact.number)) ? 'not-allowed' : 'pointer', fontSize: '16px' }}
        >
          ❌ ரத்து செய்
        </button>
      </div>

      {message && <p style={{ marginTop: '15px', color: '#333', fontSize: '14px' }}>{message}</p>}
    </div>
  );
});

export default EmergencyAlertsPage;