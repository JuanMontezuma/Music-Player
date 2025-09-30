import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, Trash2, Volume2, Music2 } from 'lucide-react';
import { parseBlob } from 'music-metadata-browser';
import './App.css';

const API_URL = 'http://localhost:5000/api';

interface Song {
  id: number;
  name: string;
  artist: string;
  duration: string;
  has_next: boolean;
  has_prev: boolean;
  audioUrl?: string;
}

const MusicPlayer: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [insertMode, setInsertMode] = useState<'start' | 'end' | 'position'>('end');
  const [position, setPosition] = useState<number>(0);
  const [notification, setNotification] = useState<string>('');

  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(
    Array(40).fill(0).map(() => Math.random() * 70 + 10)
  );

  // Animar el visualizador cuando está reproduciendo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setVisualizerHeights(prev => 
          prev.map(() => Math.random() * 70 + 10)
        );
      }, 150);
    } else {
      setVisualizerHeights(Array(40).fill(10));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSongs = async () => {
    try {
      const response = await fetch(`${API_URL}/songs`);
      const data = await response.json();
      if (data.success) {
        setSongs(data.data);
      }
    } catch (error) {
      console.error('Error al cargar canciones:', error);
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      showNotification('⚠️ Por favor seleccione un archivo de audio válido');
      event.target.value = '';
      return;
    }

    let songNameFromFile = '';
    let artistFromFile = '';

    try {
      const metadata = await parseBlob(file);
      songNameFromFile = metadata.common.title || '';
      artistFromFile = metadata.common.artist || '';
    } catch (error) {
      console.log('No se pudieron leer metadatos');
    }

    if (!songNameFromFile) {
      songNameFromFile = file.name.replace(/\.[^/.]+$/, '');
    }
    if (!artistFromFile) {
      artistFromFile = 'Artista Desconocido';
    }

    try {
      const response = await fetch(`${API_URL}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: songNameFromFile,
          artist: artistFromFile,
          mode: insertMode,
          position: position
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Crear un mapa de archivos de audio por ID
        const audioMap = new Map<number, string>();
        
        // Mantener las URLs de audio existentes
        songs.forEach(song => {
          if (song.audioUrl) {
            audioMap.set(song.id, song.audioUrl);
          }
        });
        
        // Agregar la nueva URL de audio
        audioMap.set(data.data.id, URL.createObjectURL(file));
        
        // Actualizar todas las canciones con sus URLs correspondientes
        const updatedSongs = data.playlist.map((song: Song) => ({
          ...song,
          audioUrl: audioMap.get(song.id)
        }));
        
        setSongs(updatedSongs);
        setPosition(0);
        showNotification(`✅ ${songNameFromFile} agregada`);
      }
    } catch (error) {
      console.error('Error al agregar canción:', error);
      showNotification('❌ Error al agregar canción');
    }
    
    event.target.value = '';
  };

  const removeSong = async (songId: number) => {
    try {
      const response = await fetch(`${API_URL}/songs/${songId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        // Crear un mapa de archivos de audio por ID
        const audioMap = new Map<number, string>();
        
        // Mantener las URLs de audio existentes
        songs.forEach(song => {
          if (song.audioUrl && song.id !== songId) {
            audioMap.set(song.id, song.audioUrl);
          }
        });
        
        // Actualizar todas las canciones con sus URLs correspondientes
        const updatedSongs = data.playlist.map((song: Song) => ({
          ...song,
          audioUrl: audioMap.get(song.id)
        }));
        
        setSongs(updatedSongs);
        
        // Si la canción eliminada es la actual o la lista quedó vacía
        if (currentSong?.id === songId || data.playlist.length === 0) {
          // Detener la reproducción
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          setCurrentSong(null);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
        }
        
        showNotification('🗑️ Canción eliminada');
      }
    } catch (error) {
      console.error('Error al eliminar canción:', error);
      showNotification('❌ Error al eliminar');
    }
  };

  const goToNext = () => {
    if (!currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    if (currentIndex < songs.length - 1) {
      setCurrentSong(songs[currentIndex + 1]);
      setIsPlaying(true);
      setTimeout(() => audioRef.current?.play(), 100);
    }
  };

  const goToPrevious = () => {
    if (!currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(songs[currentIndex - 1]);
      setIsPlaying(true);
      setTimeout(() => audioRef.current?.play(), 100);
    }
  };

  const togglePlayPause = () => {
    if (!currentSong || !currentSong.audioUrl) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.audioUrl) return;

    audio.src = currentSong.audioUrl;
    audio.volume = volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      goToNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    if (isPlaying) {
      audio.play();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progressWidth = rect.width;
    const newTime = (clickX / progressWidth) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentIndex = currentSong ? songs.findIndex(s => s.id === currentSong.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < songs.length - 1;

  return (
    <div className="app-container">
      <style>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          color: #1f2937;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 1000;
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .main-container {
          max-width: 1400px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 32px;
          text-align: center;
          color: white;
        }

        .header h1 {
          font-size: 2.5rem;
          font-weight: bold;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .header p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
        }

        .content {
          padding: 32px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (min-width: 1024px) {
          .grid {
            grid-template-columns: 2fr 1fr;
          }
        }

        .player-panel {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 16px;
          padding: 32px;
          border: 1px solid #60a5fa;
        }

        .visualizer {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          height: 100px;
          margin-bottom: 32px;
          gap: 3px;
        }

        .bar {
          width: 4px;
          background: linear-gradient(to top, #667eea, #764ba2);
          border-radius: 2px;
          transition: height 0.15s ease-out;
          animation: barPulse 1.5s ease-in-out infinite;
        }

        @keyframes barPulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.8); }
        }

        .current-song-display {
          text-align: center;
          margin-bottom: 24px;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          padding: 20px;
        }

        .current-song-display h2 {
          font-size: 1.75rem;
          color: #1f2937;
          margin: 0 0 8px 0;
          font-weight: 600;
        }

        .current-song-display p {
          color: #6b7280;
          font-size: 1.1rem;
          margin: 0 0 16px 0;
        }

        .empty-message {
          color: #9ca3af;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .progress-section {
          margin-bottom: 24px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 3px;
          cursor: pointer;
          overflow: hidden;
          margin-bottom: 8px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-bar:hover {
          height: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 3px;
          transition: width 0.1s linear;
        }

        .time-info {
          display: flex;
          justify-content: space-between;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .control-btn {
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #667eea;
          color: white;
        }

        .control-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .control-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: #9ca3af;
        }

        .control-btn.small {
          width: 48px;
          height: 48px;
        }

        .control-btn.large {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .volume-control {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .volume-slider {
          width: 120px;
          height: 4px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #667eea;
          border-radius: 50%;
          cursor: pointer;
        }

        .volume-text {
          color: #6b7280;
          font-size: 0.875rem;
          min-width: 40px;
          text-align: right;
        }

        .control-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .panel {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #60a5fa;
        }

        .panel h3 {
          font-size: 1.25rem;
          color: #1f2937;
          margin: 0 0 16px 0;
          font-weight: 600;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-input {
          width: 100%;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 14px;
          color: #1f2937;
          outline: none;
          transition: border-color 0.2s;
          font-size: 0.95rem;
        }

        .form-input:focus {
          border-color: #667eea;
        }

        .btn-upload {
          width: 100%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-upload:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #6b7280;
          font-size: 0.95rem;
        }

        .info-value {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .info-value.pink { color: #ec4899; }
        .info-value.green { color: #10b981; }
        .info-value.blue { color: #3b82f6; }
        .info-value.yellow { color: #f59e0b; }

        .playlist-section {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #60a5fa;
        }

        .playlist-section h3 {
          font-size: 1.5rem;
          color: #1f2937;
          margin: 0 0 20px 0;
          font-weight: 600;
        }

        .playlist-items {
          max-height: 400px;
          overflow-y: auto;
        }

        .playlist-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          margin-bottom: 12px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }

        .playlist-item:hover {
          border-color: #667eea;
          transform: translateX(4px);
        }

        .playlist-item.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border-color: #667eea;
        }

        .playlist-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .playlist-number {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }

        .playlist-info {
          flex: 1;
          min-width: 0;
        }

        .playlist-info h4 {
          color: #1f2937;
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .playlist-info p {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }

        .playlist-connections {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        .playlist-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-play {
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-play:hover {
          background: #5568d3;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        .empty-playlist {
          text-align: center;
          padding: 48px 24px;
          color: #9ca3af;
        }

        .empty-playlist svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .hidden {
          display: none;
        }
      `}</style>

      {notification && (
        <div className="notification">{notification}</div>
      )}

      <div className="main-container">
        <div className="header">
          <h1>
            <Music2 size={40} />
            Music Player Pro
          </h1>
        </div>

        <div className="content">
          <div className="grid">
            <div className="player-panel">
              <div className="visualizer">
                {visualizerHeights.map((height, i) => (
                  <div
                    key={i}
                    className="bar"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>

              <div className="current-song-display">
                {currentSong ? (
                  <>
                    <h2>{currentSong.name}</h2>
                  </>
                ) : (
                  <div className="empty-message">
                    <Music2 size={48} color="#9ca3af" />
                    <p>No hay canción seleccionada</p>
                  </div>
                )}
              </div>

              <div className="progress-section">
                <div className="progress-bar" onClick={handleProgressClick}>
                  <div
                    className="progress-fill"
                    style={{
                      width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                    }}
                  />
                </div>
                <div className="time-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="controls">
                <button
                  onClick={goToPrevious}
                  disabled={!currentSong || !hasPrev}
                  className="control-btn small"
                >
                  <SkipBack size={20} />
                </button>
                
                <button
                  onClick={togglePlayPause}
                  disabled={!currentSong || !currentSong.audioUrl}
                  className="control-btn large"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} style={{marginLeft: '2px'}} />}
                </button>
                
                <button
                  onClick={goToNext}
                  disabled={!currentSong || !hasNext}
                  className="control-btn small"
                >
                  <SkipForward size={20} />
                </button>
              </div>

              <div className="volume-control">
                <Volume2 size={20} color="#6b7280" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                />
                <span className="volume-text">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            <div className="control-panel">
              <div className="panel">
                <h3>Agregar Canción</h3>
                <div className="form-group">
                  <select
                    value={insertMode}
                    onChange={(e) => setInsertMode(e.target.value as 'start' | 'end' | 'position')}
                    className="form-input"
                  >
                    <option value="start">🔼 Al inicio (Head)</option>
                    <option value="end">🔽 Al final (Tail)</option>
                    <option value="position">📍 Posición específica</option>
                  </select>

                  {insertMode === 'position' && (
                    <input
                      type="number"
                      min="0"
                      max={songs.length}
                      value={position}
                      onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                      placeholder={`Posición (0-${songs.length})`}
                      className="form-input"
                    />
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-upload"
                  >
                    <Upload size={18} />
                    Subir Archivo de Audio
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="panel">
                <h3>Información de la Lista</h3>
                <div>
                  <div className="info-row">
                    <span className="info-label">Total de canciones:</span>
                    <span className="info-value pink">{songs.length}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Head:</span>
                    <span className="info-value green">
                      {songs.length > 0 ? songs[0].name.substring(0, 20) + (songs[0].name.length > 20 ? '...' : '') : 'null'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Tail:</span>
                    <span className="info-value blue">
                      {songs.length > 0 ? songs[songs.length - 1].name.substring(0, 20) + (songs[songs.length - 1].name.length > 20 ? '...' : '') : 'null'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Actual:</span>
                    <span className="info-value yellow">
                      {currentSong ? currentSong.name.substring(0, 20) + (currentSong.name.length > 20 ? '...' : '') : 'null'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="playlist-section">
            <h3>📋 Playlist ({songs.length} canciones)</h3>
            
            {songs.length > 0 ? (
              <div className="playlist-items">
                {songs.map((song, index) => (
                  <div
                    key={song.id}
                    className={`playlist-item ${song.id === currentSong?.id ? 'active' : ''}`}
                  >
                    <div className="playlist-left">
                      <div className="playlist-number">{index + 1}</div>
                      <div className="playlist-info">
                        <h4>{song.name}</h4>
                        {songs.length > 1 && (
                          <div className="playlist-connections">
                            {index > 0 && `← ${songs[index - 1].name.substring(0, 15)}...`}
                            {index > 0 && index < songs.length - 1 && ' | '}
                            {index < songs.length - 1 && `${songs[index + 1].name.substring(0, 15)}... →`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="playlist-actions">
                      <button
                        onClick={() => {
                          setCurrentSong(song);
                          setIsPlaying(true);
                        }}
                        className="btn-play"
                      >
                        ▶ Reproducir
                      </button>
                      <button
                        onClick={() => removeSong(song.id)}
                        className="btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-playlist">
                <Music2 size={64} color="#9ca3af" />
                <p style={{fontSize: '1.1rem', margin: '0 0 8px 0'}}>No hay canciones en la playlist</p>
                <p style={{fontSize: '0.9rem', margin: 0}}>Sube un archivo de audio para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="App">
      <MusicPlayer />
    </div>
  );
};

export default App;