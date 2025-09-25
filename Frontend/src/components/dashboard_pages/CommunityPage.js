// src/components/dashboard_pages/CommunityPage.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';

const CommunityPage = forwardRef(({ username, generateAudio, startTemporaryListening, isListening, isSpeaking, token }, ref) => {
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentFieldListening, setCurrentFieldListening] = useState(null); // For voice input for new post
  const [showNewPostForm, setShowNewPostForm] = useState(false); // To toggle new post input area

  const hasFetchedPosts = useRef(false);
  const postsRefreshIntervalRef = useRef(null); // For periodically fetching new posts

  // Refs for volatile props/state to stabilize fetch/voice logic
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef(isSpeaking);
  const usernameRef = useRef(username); // To ensure we have the latest username for new posts

  // Expose methods to parent (Dashboard) via ref for voice commands
  useImperativeHandle(ref, () => ({
    handleNewPostClick: handleNewPostClick,
    handleSavePostClick: handleSavePost,
    handleCancelPostClick: handleCancelPost, // Corrected to handleCancelPost
  }));

  // Update refs whenever the props/state they mirror change
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { usernameRef.current = username; }, [username]);


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

  // Fetch all community posts
  const fetchPosts = useCallback(async () => {
    if (!token) {
      setMessage('Error: No authentication token found.');
      generateAudio('பிழை: அங்கீகார டோக்கன் இல்லை.');
      setInitialLoading(false);
      return;
    }

    if (!initialLoading) {
      setLoading(true);
      setMessage('இடுகைகளைப் பெறுகிறது...');
    }
    console.log('CommunityPage: Fetching posts...');
    try {
      const res = await fetch('http://localhost:5000/api/community/posts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'இடுகைகளைப் பெற முடியவில்லை');
      }
      setPosts(data);
      setMessage('இடுகைகள் ஏற்றப்பட்டன.');
      if (data.length === 0 && !hasFetchedPosts.current) {
         generateAudio('தற்போது சமூகத்தில் எந்த இடுகைகளும் இல்லை. புதிய இடுகையைச் சேர்க்கவும்.');
      }
      hasFetchedPosts.current = true;
    } catch (err) {
      console.error('CommunityPage: Error fetching posts:', err);
      setMessage('பிழை: இடுகைகளைப் பெற முடியவில்லை. ' + err.message);
      generateAudio('பிழை: இடுகைகளைப் பெற முடியவில்லை.');
    }
    setLoading(false);
    setInitialLoading(false);
  }, [token, generateAudio, initialLoading]);

  // Effect to run fetch on component mount and set up refresh interval
  useEffect(() => {
    if (!hasFetchedPosts.current) {
      fetchPosts();
    }

    // Set up interval to refresh posts every 30 seconds (adjust as needed)
    postsRefreshIntervalRef.current = setInterval(fetchPosts, 30 * 1000);

    return () => {
      if (postsRefreshIntervalRef.current) {
        clearInterval(postsRefreshIntervalRef.current);
      }
    };
  }, [fetchPosts]); // fetchPosts is a stable useCallback

  // Handler for new post input change
  const handleNewPostContentChange = (e) => {
    setNewPostContent(e.target.value);
  };

  // Callback to start speech recognition for new post content
  const startListeningForPostContent = useCallback(() => {
    if (isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
      generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
      return;
    }

    setCurrentFieldListening('newPostContent');
    setMessage('🎧 புதிய இடுகைக்காக கேட்கிறது...');
    console.log('CommunityPage: Starting listening for new post content');

    startTemporaryListening(
      (text) => { // onResult callback
        console.log('CommunityPage: Speech recognized for new post content:', text);
        setNewPostContent(text);
        setMessage(`இடுகை பதிவு செய்யப்பட்டது: ${text}`);
        setCurrentFieldListening(null);
      },
      (error) => { // onError callback
        console.error('CommunityPage: Error in recognition for new post content:', error);
        setMessage('பிழை: ' + error);
        setCurrentFieldListening(null);
        generateAudio('பேச்சை அடையாளம் காண முடியவில்லை அல்லது ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      },
      () => { // onNoInput callback
        console.log('CommunityPage: No input detected for new post content.');
        setMessage('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
        setCurrentFieldListening(null);
        generateAudio('உள்ளீடு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.');
      }
    );
  }, [currentFieldListening, startTemporaryListening, generateAudio, isListeningRef, isSpeakingRef]);


  // Save new post API call
  const handleSavePost = async () => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening || !newPostContent.trim()) {
      generateAudio('இடுகை உள்ளடக்கத்தை வழங்கவும்.');
      setMessage('இடுகை உள்ளடக்கத்தை வழங்கவும்.');
      return;
    }

    setLoading(true);
    setMessage('இடுகை சேர்க்கப்படுகிறது...');
    generateAudio('இடுகை சேர்க்கப்படுகிறது.');
    console.log('CommunityPage: Saving new post:', newPostContent);

    try {
      const res = await fetch('http://localhost:5000/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ content: newPostContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || (data.errors && data.errors[0] && data.errors[0].msg) || 'இடுகையைச் சேமிக்க முடியவில்லை');
      }

      // Re-fetch all posts to get the updated list including the new one
      await fetchPosts();
      setNewPostContent(''); // Clear the form
      setShowNewPostForm(false); // Hide the form
      setMessage('இடுகை வெற்றிகரமாக சேர்க்கப்பட்டது!');
      generateAudio('இடுகை வெற்றிகரமாக சேர்க்கப்பட்டது!');
    } catch (err) {
      console.error('CommunityPage: Error saving post:', err);
      setMessage('பிழை: இடுகையைச் சேமிக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: இடுகையைச் சேமிக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Delete post API call
  const handleDeletePost = async (postId, postContent) => {
    if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) return;

    if (!window.confirm(`"${postContent.substring(0, 30)}..." என்ற இடுகையை நீக்க வேண்டுமா?`)) {
      return;
    }

    setLoading(true);
    setMessage('இடுகை நீக்கப்படுகிறது...');
    generateAudio('இடுகை நீக்கப்படுகிறது.');
    console.log('CommunityPage: Deleting post:', postId);

    try {
      const res = await fetch(`http://localhost:5000/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || 'இடுகையை நீக்க முடியவில்லை');
      }

      // Re-fetch all posts to get the updated list
      await fetchPosts();
      setMessage('இடுகை வெற்றிகரமாக நீக்கப்பட்டது!');
      generateAudio('இடுகை வெற்றிகரமாக நீக்கப்பட்டது!');
    } catch (err) {
      console.error('CommunityPage: Error deleting post:', err);
      setMessage('பிழை: இடுகையை நீக்க முடியவில்லை. ' + err.message);
      generateAudio('பிழை: இடுகையை நீக்க முடியவில்லை.');
    }
    setLoading(false);
  };

  // Voice command action for adding a new post
  const handleNewPostClick = () => {
      if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewPostContent(''); // Clear any previous content
      setShowNewPostForm(true); // Show the form
      setMessage('புதிய இடுகையை உருவாக்கவும்.');
      generateAudio('புதிய இடுகையை உருவாக்கவும். உங்கள் செய்தியைச் சொல்லவும்.');
  };

  // Voice command action for saving a post (maps to handleSavePost)
  const handleSavePostClick = () => {
      handleSavePost();
  };

  // Voice command action for canceling a new post (renamed from handleCancelPostClick)
  const handleCancelPost = () => { // Corrected function name
      if (loading || isListeningRef.current || isSpeakingRef.current || currentFieldListening) {
          generateAudio('நான் ஏற்கனவே பேசிக்கொண்டிருக்கிறேன் அல்லது கேட்கிறேன். காத்திருக்கவும்.');
          return;
      }
      setNewPostContent('');
      setShowNewPostForm(false);
      setMessage('புதிய இடுகை ரத்து செய்யப்பட்டது.');
      generateAudio('புதிய இடுகை ரத்து செய்யப்பட்டது.');
  };

  const isAnyInteractionActive = loading || isListening || isSpeaking || currentFieldListening;

  if (initialLoading) {
    return (
      <div style={{
        padding: '40px 20px',
        backgroundColor: '#e6f3f3',
        border: '1px solid #d4edda',
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
            border: '4px solid #d4edda',
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
        <h3>👥 சமூகப் பக்கம்</h3>
        <p>இடுகைகள் ஏற்றப்படுகிறது...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#e6f3f3', border: '1px solid #d4edda', borderRadius: '8px', marginTop: '20px' }}>
      <h3>👥 சமூகப் பக்கம்</h3>
      <p>சமூக ஆதரவு குழுக்கள் மற்றும் மன்றங்களில் இணையலாம்.</p>

      {/* New Post Form */}
      {showNewPostForm ? (
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#007bff' }}>புதிய இடுகையைச் சேர்:</h4>
          <textarea
            value={newPostContent}
            onChange={handleNewPostContentChange}
            placeholder="உங்கள் எண்ணங்களை இங்கே உள்ளிடவும் அல்லது பேசவும்..."
            rows="4"
            disabled={isAnyInteractionActive}
            style={{ width: 'calc(100% - 20px)', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
          ></textarea>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button
              onClick={startListeningForPostContent}
              disabled={isAnyInteractionActive}
              style={{ flex: 1, padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: isAnyInteractionActive ? '#ccc' : '#007bff', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              {currentFieldListening === 'newPostContent' ? '🎧 கேட்கிறது...' : '🎙️ இடுகையைச் சொல்லவும்'}
            </button>
            <button
              onClick={handleSavePost}
              disabled={isAnyInteractionActive || !newPostContent.trim()}
              style={{ flex: 1, padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: (isAnyInteractionActive || !newPostContent.trim()) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'சேமிக்கிறது...' : '💾 இடுகையைச் சேமி'}
            </button>
            <button
              onClick={handleCancelPost} // Corrected to handleCancelPost
              disabled={isAnyInteractionActive}
              style={{ flex: 1, padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer' }}
            >
              ❌ ரத்து செய்
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '25px' }}>
            <button
              onClick={handleNewPostClick}
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
                marginBottom: '20px'
              }}
            >
              ➕ புதிய இடுகையைச் சேர்க்கவும்
            </button>
        </div>
      )}


      {/* Community Feed */}
      <div style={{ marginBottom: '25px' }}>
        <h4 style={{ marginBottom: '10px', color: '#007bff' }}>சமீபத்திய இடுகைகள்:</h4>
        {posts.length === 0 ? (
          <p>தற்போது எந்த இடுகைகளும் இல்லை.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: '0' }}>
            {posts.map((post) => (
              <li key={post._id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '16px', lineHeight: '1.5' }}>{post.content}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#666' }}>
                  <span>Posted by <strong>{post.username}</strong></span>
                  <span>{formatTimestamp(post.createdAt)}</span>
                  {/* Only allow deletion for the post owner */}
                  {post.userId === token.id && ( // Assuming token.id is the current user's ID
                    <button
                      onClick={() => handleDeletePost(post._id, post.content)}
                      disabled={isAnyInteractionActive}
                      style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: '#dc3545', color: 'white', cursor: isAnyInteractionActive ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                    >
                      🗑️ நீக்கு
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <p style={{ marginTop: '15px', color: '#333', fontSize: '14px' }}>{message}</p>}
    </div>
  );
});

export default CommunityPage;