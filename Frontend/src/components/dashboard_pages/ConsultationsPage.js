// src/components/dashboard_pages/ConsultationsPage.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';

const ConsultationsPage = forwardRef(({ generateAudio, startTemporaryListening, isListening, isSpeaking, token }, ref) => {
  const [consultations, setConsultations] = useState([]);
  const [newConsultation, setNewConsultation] = useState({ doctorName: '', date: '', time: '' });
  const [editingConsultationId, setEditingConsultationId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentFieldListening, setCurrentFieldListening] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const hasFetchedConsultations = useRef(false);
  const reminderIntervalRef = useRef(null);

  // Refs for volatile props/state to stabilize checkForReminders
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const consultationsRef = useRef(consultations);

  // Expose methods to parent (Dashboard) via ref for voice commands
  useImperativeHandle(ref, () => ({
    handleAddConsultationClick: handleAddConsultationClick,
    handleSaveConsultationClick: handleSaveConsultation,
    handleCancelEditClick: handleCancelEdit,
  }));

  // Update refs whenever the props/state they mirror change
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { consultationsRef.current = consultations; }, [consultations]);


  // Helper to format Date object to YYYY-MM-DD string for input fields
  const formatDateForInput = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to parse date and time strings and check for reminders
  const parseAndCheckTime = useCallback((consultation, generateAudioCallback) => {
    const now = new Date();
    const announcementWindowMinutes = 5; // Announce if within this many minutes of scheduled time
    const announcementCooldownHours = 2; // Don't re-announce within this period for the same slot

    // Combine consultation.date (Date object) and consultation.time (string)
    const consultationDate = new Date(consultation.date); // Ensure it's a Date object
    const timeStr = consultation.time;

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

      // Construct the full scheduled Date object
      const scheduledTime = new Date(
        consultationDate.getFullYear(),
        consultationDate.getMonth(),
        consultationDate.getDate(),
        hour,
        minute,
        0
      );

      // Check if scheduled time is in the past, but not too far in the past (within announcement window)
      // And if it hasn't been announced very recently
      if (scheduledTime <= now && (now.getTime() - scheduledTime.getTime() < announcementWindowMinutes * 60 * 1000)) {
        if (consultation.lastReminderAnnounced && (now.getTime() - new Date(consultation.lastReminderAnnounced).getTime()) < announcementCooldownHours * 60 * 60 * 1000) {
            console.log(`Reminder for consultation with ${consultation.doctorName} skipped due to cooldown.`);
            return;
        }

        const formattedDate = new Date(consultation.date).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const announcement = `உங்கள் ${formattedDate} அன்று ${consultation.time} மணிக்கு டாக்டர் ${consultation.doctorName} உடன் ஆலோசனை உள்ளது.`;
        console.log('Reminder Announcement:', announcement);
        generateAudioCallback(announcement);

        // In a real app, you'd make an API call here to update consultation.lastReminderAnnounced in the DB.
        // This would prevent repeated announcements for the same consultation.
      }
    }
  }, [generateAudio]);


  // Check for upcoming or overdue reminders - this is now a highly stable callback
  const checkForReminders = useCallback(() => {
    if (isSpeakingRef.current || isListeningRef.current) {
        console.log('ConsultationsPage: Reminders skipped - App is busy speaking or listening.');
        return;
    }

    consultationsRef.current.forEach(cons => {
        parseAndCheckTime(cons, generateAudio);
    });
  }, [parseAndCheckTime, generateAudio]);

  // Fetch consultations on component mount
  const fetchConsultations = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      setInitialLoading(false);
      return;
    }

    if (!initialLoading) {
      setLoading(true);
      setMessage('ஆலோசனைகளைப் பெறுகிறது...');
    }

    console.log('ConsultationsPage: Fetching consultations...');
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
        throw new Error(data.msg || 'ஆலோசனைகளைப் பெற முடியவில்லை');
      }
      setConsultations(data.consultations || []);
      setMessage('ஆலோசனைகள் ஏற்றப்பட்டன.');

      if (data.consultations && data.consultations.length === 0 && !hasFetchedConsultations.current) {
         generateAudio('தற்போது ஆலோசனைகள் எதுவும் இல்லை. புதிய ஆலோசனையைச் சேர்க்கவும்.');
         setShowForm(true);
      } else if (data.consultations && data.consultations.length > 0 && !hasFetchedConsultations.current) {
         setShowForm(false);
      }
      hasFetchedConsultations.current = true;
    } catch (err) {
      console.error('ConsultationsPage: Error fetching consultations:', err);
      setMessage('பிழை: ஆலோசனைகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: ஆலோசனைகளைப் பெற முடியவில்லை.');
    }

    setLoading(false);
    setInitialLoading(false);
  }, [token, generateAudio, initialLoading]);

  // Effect to run fetch on component mount and setup reminder interval
  useEffect(() => {
    if (!hasFetchedConsultations.current) {
      fetchConsultations();
    }

    reminderIntervalRef.current = setInterval(checkForReminders, 30 * 1000);

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
      }
    };
  }, [fetchConsultations, checkForReminders]);

  // Handler for form input changes (for new/editing consultation)
  const handleConsultationInputChange = (e) => {
    const { name, value } = e.target;
    setNewConsultation(prev => ({ ...prev, [name]: value }));
  };

  // Callback to start speech recognition for a specific field
  const startListeningForField = useCallback((field, promptText) => {
    if (isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening(field);
    setMessage(`🎧 ${promptText} க்காக கேட்கிறது...`);
    console.log(`ConsultationsPage: Starting listening for ${field}`);

    startTemporaryListening(
      (text) => { // onResult callback
        console.log(`ConsultationsPage: Speech recognized for ${field}:`, text);
        // Special handling for date: try to parse it into YYYY-MM-DD
        if (field === 'date') {
            const parsedDate = new Date(text);
            if (!isNaN(parsedDate) && parsedDate.getFullYear() > 1900) { // Basic validation
                setNewConsultation(prev => ({ ...prev, [field]: formatDateForInput(parsedDate) }));
                setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${formatDateForInput(parsedDate)}`);
            } else {
                setMessage('தவறு: தேதி அங்கீகரிக்கப்படவில்லை. YYYY-MM-DD வடிவத்தில் சொல்லவும்.');
                generateAudio('தவறு: தேதி அங்கீகரிக்கப்படவில்லை. YYYY-MM-DD வடிவத்தில் சொல்லவும்.');
            }
        } else {
            setNewConsultation(prev => ({ ...prev, [field]: text }));
            setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${text}`);
        }
        setCurrentFieldListening(null);
      },
      (error) => { // onError callback
        console.error(`ConsultationsPage: Error in recognition for ${field}:`, error);
        setMessage('பிழை: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log(`ConsultationsPage: No input detected for ${field}.`);
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [currentFieldListening, startTemporaryListening, generateAudio, isListeningRef, isSpeakingRef]);

  // Add/Update Consultation API call
  const handleSaveConsultation = async () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening || !newConsultation.doctorName.trim() || !newConsultation.date.trim() || !newConsultation.time.trim()) {
      generateAudio('மருத்துவரின் பெயர், தேதி மற்றும் நேரம் தேவை.');
      setMessage('மருத்துவரின் பெயர், தேதி மற்றும் நேரம் தேவை.');
      return;
    }

    // Validate date format (YYYY-MM-DD) before sending to backend
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newConsultation.date)) {
      generateAudio('தேதி YYYY-MM-DD வடிவத்தில் இருக்க வேண்டும்.');
      setMessage('தேதி YYYY-MM-DD வடிவத்தில் இருக்க வேண்டும்.');
      return;
    }

    setLoading(true);
    setMessage(editingConsultationId ? 'ஆலோசனை புதுப்பிக்கப்படுகிறது...' : 'புதிய ஆலோசனை சேர்க்கப்படுகிறது...');
    generateAudio(editingConsultationId ? 'ஆலோசனை புதுப்பிக்கப்படுகிறது.' : 'புதிய ஆலோசனை சேர்க்கப்படுகிறது.');
    console.log('ConsultationsPage: Saving consultation:', newConsultation);

    try {
      const method = editingConsultationId ? 'PUT' : 'POST';
      const url = editingConsultationId
        ? `http://localhost:5000/api/profile/consultations/${editingConsultationId}`
        : 'http://localhost:5000/api/profile/consultations';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(newConsultation),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'ஆலோசனையைச் சேமிக்க முடியவில்லை');
      }

      setConsultations(data);
      setNewConsultation({ doctorName: '', date: '', time: '' });
      setEditingConsultationId(null);
      setMessage('ஆலோசனை வெற்றிகரமாக சேமிக்கப்பட்டது!');
      generateAudio('ஆலோசனை வெற்றிகரமாக சேமிக்கப்பட்டது!');
      setShowForm(false); // Hide form after successful save
    } catch (err) {
      console.error('ConsultationsPage: Error saving consultation:', err);
      setMessage('பிழை: ஆலோசனையைச் சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: ஆலோசனையைச் சேமிக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Delete Consultation API call
  const handleDeleteConsultation = async (consultationId, doctorName) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;

    if (!window.confirm(`டாக்டர் "${doctorName}" உடனான ஆலோசனையை நீக்க வேண்டுமா?`)) {
      return;
    }

    setLoading(true);
    setMessage('ஆலோசனை நீக்கப்படுகிறது...');
    generateAudio('ஆலோசனை நீக்கப்படுகிறது.');
    console.log('ConsultationsPage: Deleting consultation:', consultationId);

    try {
      const res = await fetch(`http://localhost:5000/api/profile/consultations/${consultationId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'ஆலோசனையை நீக்க முடியவில்லை');
      }
      setConsultations(data);
      setMessage('ஆலோசனை வெற்றிகரமாக நீக்கப்பட்டது!');
      generateAudio('ஆலோசனை வெற்றிகரமாக நீக்கப்பட்டது!');
      if (data.length === 0) {
          setShowForm(true); // If list becomes empty after delete, show form
      }
    } catch (err) {
      console.error('ConsultationsPage: Error deleting consultation:', err);
      setMessage('பிழை: ஆலோசனையை நீக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: ஆலோசனையை நீக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Start editing an existing consultation
  const handleEditClick = (consultation) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewConsultation({
      doctorName: consultation.doctorName,
      date: formatDateForInput(consultation.date), // Format Date object to YYYY-MM-DD
      time: consultation.time
    });
    setEditingConsultationId(consultation._id);
    setMessage(`டாக்டர் "${consultation.doctorName}" உடனான ஆலோசனை திருத்தப்படுகிறது...`);
    generateAudio(`டாக்டர் "${consultation.doctorName}" உடனான ஆலோசனை திருத்தப்படுகிறது.`);
    setShowForm(true); // Show form when editing
  };

  // Cancel adding or editing a consultation
  const handleCancelEdit = () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewConsultation({ doctorName: '', date: '', time: '' });
    setEditingConsultationId(null);
    setMessage('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    generateAudio('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    setShowForm(false); // Hide form on cancel
  };

  // Voice command action for adding a consultation (exposed via ref)
  const handleAddConsultationClick = () => {
      if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewConsultation({ doctorName: '', date: '', time: '' }); // Clear form for new entry
      setEditingConsultationId(null); // Ensure not in edit mode
      setMessage('புதிய ஆலோசனையைச் சேர்க்கவும்.');
      generateAudio('புதிய ஆலோசனையைச் சேர்க்கவும். மருத்துவரின் பெயர், தேதி மற்றும் நேரத்தைச் சொல்லவும்.');
      setShowForm(true); // Show form via voice command
  };

  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  if (initialLoading) {
    return (
      <div style={{
        padding: '40px 20px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e2e6ea',
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
            border: '4px solid #e2e6ea',
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
        <h3>🩺 ஆலோசனைகள்</h3>
        <p>ஆலோசனைகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', border: '1px solid #e2e6ea', borderRadius: '8px', marginTop: '20px' }}>
      <h3>🩺 ஆலோசனைகள் பக்கம்</h3>
      <p>உங்கள் மருத்துவ ஆலோசனைகளை இங்கே நிர்வகிக்கலாம்.</p>

      {/* Consultation List Section */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ marginBottom: '10px', color: '#007bff' }}>உங்கள் ஆலோசனைகள்:</h4>
        {consultations.length === 0 && !showForm ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '2px dashed #ddd',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🩺</div>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>ஆலோசனைகள் எதுவும் இல்லை</h4>
            <p style={{ marginBottom: '20px' }}>தற்போது எந்த ஆலோசனைகளும் சேர்க்கப்படவில்லை.</p>
            <button
              onClick={handleAddConsultationClick}
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
              ➕ முதல் ஆலோசனையைச் சேர்க்கவும்
            </button>
          </div>
        ) : (
          <>
            {consultations.length > 0 && (
              <ul style={{ listStyleType: 'none', padding: '0' }}>
                {/* Sort consultations by date and time for better display */}
                {consultations
                  .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    // Simple time string comparison (e.g., "10:00" vs "14:30")
                    // This assumes HH:MM format or similar that sorts lexicographically
                    const timeA = a.time.replace(/[^0-9:]/g, ''); // Remove AM/PM for sorting
                    const timeB = b.time.replace(/[^0-9:]/g, '');

                    if (dateA.getTime() !== dateB.getTime()) {
                      return dateA.getTime() - dateB.getTime();
                    }
                    return timeA.localeCompare(timeB); // Compare time strings if dates are same
                  })
                  .map((cons) => (
                  <li key={cons._id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '8px', backgroundColor: '#fff' }}>
                    <div style={{ flex: '1 1 200px', marginBottom: '5px' }}>
                      <strong>டாக்டர் {cons.doctorName}</strong> <br />
                      <small>தேதி: {new Date(cons.date).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</small><br />
                      <small>நேரம்: {cons.time}</small>
                    </div>
                    <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditClick(cons)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ffc107', backgroundColor: '#ffc107', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                        ✏️ திருத்து
                      </button>
                      <button onClick={() => handleDeleteConsultation(cons._id, cons.doctorName)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: '#dc3545', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                        🗑️ நீக்கு
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {consultations.length > 0 && !showForm && (
              <button
                onClick={handleAddConsultationClick}
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
                ➕ மேலும் ஆலோசனை சேர்க்கவும்
              </button>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Consultation Form Section - Only show when showForm is true */}
      {showForm && (
        <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#007bff' }}>{editingConsultationId ? 'ஆலோசனையைத் திருத்து' : 'புதிய ஆலோசனையைச் சேர்'}:</h4>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>மருத்துவரின் பெயர் (Doctor Name):</label>
            <input
              type="text"
              name="doctorName"
              value={newConsultation.doctorName}
              onChange={handleConsultationInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('doctorName', 'மருத்துவரின் பெயர்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'doctorName' ? '🎧 கேட்கிறது...' : '🎙️ பெயர்'}
            </button>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>தேதி (Date):</label>
            <input
              type="date" // CHANGED: Use type="date" for calendar picker
              name="date"
              value={newConsultation.date}
              onChange={handleConsultationInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            {/* REMOVED: Voice input for date is less practical with a date picker 
                        but if needed, it would require complex date parsing from speech.
                        For now, rely on the picker. */}
            {/* <button
              onClick={() => startListeningForField('date', 'தேதி')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'date' ? '🎧 கேட்கிறது...' : '🎙️ தேதி'}
            </button> */}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>நேரம் (Time - எ.கா: காலை 10, 14:30):</label>
            <input
              type="text"
              name="time"
              value={newConsultation.time}
              onChange={handleConsultationInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('time', 'நேரம்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'time' ? '🎧 கேட்கிறது...' : '🎙️ நேரம்'}
            </button>
          </div>
          <button
            onClick={handleSaveConsultation}
            disabled={isAnyInteractionActive || !newConsultation.doctorName.trim() || !newConsultation.date.trim() || !newConsultation.time.trim()}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: (isAnyInteractionActive || !newConsultation.doctorName.trim() || !newConsultation.date.trim() || !newConsultation.time.trim()) ? 'not-allowed' : 'pointer', fontSize: '16px', marginRight: '10px' }}
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

export default ConsultationsPage;