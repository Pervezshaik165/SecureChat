import { type IUser, type IMessage } from "@shared/schema";
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

// In-memory storage for development - data persists during session
const usersMap = new Map<string, IUser>();
const messagesArray: IMessage[] = [];

// Seed with demo users
async function seedDemoUsers() {
  const demoUser1: IUser = {
    _id: nanoid(),
    username: 'alice',
    email: 'alice@test.com',
    passwordHash: await bcrypt.hash('password', 10),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    contacts: [],
    isOnline: false,
    lastSeen: new Date()
  };

  const demoUser2: IUser = {
    _id: nanoid(),
    username: 'bob',
    email: 'bob@test.com',
    passwordHash: await bcrypt.hash('password', 10),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    contacts: [],
    isOnline: false,
    lastSeen: new Date()
  };

  usersMap.set(demoUser1._id, demoUser1);
  usersMap.set(demoUser2._id, demoUser2);
}

seedDemoUsers();

export interface IStorage {
  getUser(id: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  createUser(username: string, email: string, password: string): Promise<IUser>;
  searchUsers(query: string, excludeId: string): Promise<IUser[]>;
  addContact(userId: string, contactId: string): Promise<void>;
  updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void>;
  getMessages(userId: string, contactId: string): Promise<IMessage[]>;
  sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<IMessage>;
  updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void>;
}

export class MemoryStorage implements IStorage {
  async getUser(id: string): Promise<IUser | null> {
    return usersMap.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    for (const user of Array.from(usersMap.values())) {
      if (user.email === email) return user;
    }
    return null;
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    for (const user of Array.from(usersMap.values())) {
      if (user.username === username) return user;
    }
    return null;
  }

  async createUser(username: string, email: string, password: string): Promise<IUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user: IUser = {
      _id: nanoid(),
      username,
      email,
      passwordHash,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      contacts: [],
      isOnline: true,
      lastSeen: new Date()
    };
    usersMap.set(user._id, user);
    return user;
  }

  async searchUsers(query: string, excludeId: string): Promise<IUser[]> {
    const results: IUser[] = [];
    for (const user of Array.from(usersMap.values())) {
      if (user._id !== excludeId && 
          (user.username.toLowerCase().includes(query.toLowerCase()) || 
           user.email.toLowerCase().includes(query.toLowerCase()))) {
        results.push(user);
      }
    }
    return results;
  }

  async addContact(userId: string, contactId: string): Promise<void> {
    const user = usersMap.get(userId);
    const contact = usersMap.get(contactId);
    if (user && contact) {
      if (!user.contacts.includes(contactId)) {
        user.contacts.push(contactId);
      }
      if (!contact.contacts.includes(userId)) {
        contact.contacts.push(userId);
      }
    }
  }

  async updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void> {
    const user = usersMap.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      if (socketId) user.socketId = socketId;
    }
  }

  async getMessages(userId: string, contactId: string): Promise<IMessage[]> {
    return messagesArray.filter(m =>
      (m.senderId === userId && m.receiverId === contactId) ||
      (m.senderId === contactId && m.receiverId === userId)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }

  async sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<IMessage> {
    const message: IMessage = {
      _id: nanoid(),
      senderId,
      receiverId,
      encryptedContent,
      timestamp: Date.now(),
      status: 'sent'
    };
    messagesArray.push(message);
    return message;
  }

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    const message = messagesArray.find(m => m._id === messageId);
    if (message) {
      message.status = status;
    }
  }
}

export const storage = new MemoryStorage();
