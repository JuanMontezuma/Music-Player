import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, Plus, Trash2, Volume2 } from 'lucide-react';
import { parseBlob } from 'music-metadata-browser';
import './App.css';

// URL de la API
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar canciones desde el backend
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

  // Cargar canciones al iniciar
  useEffect(() => {
    loadSongs();
  }, []);

  // Manejar archivo de audio
  // Manejar archivo de audio
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  
  if (!file) return;
  
  if (!file.type.startsWith('audio/')) {
    alert('Por favor seleccione un archivo de audio válido');
    event.target.value = '';
    return;
  }

  let songNameFromFile = '';
  let artistFromFile = '';

  try {
    // Intentar leer metadatos del archivo
    const metadata = await parseBlob(file);
    songNameFromFile = metadata.common.title || '';
    artistFromFile = metadata.common.artist || '';
  } catch (error) {
    console.log('No se pudieron leer metadatos, usando nombre del archivo');
  }

  // Si no hay metadatos, usar nombre del archivo
  if (!songNameFromFile) {
    songNameFromFile = file.name.replace(/\.[^/.]+$/, ''); // Remover extensión
  }
  
  if (!artistFromFile) {
    artistFromFile = 'Artista Desconocido';
  }

  try {
    const response = await fetch(`${API_URL}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: songNameFromFile,
        artist: artistFromFile,
        mode: insertMode,
        position: position
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Actualizar canciones con el archivo de audio
      const updatedSongs = data.playlist.map((song: Song) => {
        if (song.id === data.data.id) {
          return { ...song, audioUrl: URL.createObjectURL(file) };
        }
        return song;
      });
      setSongs(updatedSongs);

      // Limpiar campos
      setPosition(0);
      
      alert(`Canción agregada: ${songNameFromFile} - ${artistFromFile}`);
    }
  } catch (error) {
    console.error('Error al agregar canción:', error);
    alert('Error al agregar canción al servidor');
  }
  
  event.target.value = '';
};

  // Eliminar canción
  const removeSong = async (songId: number) => {
    try {
      const response = await fetch(`${API_URL}/songs/${songId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setSongs(data.playlist);
        
        if (currentSong?.id === songId) {
          setCurrentSong(null);
          setIsPlaying(false);
        }
        
        alert('Canción eliminada exitosamente');
      }
    } catch (error) {
      console.error('Error al eliminar canción:', error);
      alert('Error al eliminar canción');
    }
  };

  // Navegación
  const goToNext = () => {
    if (!currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    if (currentIndex < songs.length - 1) {
      setCurrentSong(songs[currentIndex + 1]);
      setIsPlaying(true);
      audioRef.current?.play();
    }
  };

  const goToPrevious = () => {
    if (!currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(songs[currentIndex - 1]);
      setIsPlaying(true);
      audioRef.current?.play();
    }
  };

  // Reproducción
  const togglePlayPause = () => {
    if (!currentSong || !currentSong.audioUrl) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Efectos de audio
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
      <div className="main-container">

        <div className="grid">
          
          <div className="player-panel">
            
            <div className="visualizer">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`bar ${isPlaying ? 'playing' : ''}`}
                  style={{
                    height: `${Math.random() * 80 + 20}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>

            <div className="current-song">
              {currentSong ? (
                <>
                  <h2>{currentSong.name}</h2>
                  <p>{currentSong.artist}</p>
                  
                  <div className="progress-bar" onClick={handleProgressClick} style={{cursor: 'pointer'}}>
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
                </>
              ) : (
                <div>
                  <p style={{fontSize: '1.25rem', marginBottom: '8px'}}>No hay canciones en la playlist</p>
                  <p>Agrega una canción para comenzar</p>
                </div>
              )}
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
                {isPlaying ? (
                  <Pause size={24} />
                ) : (
                  <Play size={24} style={{marginLeft: '4px'}} />
                )}
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
              <Volume2 size={20} color="#9ca3af" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
              <span className="volume-text">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          <div className="control-panel">
            
            {/* Formulario para agregar canciones */}
            <div className="form-panel">
              <h3>Agregar Canción</h3>
              
              <div className="form-group">
                {/* Selector de modo de inserción */}
                <select
                  value={insertMode}
                  onChange={(e) => setInsertMode(e.target.value as 'start' | 'end' | 'position')}
                  className="form-input"
                >
                  <option value="start">Al inicio (Head)</option>
                  <option value="end">Al final (Tail)</option>
                  <option value="position">En posición específica</option>
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
                  className="btn btn-primary"
                  style={{width: '100%'}}
                >
                  <Upload size={20} />
                  <span>Subir Archivo de Audio</span>
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

            {/* Información de la estructura */}
            <div className="info-panel">
              <h3>Info de la Lista</h3>
              
              <div>
                <div className="info-row">
                  <span>Total de canciones:</span>
                  <span className="info-value pink">{songs.length}</span>
                </div>
                
                <div className="info-row">
                  <span>Head:</span>
                  <span className="info-value green">
                    {songs.length > 0 ? songs[0].name : 'null'}
                  </span>
                </div>
                
                <div className="info-row">
                  <span>Tail:</span>
                  <span className="info-value blue">
                    {songs.length > 0 ? songs[songs.length - 1].name : 'null'}
                  </span>
                </div>
                
                <div className="info-row">
                  <span>Actual:</span>
                  <span className="info-value yellow">
                    {currentSong ? currentSong.name : 'null'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="playlist-panel">
          <h3 style={{color: 'white', marginBottom: '16px'}}>
            Playlist ({songs.length} canciones)
          </h3>
          
          {songs.length > 0 ? (
            <div>
              {songs.map((song, index) => (
                <div
                  key={song.id}
                  className={`playlist-item ${song.id === currentSong?.id ? 'current' : ''}`}
                >
                  <div className="playlist-item-info">
                    <div className="playlist-number">
                      <span>{index + 1}</span>
                    </div>
                    
                    <div className="playlist-details">
                      <h4>{song.name}</h4>
                      <p>{song.artist}</p>
                      
                      <div className="playlist-connections">
                        {index > 0 && <span>← {songs[index - 1].name.substring(0, 10)}...</span>}
                        {index > 0 && index < songs.length - 1 && <span> | </span>}
                        {index < songs.length - 1 && <span>{songs[index + 1].name.substring(0, 10)}... →</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="playlist-actions">
                    <button
                      onClick={() => setCurrentSong(song)}
                      className="btn-small btn-play"
                    >
                      Reproducir
                    </button>
                    
                    <button
                      onClick={() => removeSong(song.id)}
                      className="btn-small btn-delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No hay canciones en la playlist</p>
              <p style={{fontSize: '0.875rem', marginTop: '8px'}}>Sube un archivo de audio para comenzar</p>
            </div>
          )}
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