from flask import Flask, request, jsonify
from flask_cors import CORS
from models import DoublyLinkedList
import json
import os

app = Flask(__name__)
CORS(app)

# Archivo para persistencia de datos
DATA_FILE = 'playlist_data.json'

# Instancia de la lista doblemente enlazada
playlist = DoublyLinkedList()

def load_playlist():
    """Cargar playlist desde archivo JSON al iniciar el servidor"""
    global playlist
    
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Reconstruir la lista con los datos guardados
            for song in data.get('songs', []):
                playlist.insert_to_end(song['name'], song['artist'])
            
            print(f"✅ {playlist.size} canciones cargadas desde {DATA_FILE}")
        except Exception as e:
            print(f"⚠️ Error al cargar playlist: {e}")
            print("Iniciando con playlist vacía")
    else:
        print("📂 No se encontró archivo de datos. Iniciando con playlist vacía")

def save_playlist():
    """Guardar playlist en archivo JSON"""
    try:
        songs_list = playlist.to_list()
        data = {
            'songs': songs_list,
            'total': playlist.size
        }
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Playlist guardada: {playlist.size} canciones")
    except Exception as e:
        print(f"❌ Error al guardar playlist: {e}")

@app.route('/')
def home():
    """Página principal con información de la API"""
    return jsonify({
        'message': '🎵 API del Reproductor de Música',
        'version': '1.0',
        'canciones_guardadas': playlist.size,
        'endpoints': [
            'GET /api/songs - Obtener todas las canciones',
            'POST /api/songs - Agregar canción',
            'DELETE /api/songs/<id> - Eliminar canción',
            'GET /api/songs/<id> - Obtener canción específica',
            'GET /api/info - Información de la lista'
        ]
    })

@app.route('/api/songs', methods=['GET'])
def get_songs():
    """Obtener todas las canciones de la playlist"""
    songs = playlist.to_list()
    return jsonify({
        'success': True,
        'data': songs,
        'count': playlist.size
    })

@app.route('/api/songs', methods=['POST'])
def add_song():
    """Agregar nueva canción a la playlist"""
    data = request.json
    
    name = data.get('name')
    artist = data.get('artist')
    mode = data.get('mode', 'end')
    position = data.get('position', 0)
    
    if not name:
        return jsonify({
            'success': False,
            'message': 'El nombre de la canción es requerido'
        }), 400
    
    if not artist:
        artist = ''
    
    try:
        if mode == 'start':
            new_node = playlist.insert_to_start(name, artist)
        elif mode == 'position':
            new_node = playlist.insert_at_position(name, artist, position)
        else:
            new_node = playlist.insert_to_end(name, artist)
        
        save_playlist()
        
        return jsonify({
            'success': True,
            'message': f'Canción agregada exitosamente',
            'data': new_node.to_dict(),
            'playlist': playlist.to_list()
        }), 201
    
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/api/songs/<int:song_id>', methods=['GET'])
def get_song(song_id):
    """Obtener una canción específica por su ID"""
    node = playlist.get_by_id(song_id)
    
    if node:
        return jsonify({
            'success': True,
            'data': node.to_dict()
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Canción no encontrada'
        }), 404

@app.route('/api/songs/<int:song_id>', methods=['DELETE'])
def delete_song(song_id):
    """Eliminar una canción por su ID"""
    success = playlist.remove_by_id(song_id)
    
    if success:
        save_playlist()
        
        return jsonify({
            'success': True,
            'message': 'Canción eliminada exitosamente',
            'playlist': playlist.to_list()
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Canción no encontrada'
        }), 404

@app.route('/api/info', methods=['GET'])
def get_info():
    """Obtener información de la lista"""
    info = playlist.get_info()
    return jsonify({
        'success': True,
        'data': info
    })

if __name__ == '__main__':
    print("🎵 Servidor backend corriendo en http://localhost:5000")
    print("📚 Endpoints disponibles en http://localhost:5000/")
    
    load_playlist()
    
    app.run(debug=True, port=5000)
