// components/dashboard_pages/ProfilePage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function ProfilePage({ username, generateAudio, startTemporaryListening, isListening, isSpeaking, token }) {
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    contactNumber: '',
    address: '',
  });
  const [originalProfile, setOriginalProfile] = useState(null); // To store fetched data for 'Cancel'
  const [isEditing, setIsEditing] = useState(false); // New state: true for form, false for list view
  const [currentFieldListening, setCurrentFieldListening] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Ref to detect if initial fetch has happened
  const hasFetchedProfile = useRef(false);

  // Function to fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      return;
    }
    setLoading(true);
    setMessage('சுயவிவரத்தைப் பெறுகிறது...');
    console.log('ProfilePage: Fetching profile...');
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
        throw new Error(data.msg || 'சுயவிவரத்தைப் பெற முடியவில்லை');
      }

      const fetchedData = {
        name: data.name || '',
        age: data.age !== null && data.age !== undefined ? String(data.age) : '',
        contactNumber: data.contactNumber || '',
        address: data.address || '',
      };
      setProfile(fetchedData);
      setOriginalProfile(fetchedData); // Store the original fetched data

      // Determine initial mode: if all fields are empty, go to edit mode
      const allFieldsEmpty = Object.values(fetchedData).every(val => val === '' || val === null);
      if (allFieldsEmpty && !hasFetchedProfile.current) { // Only set to edit if it's the first load and empty
         setIsEditing(true);
         generateAudio('உங்கள் சுயவிவரம் காலியாக உள்ளது. விவரங்களை உள்ளிடவும்.');
         setMessage('உங்கள் சுயவிவரம் காலியாக உள்ளது. விவரங்களை உள்ளிடவும்.');
      } else {
         setIsEditing(false); // Otherwise, show in view mode
         setMessage('சுயவிவரம் ஏற்றப்பட்டது.');
      }
      setIsProfileLoaded(true);
      hasFetchedProfile.current = true; // Mark as fetched
    } catch (err) {
      console.error('ProfilePage: Error fetching profile:', err);
      setMessage('பிழை: சுயவிவரத்தைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: சுயவிவரத்தைப் பெற முடியவில்லை.');
    }
    setLoading(false);
  }, [token, generateAudio]);

  // Fetch profile data on component mount or token change
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // Dependency on fetchProfile useCallback

  // Handler for form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Callback to start speech recognition for a specific field
  const startListeningForField = useCallback((field, promptText) => {
    // Block if any listening/speaking is already active (global or local field-specific)
    if (isListening || isSpeaking || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening(field); // Indicate which field is active
    setMessage(`🎧 ${promptText} க்காக கேட்கிறது...`);
    console.log(`ProfilePage: Starting listening for ${field}`);

    startTemporaryListening(
      (text) => { // onResult callback
        console.log(`ProfilePage: Speech recognized for ${field}:`, text);
        if (field === 'age') {
          const num = parseInt(text, 10);
          if (isNaN(num) || num < 0) {
            setMessage(`தவறு: வயது ஒரு எண்ணாக இருக்க வேண்டும்.`);
            generateAudio(`தவறு: வயது ஒரு எண்ணாக இருக்க வேண்டும்.`);
            setCurrentFieldListening(null);
            return;
          }
          setProfile(prev => ({ ...prev, [field]: String(num) }));
        } else {
          setProfile(prev => ({ ...prev, [field]: text }));
        }
        setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null);
      },
      (error) => { // onError callback
        console.error(`ProfilePage: Error in recognition for ${field}:`, error);
        setMessage('பிழை: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log(`ProfilePage: No input detected for ${field}.`);
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [isListening, isSpeaking, currentFieldListening, startTemporaryListening, generateAudio]);


  // Handler to save/update the profile
  const handleSaveProfile = async () => {
    if (isAnyInteractionActive || loading) return;

    if (!token) {
      setMessage('Error: No authentication token found for saving.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      return;
    }
    setLoading(true);
    setMessage('சுயவிவரத்தைச் சேமிக்கிறது...');
    generateAudio('சுயவிவரம் சேமிக்கப்படுகிறது.');
    console.log('ProfilePage: Saving profile:', profile);

    try {
      const dataToSend = {
        ...profile,
        age: profile.age !== '' ? parseInt(profile.age, 10) : null
      };

      const res = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'சுயவிவரத்தை சேமிக்க முடியவில்லை');
      }
      const savedData = {
        name: data.name || '',
        age: data.age !== null && data.age !== undefined ? String(data.age) : '',
        contactNumber: data.contactNumber || '',
        address: data.address || '',
      };
      setProfile(savedData);
      setOriginalProfile(savedData); // Update original profile
      setMessage('சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!');
      generateAudio('சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!');
      setIsEditing(false); // Switch back to view mode after saving
    } catch (err) {
      console.error('ProfilePage: Error saving profile:', err);
      setMessage('பிழை: சுயவிவரத்தை சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: சுயவிவரத்தை சேமிக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Handler for 'Edit' button click
  const handleEditClick = () => {
    if (isAnyInteractionActive) return;
    setIsEditing(true);
    setMessage('சுயவிவரத்தைத் திருத்தவும்.');
    generateAudio('சுயவிவரத்தைத் திருத்தவும்.');
  };

  // Handler for 'Cancel' button click
  const handleCancelClick = () => {
    if (isAnyInteractionActive) return;
    setProfile(originalProfile); // Revert to original fetched data
    setIsEditing(false);
    setMessage('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    generateAudio('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
  };

  // Determine if any button or input should be disabled
  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  // Show loading indicator until initial profile data is fetched
  if (loading && !isProfileLoaded) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginTop: '20px', textAlign: 'center' }}>
        <p>சுயவிவரம் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
      <h3>👤 சுயவிவரம் பக்கம் ({username})</h3>
      <p>உங்கள் சுயவிவர விவரங்களை இங்கே நிர்வகிக்கவும்.</p>

      {isEditing ? (
        // --- Edit Mode (Form) ---
        <>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>பெயர் (Name):</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('name', 'பெயர்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'name' ? '🎧 கேட்கிறது...' : '🎙️ பெயர்'}
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>வயது (Age):</label>
            <input
              type="number"
              name="age"
              value={profile.age}
              onChange={handleInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('age', 'வயது')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'age' ? '🎧 கேட்கிறது...' : '🎙️ வயது'}
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>தொடர்பு எண் (Contact Number):</label>
            <input
              type="text"
              name="contactNumber"
              value={profile.contactNumber}
              onChange={handleInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('contactNumber', 'தொடர்பு எண்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'contactNumber' ? '🎧 கேட்கிறது...' : '🎙️ தொடர்பு எண்'}
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>முகவரி (Address):</label>
            <input
              type="text"
              name="address"
              value={profile.address}
              onChange={handleInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('address', 'முகவரி')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'address' ? '🎧 கேட்கிறது...' : '🎙️ முகவரி'}
            </button>
          </div>

          {/* Save and Cancel Buttons */}
          <button
            onClick={handleSaveProfile}
            disabled={isAnyInteractionActive || loading}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: isAnyInteractionActive || loading ? 'not-allowed' : 'pointer', fontSize: '16px', marginRight: '10px' }}
          >
            {loading ? 'சேமிக்கிறது...' : '💾 சுயவிவரத்தைச் சேமி'}
          </button>
          <button
            onClick={handleCancelClick}
            disabled={isAnyInteractionActive || loading}
            style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: isAnyInteractionActive || loading ? 'not-allowed' : 'pointer', fontSize: '16px' }}
          >
            ❌ ரத்து செய்
          </button>
        </>
      ) : (
        // --- View Mode (List) ---
        <>
          <div style={{ marginBottom: '20px', lineHeight: '1.8' }}>
            <p><strong>பெயர்:</strong> {profile.name || 'இல்லை'}</p>
            <p><strong>வயது:</strong> {profile.age || 'இல்லை'}</p>
            <p><strong>தொடர்பு எண்:</strong> {profile.contactNumber || 'இல்லை'}</p>
            <p><strong>முகவரி:</strong> {profile.address || 'இல்லை'}</p>
          </div>
          <button
            onClick={handleEditClick}
            disabled={isAnyInteractionActive}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer', fontSize: '16px' }}
          >
            ✏️ சுயவிவரத்தைத் திருத்து
          </button>
        </>
      )}

      {/* Message Display */}
      {message && <p style={{ marginTop: '15px', color: '#333', fontSize: '14px' }}>{message}</p>}
    </div>
  );
}