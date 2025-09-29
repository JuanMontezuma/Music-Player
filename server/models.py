class Node:
    """Nodo para la lista doblemente enlazada"""
    def __init__(self, data):
        self.data = data
        self.next = None
        self.prev = None
    
    def to_dict(self):
        """Convertir nodo a diccionario para JSON"""
        return {
            'id': self.data['id'],
            'name': self.data['name'],
            'artist': self.data['artist'],
            'duration': self.data.get('duration', '0:00'),
            'has_next': self.next is not None,
            'has_prev': self.prev is not None
        }


class DoublyLinkedList:
    """Lista doblemente enlazada para gestionar la playlist"""
    
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0
        self.next_id = 1
    
    def insert_to_start(self, name, artist):
        """Insertar al inicio de la lista"""
        data = {
            'id': self.next_id,
            'name': name,
            'artist': artist,
            'duration': '0:00'
        }
        self.next_id += 1
        
        new_node = Node(data)
        
        if self.size == 0:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.next = self.head
            self.head.prev = new_node
            self.head = new_node
        
        self.size += 1
        return new_node
    
    def insert_to_end(self, name, artist):
        """Insertar al final de la lista"""
        data = {
            'id': self.next_id,
            'name': name,
            'artist': artist,
            'duration': '0:00'
        }
        self.next_id += 1
        
        new_node = Node(data)
        
        if self.size == 0:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            new_node.prev = self.tail
            self.tail = new_node
        
        self.size += 1
        return new_node
    
    def insert_at_position(self, name, artist, position):
        """Insertar en posición específica"""
        if position < 0 or position > self.size:
            raise ValueError('Posición inválida')
        
        if position == 0:
            return self.insert_to_start(name, artist)
        
        if position == self.size:
            return self.insert_to_end(name, artist)
        
        data = {
            'id': self.next_id,
            'name': name,
            'artist': artist,
            'duration': '0:00'
        }
        self.next_id += 1
        
        new_node = Node(data)
        current = self.head
        
        # Navegar hasta la posición
        for i in range(position):
            current = current.next
        
        # Insertar el nodo
        new_node.prev = current.prev
        new_node.next = current
        current.prev.next = new_node
        current.prev = new_node
        
        self.size += 1
        return new_node
    
    def remove_by_id(self, song_id):
        """Eliminar nodo por ID"""
        current = self.head
        
        # Buscar el nodo con ese ID
        while current:
            if current.data['id'] == song_id:
                # Si es el único nodo
                if self.size == 1:
                    self.head = None
                    self.tail = None
                # Si es el primer nodo
                elif current == self.head:
                    self.head = current.next
                    self.head.prev = None
                # Si es el último nodo
                elif current == self.tail:
                    self.tail = current.prev
                    self.tail.next = None
                # Nodo del medio
                else:
                    current.prev.next = current.next
                    current.next.prev = current.prev
                
                self.size -= 1
                return True
            
            current = current.next
        
        return False
    
    def get_by_id(self, song_id):
        """Obtener nodo por ID"""
        current = self.head
        
        while current:
            if current.data['id'] == song_id:
                return current
            current = current.next
        
        return None
    
    def to_list(self):
        """Convertir lista a array de diccionarios"""
        result = []
        current = self.head
        
        while current:
            result.append(current.to_dict())
            current = current.next
        
        return result
    
    def get_info(self):
        """Obtener información de la lista"""
        return {
            'size': self.size,
            'head': self.head.data if self.head else None,
            'tail': self.tail.data if self.tail else None
        }