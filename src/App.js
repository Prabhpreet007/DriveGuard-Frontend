import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alertInfo, setAlertInfo] = useState({});
  const [thresholds, setThresholds] = useState({
    ear_threshold: 0.22,
    mar_threshold: 0.40,
    tilt_threshold: 15
  });
  const [enableSound, setEnableSound] = useState(true);
  const [cameraError, setCameraError] = useState('');

  // Backend URL - production mein change hoga
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://driveguard-backend-2.onrender.com/api' 
    : 'http://localhost:5000';

  // Camera start karna
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraError('');
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Camera access denied. Please allow camera permissions.');
    }
  };

  // Camera stop karna
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsMonitoring(false);
  };

  // Frame capture and process
  const captureAndProcessFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/jpeg', 0.8);

      try {
        const response = await axios.post(`${API_BASE}/api/process-frame`, {
          frame: frameData,
          thresholds: thresholds
        });

        setAlertInfo(response.data);

        // Alert sound play karna
        if (response.data.alert && enableSound) {
          playAlertSound();
        }
      } catch (error) {
        console.error('Processing error:', error);
      }
    }
  };

  // Alert sound
  const playAlertSound = () => {
    const audio = new Audio('/alert.mp3'); // Public folder mein alert.mp3 daalna
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  // Monitoring start/stop
  const toggleMonitoring = async () => {
    if (!isMonitoring) {
      await startCamera();
      setIsMonitoring(true);
      // Har 100ms mein frame process karo
      intervalRef.current = setInterval(captureAndProcessFrame, 100);
    } else {
      stopCamera();
    }
  };

  // Component unmount pe cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚗 DriveGuard - Drowsiness Detection</h1>
        <p>Real-time driver monitoring system</p>
      </header>

      <div className="container">
        {/* Left Sidebar - Controls */}
        <div className="sidebar">
          <div className="control-section">
            <h3>⚙️ Threshold Settings</h3>
            
            <div className="slider-group">
              <label>Eye Aspect Ratio: {thresholds.ear_threshold}</label>
              <input
                type="range"
                min="0.15"
                max="0.35"
                step="0.01"
                value={thresholds.ear_threshold}
                onChange={(e) => setThresholds({...thresholds, ear_threshold: parseFloat(e.target.value)})}
              />
            </div>

            <div className="slider-group">
              <label>Mouth Aspect Ratio: {thresholds.mar_threshold}</label>
              <input
                type="range"
                min="0.4"
                max="0.8"
                step="0.01"
                value={thresholds.mar_threshold}
                onChange={(e) => setThresholds({...thresholds, mar_threshold: parseFloat(e.target.value)})}
              />
            </div>

            <div className="slider-group">
              <label>Head Tilt Threshold: {thresholds.tilt_threshold}°</label>
              <input
                type="range"
                min="10"
                max="30"
                step="1"
                value={thresholds.tilt_threshold}
                onChange={(e) => setThresholds({...thresholds, tilt_threshold: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div className="control-section">
            <h3>🔊 Alert Settings</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableSound}
                onChange={(e) => setEnableSound(e.target.checked)}
              />
              Enable Sound Alerts
            </label>
          </div>

          <div className="control-section">
            <button 
              className={`monitor-btn ${isMonitoring ? 'stop' : 'start'}`}
              onClick={toggleMonitoring}
            >
              {isMonitoring ? '🛑 Stop Monitoring' : '🎥 Start Monitoring'}
            </button>
          </div>
        </div>

        {/* Main Content - Video and Alerts */}
        <div className="main-content">
          {/* Video Feed */}
          <div className="video-container">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="video-feed"
            />
            <canvas ref={canvasRef} style={{display: 'none'}} />
            
            {cameraError && (
              <div className="error-message">
                {cameraError}
              </div>
            )}

            {!isMonitoring && !cameraError && (
              <div className="placeholder-message">
                Click "Start Monitoring" to begin detection
              </div>
            )}
          </div>

          {/* Status Display */}
          <div className={`status-panel ${alertInfo.alert ? 'alert' : 'normal'}`}>
            <div className="status-header">
              <h3>📊 Real-time Status</h3>
              <span className={`status-badge ${alertInfo.alert ? 'alert' : 'normal'}`}>
                {alertInfo.status || 'READY'}
              </span>
            </div>

            {alertInfo.alert && (
              <div className="alert-banner">
                🚨 ALERT: {alertInfo.type?.toUpperCase()} DETECTED!
              </div>
            )}

            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">👁️ Eye Aspect Ratio</span>
                <span className="metric-value">{alertInfo.metrics?.ear || '0.00'}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">😮 Mouth Aspect Ratio</span>
                <span className="metric-value">{alertInfo.metrics?.mar || '0.00'}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">↔️ Head Tilt</span>
                <span className="metric-value">{alertInfo.metrics?.tilt || '0'}°</span>
              </div>
            </div>

            <div className="frames-info">
              <p>Eye Closed Frames: {alertInfo.metrics?.eye_frames || 0}</p>
              <p>Yawn Frames: {alertInfo.metrics?.yawn_frames || 0}</p>
              <p>Tilt Frames: {alertInfo.metrics?.tilt_frames || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h3>📋 How to Use:</h3>
        <ul>
          <li>Allow camera access when prompted</li>
          <li>Sit straight and look at the camera</li>
          <li>System alerts after continuous detection</li>
          <li>Adjust thresholds based on your environment</li>
        </ul>
        
        <h3>🚨 Detection Timing:</h3>
        <ul>
          <li><strong>Drowsiness:</strong> Eyes closed for 3+ seconds</li>
          <li><strong>Yawning:</strong> Mouth open wide for 2+ seconds</li>
          <li><strong>Head Tilt:</strong> Head tilted for 3+ seconds</li>
        </ul>
      </div>
    </div>
  );
};

export default App;