// src/components/dashboard_pages/HealthMonitoringPage.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'; // Import icons

// Helper function to calculate BMI
const calculateBMI = (heightCm, weightKg) => {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100; // Convert cm to meters
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
};

// Helper to categorize BMI
const getBMICategory = (bmi) => {
  if (bmi === null) return '';
  if (bmi < 18.5) return 'குறைந்த எடை (Underweight)';
  if (bmi < 24.9) return 'இயல்பான எடை (Normal weight)';
  if (bmi < 29.9) return 'அதிக எடை (Overweight)';
  return 'பருமன் (Obese)';
};

// Helper to format Date object to YYYY-MM-DD string for input fields
const formatDateForInput = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HealthMonitoringPage = forwardRef(({ generateAudio, startTemporaryListening, isListening, isSpeaking, token }, ref) => {
  const [healthRecords, setHealthRecords] = useState([]);
  const [newRecord, setNewRecord] = useState({
    date: formatDateForInput(new Date()), // Default to today's date
    heightCm: '',
    weightKg: '',
    bloodPressure: '',
    sugarLevel: '',
    bloodLevel: '',
    heartBeatRate: '',
  });
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentFieldListening, setCurrentFieldListening] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const hasFetchedRecords = useRef(false);

  // Refs for volatile props/state to stabilize voice logic
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);

  // Expose methods to parent (Dashboard) via ref for voice commands
  useImperativeHandle(ref, () => ({
    handleAddRecordClick: handleAddRecordClick,
    handleSaveRecordClick: handleSaveRecord,
    handleCancelEditClick: handleCancelEdit,
  }));

  // Update refs whenever the props/state they mirror change
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);


  // Fetch health records on component mount
  const fetchHealthRecords = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      setInitialLoading(false);
      return;
    }

    if (!initialLoading) {
      setLoading(true);
      setMessage('சுகாதார பதிவுகளைப் பெறுகிறது...');
    }
    console.log('HealthMonitoringPage: Fetching health records...');
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
        throw new Error(data.msg || 'சுகாதார பதிவுகளைப் பெற முடியவில்லை');
      }
      setHealthRecords(data.healthRecords || []);
      setMessage('சுகாதார பதிவுகள் ஏற்றப்பட்டன.');
      if (data.healthRecords && data.healthRecords.length === 0 && !hasFetchedRecords.current) {
         generateAudio('தற்போது சுகாதார பதிவுகள் எதுவும் இல்லை. புதிய பதிவைச் சேர்க்கவும்.');
         setShowForm(true); // Show form if no records on initial load
      } else if (data.healthRecords && data.healthRecords.length > 0 && !hasFetchedRecords.current) {
         setShowForm(false); // Hide form if records exist on initial load
      }
      hasFetchedRecords.current = true;
    } catch (err) {
      console.error('HealthMonitoringPage: Error fetching health records:', err);
      setMessage('பிழை: சுகாதார பதிவுகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: சுகாதார பதிவுகளைப் பெற முடியவில்லை.');
    }

    setLoading(false);
    setInitialLoading(false);
  }, [token, generateAudio, initialLoading]);

  // Effect to run fetch on component mount
  useEffect(() => {
    if (!hasFetchedRecords.current) {
      fetchHealthRecords();
    }
  }, [fetchHealthRecords]);

  // Handler for form input changes
  const handleRecordInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({ ...prev, [name]: value }));
  };

  // Callback to start speech recognition for a specific field
  const startListeningForField = useCallback((field, promptText) => {
    if (isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening(field);
    setMessage(`🎧 ${promptText} க்காக கேட்கிறது...`);
    console.log(`HealthMonitoringPage: Starting listening for ${field}`);

    startTemporaryListening(
      (text) => { // onResult callback
        console.log(`HealthMonitoringPage: Speech recognized for ${field}:`, text);
        // Special handling for number fields
        if (['heightCm', 'weightKg', 'heartBeatRate'].includes(field)) {
          const num = parseFloat(text);
          if (isNaN(num) || num <= 0) {
            setMessage(`தவறு: ${promptText} ஒரு நேர்மறை எண்ணாக இருக்க வேண்டும்.`);
            generateAudio(`தவறு: ${promptText} ஒரு நேர்மறை எண்ணாக இருக்க வேண்டும்.`);
            setCurrentFieldListening(null);
            return;
          }
          setNewRecord(prev => ({ ...prev, [field]: String(num) })); // Store as string for input value
        } else if (field === 'date') {
            const parsedDate = new Date(text);
            if (!isNaN(parsedDate) && parsedDate.getFullYear() > 1900) { // Basic validation
                setNewRecord(prev => ({ ...prev, [field]: formatDateForInput(parsedDate) }));
            } else {
                setMessage('தவறு: தேதி அங்கீகரிக்கப்படவில்லை. YYYY-MM-DD வடிவத்தில் சொல்லவும்.');
                generateAudio('தவறு: தேதி அங்கீகரிக்கப்படவில்லை. YYYY-MM-DD வடிவத்தில் சொல்லவும்.');
            }
        }
        else {
          setNewRecord(prev => ({ ...prev, [field]: text }));
        }
        setMessage(`${promptText} பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null);
      },
      (error) => { // onError callback
        console.error(`HealthMonitoringPage: Error in recognition for ${field}:`, error);
        setMessage('பிழை: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log(`HealthMonitoringPage: No input detected for ${field}.`);
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [currentFieldListening, startTemporaryListening, generateAudio, isListeningRef, isSpeakingRef]);

  // Add/Update Health Record API call
  const handleSaveRecord = async () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening ||
        !newRecord.date.trim() || !newRecord.heightCm.trim() || !newRecord.weightKg.trim()) {
      generateAudio('தேதி, உயரம் மற்றும் எடை தேவை.');
      setMessage('தேதி, உயரம் மற்றும் எடை தேவை.');
      return;
    }

    // Validate numbers
    const height = parseFloat(newRecord.heightCm);
    const weight = parseFloat(newRecord.weightKg);
    if (isNaN(height) || height <= 0 || isNaN(weight) || weight <= 0) {
        generateAudio('உயரம் மற்றும் எடை நேர்மறை எண்களாக இருக்க வேண்டும்.');
        setMessage('உயரம் மற்றும் எடை நேர்மறை எண்களாக இருக்க வேண்டும்.');
        return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newRecord.date)) {
      generateAudio('தேதி YYYY-MM-DD வடிவத்தில் இருக்க வேண்டும்.');
      setMessage('தேதி YYYY-MM-DD வடிவத்தில் இருக்க வேண்டும்.');
      return;
    }

    setLoading(true);
    setMessage(editingRecordId ? 'சுகாதார பதிவு புதுப்பிக்கப்படுகிறது...' : 'புதிய சுகாதார பதிவு சேர்க்கப்படுகிறது...');
    generateAudio(editingRecordId ? 'சுகாதார பதிவு புதுப்பிக்கப்படுகிறது.' : 'புதிய சுகாதார பதிவு சேர்க்கப்படுகிறது.');
    console.log('HealthMonitoringPage: Saving record:', newRecord);

    try {
      const method = editingRecordId ? 'PUT' : 'POST';
      const url = editingRecordId
        ? `http://localhost:5000/api/profile/health-records/${editingRecordId}`
        : 'http://localhost:5000/api/profile/health-records';

      // Prepare data for API, converting numbers and handling empty strings/nulls
      const dataToSend = {
        date: newRecord.date,
        heightCm: height,
        weightKg: weight,
        bloodPressure: newRecord.bloodPressure.trim() || '',
        sugarLevel: newRecord.sugarLevel.trim() || '',
        bloodLevel: newRecord.bloodLevel.trim() || '',
        heartBeatRate: newRecord.heartBeatRate.trim() !== '' ? parseInt(newRecord.heartBeatRate, 10) : null,
      };

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'சுகாதார பதிவைச் சேமிக்க முடியவில்லை');
      }

      setHealthRecords(data); // Update state with the new list
      setNewRecord({ // Clear form, default date to today
        date: formatDateForInput(new Date()),
        heightCm: '', weightKg: '', bloodPressure: '', sugarLevel: '', bloodLevel: '', heartBeatRate: ''
      });
      setEditingRecordId(null);
      setMessage('சுகாதார பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!');
      generateAudio('சுகாதார பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!');
      setShowForm(false); // Hide form after successful save
    } catch (err) {
      console.error('HealthMonitoringPage: Error saving record:', err);
      setMessage('பிழை: சுகாதார பதிவைச் சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: சுகாதார பதிவைச் சேமிக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Delete Health Record API call
  const handleDeleteRecord = async (recordId, recordDate) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;

    if (!window.confirm(`${recordDate} தேதிக்கான சுகாதார பதிவை நீக்க வேண்டுமா?`)) {
      return;
    }

    setLoading(true);
    setMessage('சுகாதார பதிவு நீக்கப்படுகிறது...');
    generateAudio('சுகாதார பதிவு நீக்கப்படுகிறது.');
    console.log('HealthMonitoringPage: Deleting record:', recordId);

    try {
      const res = await fetch(`http://localhost:5000/api/profile/health-records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'சுகாதார பதிவை நீக்க முடியவில்லை');
      }
      setHealthRecords(data); // Update state with the new list
      setMessage('சுகாதார பதிவு வெற்றிகரமாக நீக்கப்பட்டது!');
      generateAudio('சுகாதார பதிவு வெற்றிகரமாக நீக்கப்பட்டது!');
      if (data.length === 0) {
          setShowForm(true); // If list becomes empty after delete, show form
      }
    } catch (err) {
      console.error('HealthMonitoringPage: Error deleting record:', err);
      setMessage('பிழை: சுகாதார பதிவை நீக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: சுகாதார பதிவை நீக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Start editing an existing record
  const handleEditClick = (record) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewRecord({
      date: formatDateForInput(record.date),
      heightCm: String(record.heightCm),
      weightKg: String(record.weightKg),
      bloodPressure: record.bloodPressure || '',
      sugarLevel: record.sugarLevel || '',
      bloodLevel: record.bloodLevel || '',
      heartBeatRate: record.heartBeatRate !== null && record.heartBeatRate !== undefined ? String(record.heartBeatRate) : '',
    });
    setEditingRecordId(record._id);
    setMessage(`${formatDateForInput(record.date)} தேதிக்கான பதிவு திருத்தப்படுகிறது...`);
    generateAudio(`${formatDateForInput(record.date)} தேதிக்கான பதிவு திருத்தப்படுகிறது.`);
    setShowForm(true); // Show form when editing
  };

  // Cancel adding or editing a record
  const handleCancelEdit = () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;
    setNewRecord({ // Clear form, default date to today
      date: formatDateForInput(new Date()),
      heightCm: '', weightKg: '', bloodPressure: '', sugarLevel: '', bloodLevel: '', heartBeatRate: ''
    });
    setEditingRecordId(null);
    setMessage('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    generateAudio('திருத்தங்கள் ரத்து செய்யப்பட்டன.');
    setShowForm(false); // Hide form on cancel
  };

  // Voice command action for adding a record (exposed via ref)
  const handleAddRecordClick = () => {
      if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewRecord({ // Clear form for new entry, default date to today
        date: formatDateForInput(new Date()),
        heightCm: '', weightKg: '', bloodPressure: '', sugarLevel: '', bloodLevel: '', heartBeatRate: ''
      });
      setEditingRecordId(null); // Ensure not in edit mode
      setMessage('புதிய சுகாதார பதிவைச் சேர்க்கவும்.');
      generateAudio('புதிய சுகாதார பதிவைச் சேர்க்கவும். தேதி, உயரம், எடை போன்ற விவரங்களைச் சொல்லவும்.');
      setShowForm(true); // Show form via voice command
  };

  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  if (initialLoading) {
    return (
      <div style={{
        padding: '40px 20px',
        backgroundColor: '#e2f0d9',
        border: '1px solid #c3e6cb',
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
            border: '4px solid #c3e6cb',
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
        <h3>📋 சுகாதார கண்காணிப்பு</h3>
        <p>சுகாதார பதிவுகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#e2f0d9', border: '1px solid #c3e6cb', borderRadius: '8px', marginTop: '20px' }}>
      <h3>📋 சுகாதார கண்காணிப்பு பக்கம்</h3>
      <p>உங்கள் உடல்நலத் தரவுகள் மற்றும் கண்காணிப்பு அறிக்கைகள் இங்கே காட்டப்படும்.</p>

      {/* Health Records List Section */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ marginBottom: '10px', color: '#007bff' }}>உங்கள் பதிவுகள்:</h4>
        {healthRecords.length === 0 && !showForm ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '2px dashed #ddd',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>பதிவுகள் எதுவும் இல்லை</h4>
            <p style={{ marginBottom: '20px' }}>தற்போது எந்த சுகாதார பதிவுகளும் சேர்க்கப்படவில்லை.</p>
            <button
              onClick={handleAddRecordClick}
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
              <FaPlus style={{ marginRight: '8px' }} /> முதல் பதிவைச் சேர்க்கவும்
            </button>
          </div>
        ) : (
          <>
            {healthRecords.length > 0 && (
              <ul style={{ listStyleType: 'none', padding: '0' }}>
                {/* Sort records by date (most recent first) */}
                {healthRecords
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((record) => (
                  <li key={record._id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '1.1em' }}>தேதி: {new Date(record.date).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                      <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditClick(record)} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ffc107', backgroundColor: '#ffc107', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                          <FaEdit style={{ verticalAlign: 'middle', marginRight: '3px' }} /> திருத்து
                        </button>
                        <button onClick={() => handleDeleteRecord(record._id, new Date(record.date).toLocaleDateString('ta-IN'))} disabled={isAnyInteractionActive} style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: '#dc3545', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}>
                          <FaTrash style={{ verticalAlign: 'middle', marginRight: '3px' }} /> நீக்கு
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.95em', color: '#555' }}>
                      <p style={{ margin: 0 }}><strong>உயரம்:</strong> {record.heightCm} cm</p>
                      <p style={{ margin: 0 }}><strong>எடை:</strong> {record.weightKg} kg</p>
                      <p style={{ margin: 0 }}><strong>BMI:</strong> {record.bmi} ({getBMICategory(record.bmi)})</p>
                      <p style={{ margin: 0 }}><strong>BP:</strong> {record.bloodPressure || 'இல்லை'}</p>
                      <p style={{ margin: 0 }}><strong>சர்க்கரை:</strong> {record.sugarLevel || 'இல்லை'}</p>
                      <p style={{ margin: 0 }}><strong>இரத்த அளவு:</strong> {record.bloodLevel || 'இல்லை'}</p>
                      <p style={{ margin: 0 }}><strong>இதயத் துடிப்பு:</strong> {record.heartBeatRate !== null ? `${record.heartBeatRate} bpm` : 'இல்லை'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {healthRecords.length > 0 && !showForm && (
              <button
                onClick={handleAddRecordClick}
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
                <FaPlus style={{ marginRight: '8px' }} /> மேலும் பதிவு சேர்க்கவும்
              </button>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Health Record Form Section - Only show when showForm is true */}
      {showForm && (
        <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#007bff' }}>{editingRecordId ? 'சுகாதார பதிவைத் திருத்து' : 'புதிய சுகாதார பதிவைச் சேர்'}:</h4>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>தேதி (Date):</label>
            <input
              type="date"
              name="date"
              value={newRecord.date}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            {/* Voice input for date is removed for type="date" */}
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>உயரம் (Height in cm):</label>
            <input
              type="number"
              name="heightCm"
              value={newRecord.heightCm}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('heightCm', 'உயரம்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'heightCm' ? '🎧 கேட்கிறது...' : '🎙️ உயரம்'}
            </button>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>எடை (Weight in kg):</label>
            <input
              type="number"
              name="weightKg"
              value={newRecord.weightKg}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('weightKg', 'எடை')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'weightKg' ? '🎧 கேட்கிறது...' : '🎙️ எடை'}
            </button>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>இரத்த அழுத்தம் (Blood Pressure - எ.கா: 120/80):</label>
            <input
              type="text"
              name="bloodPressure"
              value={newRecord.bloodPressure}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('bloodPressure', 'இரத்த அழுத்தம்')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'bloodPressure' ? '🎧 கேட்கிறது...' : '🎙️ BP'}
            </button>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>சர்க்கரை அளவு (Sugar Level - எ.கா: 100 mg/dL):</label>
            <input
              type="text"
              name="sugarLevel"
              value={newRecord.sugarLevel}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('sugarLevel', 'சர்க்கரை அளவு')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'sugarLevel' ? '🎧 கேட்கிறது...' : '🎙️ சர்க்கரை'}
            </button>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>இரத்த அளவு (Blood Level - எ.கா: 14 g/dL):</label>
            <input
              type="text"
              name="bloodLevel"
              value={newRecord.bloodLevel}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('bloodLevel', 'இரத்த அளவு')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'bloodLevel' ? '🎧 கேட்கிறது...' : '🎙️ இரத்த அளவு'}
            </button>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>இதயத் துடிப்பு (Heart Beat Rate - எ.கா: 72 bpm):</label>
            <input
              type="number"
              name="heartBeatRate"
              value={newRecord.heartBeatRate}
              onChange={handleRecordInputChange}
              disabled={isAnyInteractionActive}
              style={{ width: 'calc(100% - 130px)', padding: '8px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={() => startListeningForField('heartBeatRate', 'இதயத் துடிப்பு')}
              disabled={isAnyInteractionActive}
              style={{ padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'heartBeatRate' ? '🎧 கேட்கிறது...' : '🎙️ இதயத் துடிப்பு'}
            </button>
          </div>
          <button
            onClick={handleSaveRecord}
            disabled={isAnyInteractionActive || !newRecord.date.trim() || !newRecord.heightCm.trim() || !newRecord.weightKg.trim()}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: (isAnyInteractionActive || !newRecord.date.trim() || !newRecord.heightCm.trim() || !newRecord.weightKg.trim()) ? 'not-allowed' : 'pointer', fontSize: '16px', marginRight: '10px' }}
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

export default HealthMonitoringPage;