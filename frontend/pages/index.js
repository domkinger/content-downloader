import React, { useState, useRef, useEffect } from 'react';

const HomePage = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('video');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // Progress state
  const downloadFrame = useRef(null);

  useEffect(() => {
    const wsBaseUrl = `ws://${process.env.NEXT_PUBLIC_BASE_URL}`;
    const ws = new WebSocket(wsBaseUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      console.log('Received:', event.data);
      const data = JSON.parse(event.data);

      if (data.progress) {
        setProgress(data.progress); // Update progress bar
      }

      if (data.status === 'completed') {
        setIsLoading(false);
        setProgress(0); // Reset progress bar
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    return () => {
      ws.close();
    };
  }, []);

  const extractVideoId = (url) => {
    // Updated regular expression to match both standard YouTube and Shorts URLs
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const videoId = extractVideoId(url);
    if (!videoId) {
      alert('Invalid YouTube URL');
      return;
    }

    setIsLoading(true); // Start loading
    const httpBaseUrl = `http://${process.env.NEXT_PUBLIC_BASE_URL}`;
    const endpoint = `${httpBaseUrl}/download/${format}/${videoId}`;
    if (downloadFrame.current) {
      downloadFrame.current.src = endpoint;
    }
  };

  return (
    <div className="retro-container">
      <div className="retro-form">
        <h1 className="retro-title">content-downloader</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="url" className="retro-label">content-url</label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL here"
              className="retro-input w-full"
            />
          </div>
          <div className="form-group">
            <label htmlFor="format" className="retro-label">file-format</label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="retro-select w-full"
            >
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          <button
            type="submit"
            className="retro-button"
          >
            download
          </button>
          {isLoading && (
          <div className="retro-progress-container">
            <div className="retro-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        </form>
      </div>
      <iframe ref={downloadFrame} style={{ display: 'none' }}></iframe>
    </div>
  );
};

export default HomePage;
