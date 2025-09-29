from flask import Flask, request, jsonify
from flask_cors import CORS
from models import DoublyLinkedList

app = Flask(__name__)
CORS(app)  # Permitir peticiones desde React

# Instancia de la lista doblemente enlazada
playlist = DoublyLinkedList()

@app.route('/')
def home():
    return jsonify({
        'message': 'API del Reproductor de Música',
        'version': '1.0',
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
    """Obtener todas las canciones"""
    songs = playlist.to_list()
    return jsonify({
        'success': True,
        'data': songs,
        'count': playlist.size
    })

@app.route('/api/songs', methods=['POST'])
def add_song():
    """Agregar nueva canción"""
    data = request.json
    
    name = data.get('name')
    artist = data.get('artist')
    mode = data.get('mode', 'end')
    position = data.get('position', 0)
    
    if not name or not artist:
        return jsonify({
            'success': False,
            'message': 'Nombre y artista son requeridos'
        }), 400
    
    try:
        if mode == 'start':
            new_node = playlist.insert_to_start(name, artist)
        elif mode == 'position':
            new_node = playlist.insert_at_position(name, artist, position)
        else:  # end
            new_node = playlist.insert_to_end(name, artist)
        
        return jsonify({
            'success': True,
            'message': 'Canción agregada exitosamente',
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
    """Obtener canción específica por ID"""
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
    """Eliminar canción por ID"""
    success = playlist.remove_by_id(song_id)
    
    if success:
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
    app.run(debug=True, port=5000)