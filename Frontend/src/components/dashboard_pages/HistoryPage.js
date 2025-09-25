// src/components/dashboard_pages/HistoryPage.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { FaHeartbeat, FaPills, FaUserMd, FaComments } from 'react-icons/fa'; // Icons for different history types

// Helper to format timestamps
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('ta-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper to format date for display
const formatDate = (dateObj) => {
  if (!dateObj) return '';
  return new Date(dateObj).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' });
};

// --- NEW: Helper to categorize BMI (copied from HealthMonitoringPage) ---
const getBMICategory = (bmi) => {
  if (bmi === null || isNaN(bmi)) return ''; // Handle null or non-numeric BMI
  if (bmi < 18.5) return 'குறைந்த எடை (Underweight)';
  if (bmi < 24.9) return 'இயல்பான எடை (Normal weight)';
  if (bmi < 29.9) return 'அதிக எடை (Overweight)';
  return 'பருமன் (Obese)';
};
// --- END NEW ---


const HistoryPage = forwardRef(({ generateAudio, startTemporaryListening, isListening, isSpeaking, token, username }, ref) => {
  const [historyItems, setHistoryItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all'); // 'all', 'health', 'medications', 'consultations', 'community'

  const hasFetchedHistory = useRef(false);

  // Refs for volatile props/state to stabilize voice logic
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);

  // Expose methods to parent (Dashboard) via ref for voice commands
  useImperativeHandle(ref, () => ({
    handleFilterChange: (filter) => { // Example: "சுகாதார பதிவுகளைக் காட்டு" -> handleFilterChange('health')
        if (['all', 'health', 'medications', 'consultations', 'community'].includes(filter)) {
            setCurrentFilter(filter);
            generateAudio(`${filter} பதிவுகள் காட்டப்படுகின்றன.`);
        } else {
            generateAudio('தெரியாத வடிகட்டி. அனைத்து பதிவுகளையும் காட்டுகிறது.');
            setCurrentFilter('all');
        }
    },
    // Add other voice-triggered history actions here if needed
  }));

  // Update refs whenever the props/state they mirror change
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);


  // Fetch all relevant data
  const fetchHistory = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      setInitialLoading(false);
      return;
    }

    if (!initialLoading) {
      setLoading(true);
      setMessage('வரலாற்றுப் பதிவுகளைப் பெறுகிறது...');
    }
    console.log('HistoryPage: Fetching all history data...');
    try {
      // Fetch user's profile data (health, medications, consultations)
      const profileRes = await fetch('http://localhost:5000/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileData.msg || 'சுயவிவரத் தரவைப் பெற முடியவில்லை');
      }

      // Fetch community posts (global)
      const communityRes = await fetch('http://localhost:5000/api/community/posts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      const communityPosts = await communityRes.json();
      if (!communityRes.ok) {
        throw new Error(communityPosts.msg || 'சமூக இடுகைகளைப் பெற முடியவில்லை');
      }

      const combinedHistory = [];

      // Add Health Records
      (profileData.healthRecords || []).forEach(record => {
        combinedHistory.push({
          id: record._id,
          type: 'health',
          icon: <FaHeartbeat />,
          date: new Date(record.date),
          description: `சுகாதார பதிவு: உயரம் ${record.heightCm} cm, எடை ${record.weightKg} kg, BMI ${record.bmi}`,
          details: record, // Store full record for display
          timestamp: new Date(record.date).getTime(),
        });
      });

      // Add Medications
      (profileData.medications || []).forEach(med => {
        // Medications don't have a single "date" for history, so we use current date for sorting
        // or you could use a default date like the user's creation date if you want to tie it to something
        combinedHistory.push({
          id: med._id,
          type: 'medications',
          icon: <FaPills />,
          date: new Date(), // Placeholder date for sorting, actual times are in details
          description: `மருந்து: ${med.medicineName} - ${med.dosage}, நேரம்: ${med.times}`,
          details: med,
          timestamp: new Date().getTime(), // For display order, use current time or a default
        });
      });

      // Add Consultations
      (profileData.consultations || []).forEach(cons => {
        combinedHistory.push({
          id: cons._id,
          type: 'consultations',
          icon: <FaUserMd />,
          date: new Date(cons.date),
          description: `ஆலோசனை: டாக்டர் ${cons.doctorName}, தேதி: ${formatDate(cons.date)}, நேரம்: ${cons.time}`,
          details: cons,
          timestamp: new Date(cons.date).getTime(),
        });
      });

      // Add Community Posts (only user's own posts for personal history)
      (communityPosts || []).filter(post => post.userId === profileData._id).forEach(post => {
        combinedHistory.push({
          id: post._id,
          type: 'community',
          icon: <FaComments />,
          date: new Date(post.createdAt),
          description: `சமூக இடுகை: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`,
          details: post,
          timestamp: new Date(post.createdAt).getTime(),
        });
      });

      // Sort all items by timestamp (most recent first)
      combinedHistory.sort((a, b) => b.timestamp - a.timestamp);

      setHistoryItems(combinedHistory);
      setMessage('வரலாற்றுப் பதிவுகள் ஏற்றப்பட்டன.');
      if (combinedHistory.length === 0 && !hasFetchedHistory.current) {
         generateAudio('தற்போது எந்த வரலாற்றுப் பதிவுகளும் இல்லை.');
      }
      hasFetchedHistory.current = true;
    } catch (err) {
      console.error('HistoryPage: Error fetching history:', err);
      setMessage('பிழை: வரலாற்றுப் பதிவுகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: வரலாற்றுப் பதிவுகளைப் பெற முடியவில்லை.');
    }
    setLoading(false);
    setInitialLoading(false);
  }, [token, generateAudio, initialLoading, username]);

  // Effect to run fetch on component mount
  useEffect(() => {
    if (!hasFetchedHistory.current) {
      fetchHistory();
    }
  }, [fetchHistory]);

  // Filtered history items based on currentFilter state
  const filteredHistory = historyItems.filter(item => {
    if (currentFilter === 'all') return true;
    return item.type === currentFilter;
  });

  const isAnyInteractionActive = loading || isListening || isSpeaking;

  if (initialLoading) {
    return (
      <div style={{
        padding: '40px 20px',
        backgroundColor: '#f5f5dc',
        border: '1px solid #e9e9b5',
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
            border: '4px solid #e9e9b5',
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
        <h3>🖥️ வரலாற்றுப் பக்கம்</h3>
        <p>வரலாற்றுப் பதிவுகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5dc', border: '1px solid #e9e9b5', borderRadius: '8px', marginTop: '20px' }}>
      <h3>🖥️ வரலாற்றுப் பக்கம்</h3>
      <p>உங்கள் கடந்தகால செயல்பாடுகள் மற்றும் பதிவுகளை இங்கே காணலாம்.</p>

      {/* Filter Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => setCurrentFilter('all')}
          disabled={isAnyInteractionActive}
          style={{ padding: '8px 15px', borderRadius: '5px', border: `1px solid ${currentFilter === 'all' ? '#007bff' : '#ccc'}`, backgroundColor: currentFilter === 'all' ? '#007bff' : '#f0f0f0', color: currentFilter === 'all' ? 'white' : '#333', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
        >
          அனைத்தும்
        </button>
        <button
          onClick={() => setCurrentFilter('health')}
          disabled={isAnyInteractionActive}
          style={{ padding: '8px 15px', borderRadius: '5px', border: `1px solid ${currentFilter === 'health' ? '#007bff' : '#ccc'}`, backgroundColor: currentFilter === 'health' ? '#007bff' : '#f0f0f0', color: currentFilter === 'health' ? 'white' : '#333', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
        >
          சுகாதாரம்
        </button>
        <button
          onClick={() => setCurrentFilter('medications')}
          disabled={isAnyInteractionActive}
          style={{ padding: '8px 15px', borderRadius: '5px', border: `1px solid ${currentFilter === 'medications' ? '#007bff' : '#ccc'}`, backgroundColor: currentFilter === 'medications' ? '#007bff' : '#f0f0f0', color: currentFilter === 'medications' ? 'white' : '#333', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
        >
          மருந்துகள்
        </button>
        <button
          onClick={() => setCurrentFilter('consultations')}
          disabled={isAnyInteractionActive}
          style={{ padding: '8px 15px', borderRadius: '5px', border: `1px solid ${currentFilter === 'consultations' ? '#007bff' : '#ccc'}`, backgroundColor: currentFilter === 'consultations' ? '#007bff' : '#f0f0f0', color: currentFilter === 'consultations' ? 'white' : '#333', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
        >
          ஆலோசனைகள்
        </button>
        <button
          onClick={() => setCurrentFilter('community')}
          disabled={isAnyInteractionActive}
          style={{ padding: '8px 15px', borderRadius: '5px', border: `1px solid ${currentFilter === 'community' ? '#007bff' : '#ccc'}`, backgroundColor: currentFilter === 'community' ? '#007bff' : '#f0f0f0', color: currentFilter === 'community' ? 'white' : '#333', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
        >
          சமூகம்
        </button>
      </div>

      {/* History Timeline */}
      {filteredHistory.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '2px dashed #ddd',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
          <h4 style={{ color: '#333', marginBottom: '10px' }}>பதிவுகள் எதுவும் இல்லை</h4>
          <p style={{ marginBottom: '20px' }}>தேர்ந்தெடுக்கப்பட்ட வகைக்கு வரலாற்றுப் பதிவுகள் எதுவும் இல்லை.</p>
        </div>
      ) : (
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          {filteredHistory.map((item) => (
            <li key={item.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', color: '#007bff' }}>
                <span style={{ marginRight: '10px', fontSize: '1.2em' }}>{item.icon}</span>
                <strong style={{ fontSize: '1.1em' }}>{item.description.split(':')[0]}</strong> {/* Type of record */}
              </div>
              <p style={{ margin: '0 0 5px 0', fontSize: '16px', lineHeight: '1.5' }}>{item.description.split(':')[1]?.trim() || item.description}</p>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <p style={{ margin: 0 }}><strong>தேதி:</strong> {formatTimestamp(item.timestamp)}</p>
                {/* You can add more detailed display based on item.type and item.details */}
                {item.type === 'health' && (
                  <p style={{ margin: 0 }}>உயரம்: {item.details.heightCm} cm, எடை: {item.details.weightKg} kg, BMI: {item.details.bmi} ({getBMICategory(item.details.bmi)})</p>
                )}
                {item.type === 'medications' && (
                  <p style={{ margin: 0 }}>அளவு: {item.details.dosage}, நேரம்: {item.details.times}</p>
                )}
                {item.type === 'consultations' && (
                  <p style={{ margin: 0 }}>டாக்டர்: {item.details.doctorName}, நேரம்: {item.details.time}</p>
                )}
                {item.type === 'community' && (
                  <p style={{ margin: 0 }}>பயனர்: {item.details.username}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {message && <p style={{ marginTop: '15px', color: '#333', fontSize: '14px' }}>{message}</p>}
    </div>
  );
});

export default HistoryPage;