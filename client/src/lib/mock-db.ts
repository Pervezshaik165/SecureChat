import { nanoid } from 'nanoid';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // In real app, bcrypt. Here, just simple hash/string
  avatar: string;
  contacts: string[]; // Array of user IDs
  isOnline: boolean;
  lastSeen: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

const USERS_KEY = 'securechat_users';
const MESSAGES_KEY = 'securechat_messages';
const SESSION_KEY = 'securechat_session';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initial seed data
function initialize() {
  if (!localStorage.getItem(USERS_KEY)) {
    const users: User[] = [
      {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: 'password', // plain text for prototype simplicity
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        contacts: ['user-2'],
        isOnline: true,
        lastSeen: new Date().toISOString(),
      },
      {
        id: 'user-2',
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: 'password',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        contacts: ['user-1'],
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
      }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  if (!localStorage.getItem(MESSAGES_KEY)) {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify([]));
  }
}

initialize();

// User Operations
export const db = {
  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  getUser: (id: string): User | undefined => {
    const users = db.getUsers();
    return users.find(u => u.id === id);
  },

  register: async (username: string, email: string, password: string): Promise<User> => {
    await delay(500);
    const users = db.getUsers();
    if (users.find(u => u.email === email || u.username === username)) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: nanoid(),
      username,
      email,
      passwordHash: password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      contacts: [],
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  login: async (email: string, password: string): Promise<User> => {
    await delay(500);
    const users = db.getUsers();
    const user = users.find(u => u.email === email && u.passwordHash === password);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Update status
    user.isOnline = true;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, user.id);
    
    return user;
  },

  logout: () => {
    const userId = localStorage.getItem(SESSION_KEY);
    if (userId) {
      const users = db.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date().toISOString();
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return db.getUser(userId) || null;
  },

  searchUsers: async (query: string): Promise<User[]> => {
    await delay(300);
    const users = db.getUsers();
    const currentId = localStorage.getItem(SESSION_KEY);
    return users.filter(u => 
      u.id !== currentId && 
      (u.username.toLowerCase().includes(query.toLowerCase()) || 
       u.email.toLowerCase().includes(query.toLowerCase()))
    );
  },

  addContact: async (contactId: string): Promise<void> => {
    const currentUserId = localStorage.getItem(SESSION_KEY);
    if (!currentUserId) throw new Error("Not authenticated");

    const users = db.getUsers();
    const currentUser = users.find(u => u.id === currentUserId);
    const contactUser = users.find(u => u.id === contactId);

    if (!currentUser || !contactUser) throw new Error("User not found");

    if (!currentUser.contacts.includes(contactId)) {
      currentUser.contacts.push(contactId);
      // Bi-directional for simplicity in this prototype
      if (!contactUser.contacts.includes(currentUserId)) {
        contactUser.contacts.push(currentUserId);
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  // Message Operations
  getMessages: (contactId: string): Message[] => {
    const currentUserId = localStorage.getItem(SESSION_KEY);
    if (!currentUserId) return [];

    const messages: Message[] = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    return messages.filter(m => 
      (m.senderId === currentUserId && m.receiverId === contactId) ||
      (m.senderId === contactId && m.receiverId === currentUserId)
    ).sort((a, b) => a.timestamp - b.timestamp);
  },

  sendMessage: async (receiverId: string, encryptedContent: string): Promise<Message> => {
    // await delay(200); // Simulate network
    const currentUserId = localStorage.getItem(SESSION_KEY);
    if (!currentUserId) throw new Error("Not authenticated");

    const messages: Message[] = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    
    const newMessage: Message = {
      id: nanoid(),
      senderId: currentUserId,
      receiverId,
      encryptedContent,
      timestamp: Date.now(),
      status: 'sent'
    };

    messages.push(newMessage);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));

    // Simulate delivery and read status updates
    setTimeout(() => {
        const updatedMessages: Message[] = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
        const m = updatedMessages.find(msg => msg.id === newMessage.id);
        if (m) {
            m.status = 'delivered';
            localStorage.setItem(MESSAGES_KEY, JSON.stringify(updatedMessages));
            // Dispatch event for UI update
            window.dispatchEvent(new Event('storage'));
        }
    }, 1500);

    setTimeout(() => {
        const updatedMessages: Message[] = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
        const m = updatedMessages.find(msg => msg.id === newMessage.id);
        if (m) {
            m.status = 'read';
            localStorage.setItem(MESSAGES_KEY, JSON.stringify(updatedMessages));
            window.dispatchEvent(new Event('storage'));
        }
    }, 3000);

    return newMessage;
  }
};
