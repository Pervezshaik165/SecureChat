// API client for backend communication

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  gender?: 'male' | 'female';
  contacts: string[];
  isOnline: boolean;
  lastSeen: string;
  unreadCount?: number;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

const API_BASE = '/api';

export const api = {
  // Auth
  async register(username: string, email: string, password: string, gender: 'male' | 'female' = 'male'): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, gender }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    const data = await res.json();
    // Store JWT token in localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return data.user;
  },

  async login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data = await res.json();
    // Store JWT token in localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return data.user;
  },

  async logout(userId: string): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  // Users
  async searchUsers(query: string, userId: string): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}&userId=${userId}`);
    
    if (!res.ok) {
      throw new Error('Search failed');
    }
    
    const data = await res.json();
    return data.users;
  },

  async getUser(userId: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${userId}`);
    
    if (!res.ok) {
      throw new Error('Failed to get user');
    }
    
    const data = await res.json();
    return data.user;
  },

  async getContacts(userId: string): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users/${userId}/contacts`);
    
    if (!res.ok) {
      throw new Error('Failed to get contacts');
    }
    
    const data = await res.json();
    return data.contacts;
  },

  async addContact(userId: string, contactId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${userId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to add contact');
    }
  },

  // Messages
  async getMessages(userId: string, contactId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/messages?userId=${userId}&contactId=${contactId}`);
    
    if (!res.ok) {
      throw new Error('Failed to get messages');
    }
    
    const data = await res.json();
    return data.messages;
  },

  async sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, receiverId, encryptedContent }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to send message');
    }
    
    const data = await res.json();
    return data.message;
  },
};
