import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, Plus, Trash2, Volume2 } from 'lucide-react';
import './App.css';

// Clase Node para la lista doblemente enlazada
class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
    this.prev = null;
  }
}

// Clase DoublyLinkedList - Implementación desde cero
class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  // Insertar al inicio de la lista
  insertToStart(data) {
    const newNode = new Node(data);
    
    if (this.size === 0) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    }
    this.size++;
    return newNode;
  }

  // Insertar al final de la lista
  insertToEnd(data) {
    const newNode = new Node(data);
    
    if (this.size === 0) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }
    this.size++;
    return newNode;
  }

  // Insertar en posición específica
  insertAtPosition(data, position) {
    if (position < 0 || position > this.size) {
      throw new Error('Posición inválida');
    }

    if (position === 0) {
      return this.insertToStart(data);
    }

    if (position === this.size) {
      return this.insertToEnd(data);
    }

    const newNode = new Node(data);
    let current = this.head;
    
    // Navegar hasta la posición
    for (let i = 0; i < position; i++) {
      current = current.next;
    }

    // Insertar el nodo
    newNode.prev = current.prev;
    newNode.next = current;
    current.prev.next = newNode;
    current.prev = newNode;
    
    this.size++;
    return newNode;
  }

  // Eliminar nodo
  remove(node) {
    if (!node) return;

    // Si es el único nodo
    if (this.size === 1) {
      this.head = null;
      this.tail = null;
    }
    // Si es el primer nodo
    else if (node === this.head) {
      this.head = node.next;
      this.head.prev = null;
    }
    // Si es el último nodo
    else if (node === this.tail) {
      this.tail = node.prev;
      this.tail.next = null;
    }
    // Nodo del medio
    else {
      node.prev.next = node.next;
      node.next.prev = node.prev;
    }

    this.size--;
  }

  // Convertir a array para visualización
  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current);
      current = current.next;
    }
    return result;
  }
}

const MusicPlayer = () => {
  // Estado principal
  const [playlist] = useState(() => new DoublyLinkedList());
  const [currentNode, setCurrentNode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Estados del formulario
  const [songName, setSongName] = useState('');
  const [artist, setArtist] = useState('');
  const [insertMode, setInsertMode] = useState('end');
  const [position, setPosition] = useState(0);
  const [, setRefresh] = useState(0); // Para forzar re-render

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Función para forzar actualización de la UI
  const forceUpdate = () => setRefresh(prev => prev + 1);

  // Agregar canción
  const addSong = (audioFile = null) => {
    if (!songName.trim() || !artist.trim()) {
      alert('Por favor complete nombre y artista');
      return;
    }

    const songData = {
      id: Date.now(),
      name: songName,
      artist: artist,
      audioFile: audioFile,
      audioUrl: audioFile ? URL.createObjectURL(audioFile) : null,
      duration: '0:00'
    };

    try {
      let newNode;
      
      switch (insertMode) {
        case 'start':
          newNode = playlist.insertToStart(songData);
          break;
        case 'end':
          newNode = playlist.insertToEnd(songData);
          break;
        case 'position':
          const pos = Math.max(0, Math.min(position, playlist.size));
          newNode = playlist.insertAtPosition(songData, pos);
          break;
        default:
          newNode = playlist.insertToEnd(songData);
      }

      // Si es la primera canción, hacerla actual
      if (playlist.size === 1) {
        setCurrentNode(newNode);
      }

      // Limpiar formulario
      setSongName('');
      setArtist('');
      setPosition(0);
      forceUpdate();
      
    } catch (error) {
      alert('Error al agregar canción: ' + error.message);
    }
  };

  // Manejar archivo de audio
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      addSong(file);
    } else {
      alert('Por favor seleccione un archivo de audio válido');
    }
    event.target.value = ''; // Limpiar input
  };

  // Eliminar canción
  const removeSong = (node) => {
    if (node === currentNode) {
      // Si eliminamos la canción actual, pasar a la siguiente o anterior
      const next = node.next || node.prev;
      setCurrentNode(next);
      setIsPlaying(false);
    }
    
    playlist.remove(node);
    forceUpdate();
  };

  // Navegación
  const goToNext = () => {
    if (currentNode && currentNode.next) {
      setCurrentNode(currentNode.next);
      setIsPlaying(false);
    }
  };

  const goToPrevious = () => {
    if (currentNode && currentNode.prev) {
      setCurrentNode(currentNode.prev);
      setIsPlaying(false);
    }
  };

  // Reproducción
  const togglePlayPause = () => {
    if (!currentNode || !currentNode.data.audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Efectos de audio - Solo para cambio de canción
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentNode?.data.audioUrl) return;

    audio.src = currentNode.data.audioUrl;
    audio.volume = volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto avanzar a siguiente canción
      if (currentNode.next) {
        setCurrentNode(currentNode.next);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentNode]); // Solo depende del currentNode, NO del volume

  // Efecto separado para volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Función para cambiar posición de la canción
  const handleProgressClick = (event) => {
    if (!audioRef.current || !duration) return;
    
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progressWidth = rect.width;
    const newTime = (clickX / progressWidth) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Formatear tiempo
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playlistArray = playlist.toArray();

  return (
    <div className="app-container">
      <div className="main-container">

        <div className="grid">
          
          {/* Panel Principal del Reproductor */}
          <div className="player-panel">
            
            {/* Visualizador de Audio (Decorativo) */}
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

            {/* Información de la canción actual */}
            <div className="current-song">
              {currentNode ? (
                <>
                  <h2>{currentNode.data.name}</h2>
                  <p>{currentNode.data.artist}</p>
                  
                  {/* Barra de progreso */}
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

            {/* Controles de reproducción */}
            <div className="controls">
              <button
                onClick={goToPrevious}
                disabled={!currentNode || !currentNode.prev}
                className="control-btn small"
              >
                <SkipBack size={20} />
              </button>
              
              <button
                onClick={togglePlayPause}
                disabled={!currentNode || !currentNode.data.audioUrl}
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
                disabled={!currentNode || !currentNode.next}
                className="control-btn small"
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Control de volumen */}
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

          {/* Panel de Control */}
          <div className="control-panel">
            
            {/* Formulario para agregar canciones */}
            <div className="form-panel">
              <h3>Agregar Canción</h3>
              
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Nombre de la canción"
                  value={songName}
                  onChange={(e) => setSongName(e.target.value)}
                  className="form-input"
                />
                
                <input
                  type="text"
                  placeholder="Artista"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="form-input"
                />

                {/* Selector de modo de inserción */}
                <select
                  value={insertMode}
                  onChange={(e) => setInsertMode(e.target.value)}
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
                    max={playlist.size}
                    value={position}
                    onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                    placeholder={`Posición (0-${playlist.size})`}
                    className="form-input"
                  />
                )}

                <div className="button-group">
                  <button
                    onClick={() => addSong()}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    <span>Agregar</span>
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="btn btn-secondary"
                  >
                    <Upload size={16} />
                  </button>
                </div>
                
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
                  <span className="info-value pink">{playlist.size}</span>
                </div>
                
                <div className="info-row">
                  <span>Head:</span>
                  <span className="info-value green">
                    {playlist.head ? playlist.head.data.name : 'null'}
                  </span>
                </div>
                
                <div className="info-row">
                  <span>Tail:</span>
                  <span className="info-value blue">
                    {playlist.tail ? playlist.tail.data.name : 'null'}
                  </span>
                </div>
                
                <div className="info-row">
                  <span>Actual:</span>
                  <span className="info-value yellow">
                    {currentNode ? currentNode.data.name : 'null'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de canciones */}
        <div className="playlist-panel">
          <h3 style={{color: 'white', marginBottom: '16px'}}>
            Playlist ({playlist.size} canciones)
          </h3>
          
          {playlistArray.length > 0 ? (
            <div>
              {playlistArray.map((node, index) => (
                <div
                  key={node.data.id}
                  className={`playlist-item ${node === currentNode ? 'current' : ''}`}
                >
                  <div className="playlist-item-info">
                    <div className="playlist-number">
                      <span>{index + 1}</span>
                    </div>
                    
                    <div className="playlist-details">
                      <h4>{node.data.name}</h4>
                      <p>{node.data.artist}</p>
                      
                      {/* Indicadores de conexiones */}
                      <div className="playlist-connections">
                        {node.prev && <span>← {node.prev.data.name.substring(0, 10)}...</span>}
                        {node.prev && node.next && <span> | </span>}
                        {node.next && <span>{node.next.data.name.substring(0, 10)}... →</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="playlist-actions">
                    <button
                      onClick={() => setCurrentNode(node)}
                      className="btn-small btn-play"
                    >
                      Reproducir
                    </button>
                    
                    <button
                      onClick={() => removeSong(node)}
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
              <p style={{fontSize: '0.875rem', marginTop: '8px'}}>Agrega algunas canciones para comenzar</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio element */}
      <audio ref={audioRef} />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <MusicPlayer />
    </div>
  );
}

export default App;