// src/components/dashboard_pages/MedicationsRemindersPage.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';

const MedicationsRemindersPage = forwardRef(({ generateAudio, startTemporaryListening, isListening, isSpeaking, token }, ref) => {
  const [medications, setMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({ medicineName: '', dosage: '', times: '' });
  const [editingMedicationId, setEditingMedicationId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentFieldListening, setCurrentFieldListening] = useState(null);
  const [showForm, setShowForm] = useState(false); // NEW STATE: Controls form visibility

  const hasFetchedMedications = useRef(false);
  const reminderIntervalRef = useRef(null);

  // Refs for volatile props/state to stabilize checkForReminders
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const medicationsRef = useRef(medications);

  // Expose methods to parent (Dashboard) via ref for voice commands
  useImperativeHandle(ref, () => ({
    handleAddMedicineClick: handleAddMedicineClick,
    handleSaveMedicineClick: handleSaveMedicine,
    handleCancelEditClick: handleCancelEdit,
  }));

  // Update refs whenever the props/state they mirror change
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { medicationsRef.current = medications; }, [medications]);


  // Helper to parse times and check for reminders
  const parseAndCheckTime = useCallback((medication, generateAudioCallback) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const announcementWindowMinutes = 5; // Announce if within this many minutes of scheduled time
    const announcementCooldownHours = 2; // Don't re-announce within this period for the same slot

    const parsedTimes = medication.times.split(',').map(s => s.trim()).filter(s => s);

    for (const timeStr of parsedTimes) {
      let [hour, minute] = [0, 0];
      const timeParts = timeStr.match(/(\d+)(:\d+)?\s*(am|pm)?/i);

      if (timeParts) {
        hour = parseInt(timeParts[1], 10);
        if (timeParts[2]) {
          minute = parseInt(timeParts[2].substring(1), 10);
        }

        const ampm = timeParts[3] ? timeParts[3].toLowerCase() : '';
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0; // 12 AM (midnight) is 0 hour

        const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

        if (scheduledTime <= now && (now.getTime() - scheduledTime.getTime() < announcementWindowMinutes * 60 * 1000)) {
          if (medication.lastReminderAnnounced && (now.getTime() - new Date(medication.lastReminderAnnounced).getTime()) < announcementCooldownHours * 60 * 60 * 1000) {
              console.log(`Reminder for ${medication.medicineName} skipped due to cooldown.`);
              continue;
          }

          const announcement = `உங்கள் ${medication.medicineName} மருந்தை ${medication.dosage} எடுக்க வேண்டிய நேரம்.`;
          console.log('Reminder Announcement:', announcement);
          generateAudioCallback(announcement);

          break;
        }
      }
    }
  }, [generateAudio]);


  // Check for upcoming or overdue reminders - this is now a highly stable callback
  const checkForReminders = useCallback(() => {
    if (isSpeakingRef.current || isListeningRef.current) {
        console.log('MedicationsRemindersPage: Reminders skipped - App is busy speaking or listening.');
        return;
    }

    medicationsRef.current.forEach(med => {
        parseAndCheckTime(med, generateAudio);
    });
  }, [parseAndCheckTime, generateAudio]);

  // Fetch medications on component mount
  const fetchMedications = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      setInitialLoading(false);
      return;
    }

    if (!initialLoading) { // Only show loading message if not initial load
      setLoading(true);
      setMessage('மருந்துகளைப் பெறுகிறது...');
    }

    console.log('MedicationsRemindersPage: Fetching medications...');
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
        throw new Error(data.msg || 'மருந்துகளைப் பெற முடியவில்லை');
      }
      setMedications(data.medications || []);
      setMessage('மருந்துகள் ஏற்றப்பட்டன.');

      if (data.medications && data.medications.length === 0 && !hasFetchedMedications.current) {
         generateAudio('தற்போது மருந்துகள் எதுவும் இல்லை. புதிய மருந்தைச் சேர்க்கவும்.');
         setShowForm(true); // NEW: Show form if no medications on initial load
      } else if (data.medications && data.medications.length > 0 && !hasFetchedMedications.current) {
         setShowForm(false); // NEW: Hide form if medications exist on initial load
      }
      hasFetchedMedications.current = true;
    } catch (err) {
      console.error('MedicationsRemindersPage: Error fetching medications:', err);
      setMessage('பிழை: மருந்துகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: மருந்துகளைப் பெற முடியவில்லை.');
    }

    setLoading(false);
    setInitialLoading(false);
  }, [token, generateAudio, initialLoading]); // Added initialLoading to dependencies for its change to trigger fetch

  // Effect to run fetch on component mount and setup reminder interval
  useEffect(() => {
    if (!hasFetchedMedications.current) { // Only fetch once on mount
      fetchMedications();
    }

    reminderIntervalRef.current = setInterval(checkForReminders, 30 * 1000);

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
      }
    };
  }, [fetchMedications, checkForReminders]); // Dependencies for useEffect with setInterval

  // Handler for form input changes (for new/editing medication)
  const handleMedicationInputChange = (e) => {
    const { name, value } = e.target;
    setNewMedication(prev => ({ ...prev, [name]: value }));
  };

  // Callback to start speech recognition for a specific field
  const startListeningForField = useCallback((field, promptText) => {
    if (isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening(field);
    setMessage(`🎧 ${promptText} க்காக கேட்கிறது...`);
    console.log(`MedicationsRemindersPage: Starting listening for ${field}`);

    startTemporaryListening(
      (text) => { // onResult callback
        console.log(`MedicationsRemindersPage: Speech recognized for ${field}:`, text);
        setNewMedication(prev => ({ ...prev, [field]: text }));
        setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null);
      },
      (error) => { // onError callback
        console.error(`MedicationsRemindersPage: Error in recognition for ${field}:`, error);
        setMessage('பிழை: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log(`MedicationsRemindersPage: No input detected for ${field}.`);
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [currentFieldListening, startTemporaryListening, generateAudio, isListeningRef, isSpeakingRef]); // Added refs to dependencies


  // Add/Update Medication API call
  const handleSaveMedicine = async () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening || !newMedication.medicineName.trim() || !newMedication.dosage.trim() || !newMedication.times.trim()) {
      generateAudio('மருந்தின் பெயர், அளவு மற்றும் நேரம் தேவை.');
      setMessage('மருந்தின் பெயர், அளவு மற்றும் நேரம் தேவை.');
      return;
    }

    setLoading(true);
    setMessage(editingMedicationId ? 'மருந்து புதுப்பிக்கப்படுகிறது...' : 'புதிய மருந்து சேர்க்கப்படுகிறது...');
    generateAudio(editingMedicationId ? 'மருந்து புதுப்பிக்கப்படுகிறது.' : 'புதிய மருந்து சேர்க்கப்படுகிறது.');
    console.log('MedicationsRemindersPage: Saving medication:', newMedication);

    try {
      const method = editingMedicationId ? 'PUT' : 'POST';
      const url = editingMedicationId
        ? `http://localhost:5000/api/profile/medications/${editingMedicationId}`
        : 'http://localhost:5000/api/profile/medications';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(newMedication),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'மருந்தைச் சேமிக்க முடியவில்லை');
      }

      setMedications(data);
      setNewMedication({ medicineName: '', dosage: '', times: '' });
      setEditingMedicationId(null);
      setMessage('மருந்து வெற்றிகரமாக சேமிக்கப்பட்டது!');
      generateAudio('மருந்து வெற்றிகரமாக சேமிக்கப்பட்டது!');
      setShowForm(false); // NEW: Hide form after successful save
    } catch (err) {
      console.error('MedicationsRemindersPage: Error saving medication:', err);
      setMessage('பிழை: மருந்தைச் சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: மருந்தைச் சேமிக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Delete Medication API call
  const handleDeleteMedicine = async (medicationId, medicineName) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;

    if (!window.confirm(`"${medicineName}" என்ற மருந்தை நீக்க வேண்டுமா?`)) {
      return;
    }

    setLoading(true);
    setMessage('மருந்து நீக்கப்படுகிறது...');
    generateAudio('மருந்து நீக்கப்படுகிறது.');
    console.log('MedicationsRemindersPage: Deleting medication:', medicationId);

    try {
      const res = await fetch(`http://localhost:5000/api/profile/medications/${medicationId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'மருந்தை நீக்க முடியவில்லை');
      }
      setMedications(data);
      setMessage('மருந்து வெற்றிகரமாக நீக்கப்பட்டது!');
      generateAudio('மருந்து வெற்றிகரமாக நீக்கப்பட்டது!');
      if (data.length === 0) { // NEW: If list becomes empty after delete, show form
          setShowForm(true);
      }
    } catch (err) {
      console.error('MedicationsRemindersPage: Error deleting medication:', err);
      setMessage('பிழை: மருந்தை நீக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: மருந்தை நீக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Start editing an existing medication
  const handleEditClick = (medication) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewMedication({ medicineName: medication.medicineName, dosage: medication.dosage, times: medication.times });
    setEditingMedicationId(medication._id);
    setMessage(`"${medication.medicineName}" திருத்தப்படுகிறது...`);
    generateAudio(`"${medication.medicineName}" திருத்தப்படுகிறது.`);
    setShowForm(true); // NEW: Show form when editing
  };

  // Cancel adding or editing a medication
  const handleCancelEdit = () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewMedication({ medicineName: '', dosage: '', times: '' });
    setEditingMedicationId(null);
    setMessage('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    generateAudio('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    setShowForm(false); // NEW: Hide form on cancel
  };

  // Voice command action for adding a medication (exposed via ref)
  const handleAddMedicineClick = () => {
      if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewMedication({ medicineName: '', dosage: '', times: '' });
      setEditingMedicationId(null);
      setMessage('புதிய மருந்தைச் சேர்க்கவும்.');
      generateAudio('புதிய மருந்தைச் சேர்க்கவும். மருந்தின் பெயர், அளவு மற்றும் நேரத்தைச் சொல்லவும்.');
      setShowForm(true); // NEW: Show form via voice command
  };

  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  // Show initial loading screen
  if (initialLoading) {
    return (
      <div style={{
        padding: '40px 20px',
        backgroundColor: '#cfe2f3',
        border: '1px solid #b7daff',
        borderRadius: '8px',
        marginTop: '20px',
        textAlign: 'center',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #b7daff',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <h3>💊 மருந்துகள் மற்றும் நினைவூட்டல்கள்</h3>
        <p>மருந்துகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#cfe2f3', border: '1px solid #b7daff', borderRadius: '8px', marginTop: '20px' }}>
      <h3>💊 மருந்துகள் மற்றும் நினைவூட்டல்கள் பக்கம்</h3>
      <p>உங்கள் மருந்துகள் மற்றும் நினைவூட்டல்களை இங்கே நிர்வகிக்கலாம்.</p>

      {/* Medication List Section */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ marginBottom: '10px', color: '#007bff' }}>உங்கள் மருந்துகள்:</h4>
        {medications.length === 0 && !showForm ? ( // Only show empty state if no medications AND form is hidden
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '2px dashed #ddd',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>💊</div>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>மருந்துகள் எதுவும் இல்லை</h4>
            <p style={{ marginBottom: '20px' }}>தற்போது எந்த மருந்துகளும் சேர்க்கப்படவில்லை.</p>
            <button
              onClick={handleAddMedicineClick}
              disabled={isAnyInteractionActive}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer',
                opacity: isAnyInteractionActive ? 0.6 : 1
              }}
            >
              ➕ முதல் மருந்தைச் சேர்க்கவும்
            </button>
          </div>
        ) : (
          <>
            {medications.length > 0 && ( // Only show list if there are medications
              <ul style={{ listStyleType: 'none', padding: '0' }}>
                {medications.map((med) => (
                  <li key={med._id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#fff' }}>
                    <div style={{ flex: '1 1 200px', marginBottom: '5px' }}>
                      <strong>{med.medicineName}</strong> - {med.dosage} <br />
                      <small>நேரம்: {med.times}</small>
                    </div>
                    <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditClick(med)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ffc107', backgroundColor: '#ffc107', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                        ✏️ திருத்து
                      </button>
                      <button onClick={() => handleDeleteMedicine(med._id, med.medicineName)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: '#dc3545', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                        🗑️ நீக்கு
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {medications.length > 0 && !showForm && ( // Show "Add more" button only if list is not empty AND form is hidden
              <button
                onClick={handleAddMedicineClick}
                disabled={isAnyInteractionActive}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '14px',
                  cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer',
                  opacity: isAnyInteractionActive ? 0.6 : 1,
                  marginTop: '10px'
                }}
              >
                ➕ மேலும் மருந்து சேர்க்கவும்
              </button>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Medication Form Section - Only show when showForm is true */}
      {showForm && (
        <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#007bff' }}>{editingMedicationId ? 'மருந்தைத் திருத்து' : 'புதிய மருந்தைச் சேர்'}:</h4>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>மருந்தின் பெயர் (Medicine Name):</label>
            <input
              type="text"
              name="medicineName"
              value={newMedication.medicineName}
              onChange={handleMedicationInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('medicineName', 'மருந்தின் பெயர்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'medicineName' ? '🎧 கேட்கிறது...' : '🎙️ பெயர்'}
            </button>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>அளவு (Dosage):</label>
            <input
              type="text"
              name="dosage"
              value={newMedication.dosage}
              onChange={handleMedicationInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('dosage', 'அளவு')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'dosage' ? '🎧 கேட்கிறது...' : '🎙️ அளவு'}
            </button>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>நேரம் (Times - எ.கா: காலை 8, மாலை 6):</label>
            <input
              type="text"
              name="times"
              value={newMedication.times}
              onChange={handleMedicationInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('times', 'நேரம்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'times' ? '🎧 கேட்கிறது...' : '🎙️ நேரம்'}
            </button>
          </div>
          <button
            onClick={handleSaveMedicine}
            disabled={isAnyInteractionActive || !newMedication.medicineName.trim() || !newMedication.dosage.trim() || !newMedication.times.trim()}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: (isAnyInteractionActive || !newMedication.medicineName.trim() || !newMedication.dosage.trim() || !newMedication.times.trim()) ? 'not-allowed' : 'pointer', fontSize: '16px', marginRight: '10px' }}
          >
            {loading ? 'சேமிக்கிறது...' : '💾 சேமி'}
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={isAnyInteractionActive}
            style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer', fontSize: '16px' }}
          >
            ❌ ரத்து செய்
          </button>
        </div>
      )}

      {message && <p style={{ marginTop: '15px', color: '#333', fontSize: '14px' }}>{message}</p>}
    </div>
  );
});

export default MedicationsRemindersPage;