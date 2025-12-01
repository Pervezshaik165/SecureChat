import mongoose from 'mongoose';
import { User, Message, type IUser, type IMessage } from "@shared/schema";
import bcrypt from 'bcryptjs';

// Build MongoDB URI with password
let MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';

if (MONGODB_URI.includes('MONGOPASS')) {
  MONGODB_URI = MONGODB_URI.replace('MONGOPASS', encodeURIComponent(MONGODB_PASSWORD));
}

console.log('🔗 Attempting MongoDB connection...');
console.log('URI:', MONGODB_URI.replace(MONGODB_PASSWORD, '***'));

// Connect with retry logic
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });
    isConnected = true;
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// Ensure connection on first query
async function ensureConnection() {
  if (!isConnected) {
    await connectDB();
  }
}

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

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<IUser | null> {
    await ensureConnection();
    return await User.findById(id).lean();
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    await ensureConnection();
    return await User.findOne({ email }).lean();
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    await ensureConnection();
    return await User.findOne({ username }).lean();
  }

  async createUser(username: string, email: string, password: string): Promise<IUser> {
    await ensureConnection();
    const passwordHash = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    const user = await User.create({
      username,
      email,
      passwordHash,
      avatar,
      contacts: [],
      isOnline: true,
      lastSeen: new Date(),
    });

    return user.toObject() as unknown as IUser;
  }

  async searchUsers(query: string, excludeId: string): Promise<IUser[]> {
    await ensureConnection();
    const users = await User.find({
      _id: { $ne: excludeId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(10).lean();

    return users as unknown as IUser[];
  }

  async addContact(userId: string, contactId: string): Promise<void> {
    await ensureConnection();
    await User.findByIdAndUpdate(userId, {
      $addToSet: { contacts: contactId }
    });
    
    await User.findByIdAndUpdate(contactId, {
      $addToSet: { contacts: userId }
    });
  }

  async updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void> {
    await ensureConnection();
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
      ...(socketId && { socketId })
    });
  }

  async getMessages(userId: string, contactId: string): Promise<IMessage[]> {
    await ensureConnection();
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 }).lean();

    return messages as unknown as IMessage[];
  }

  async sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<IMessage> {
    await ensureConnection();
    const message = await Message.create({
      senderId,
      receiverId,
      encryptedContent,
      timestamp: Date.now(),
      status: 'sent'
    });

    return message.toObject() as unknown as IMessage;
  }

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    await ensureConnection();
    await Message.findByIdAndUpdate(messageId, { status });
  }
}

// Connect on module load
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB on startup:', err instanceof Error ? err.message : err);
  console.error('Please verify your MongoDB connection string and credentials');
});

export const storage = new MongoStorage();
