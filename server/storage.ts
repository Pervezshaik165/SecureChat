import mongoose from 'mongoose';
import { User, Message, type IUser, type IMessage } from "@shared/schema";
import bcrypt from 'bcryptjs';

// Build MongoDB URI with proper password encoding
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_URI = `mongodb+srv://heenakaf143:${encodeURIComponent(MONGODB_PASSWORD)}@cluster0.fl5jr.mongodb.net/securechat?retryWrites=true&w=majority`;

// Connect to MongoDB
let isConnected = false;
let connectionAttempted = false;

async function connectDB() {
  if (isConnected || connectionAttempted) return;
  
  connectionAttempted = true;
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error instanceof Error ? error.message : error);
    console.error('App will continue without database - please check your MongoDB credentials and IP whitelist');
    // Don't throw - let app continue without DB
  }
}

// Storage Interface
export interface IStorage {
  // User methods
  getUser(id: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  createUser(username: string, email: string, password: string): Promise<IUser>;
  searchUsers(query: string, excludeId: string): Promise<IUser[]>;
  addContact(userId: string, contactId: string): Promise<void>;
  updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void>;
  
  // Message methods
  getMessages(userId: string, contactId: string): Promise<IMessage[]>;
  sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<IMessage>;
  updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void>;
}

export class MongoStorage implements IStorage {
  constructor() {
    // Connect asynchronously without blocking
    connectDB().catch(err => console.error('Initial DB connection failed:', err));
  }

  private checkConnection() {
    if (!isConnected) {
      throw new Error('Database not connected. Please check MongoDB credentials and network access.');
    }
  }

  async getUser(id: string): Promise<IUser | null> {
    this.checkConnection();
    return await User.findById(id).lean();
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    this.checkConnection();
    return await User.findOne({ email }).lean();
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    this.checkConnection();
    return await User.findOne({ username }).lean();
  }

  async createUser(username: string, email: string, password: string): Promise<IUser> {
    this.checkConnection();
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

    return user.toObject();
  }

  async searchUsers(query: string, excludeId: string): Promise<IUser[]> {
    this.checkConnection();
    const users = await User.find({
      _id: { $ne: excludeId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).limit(10).lean();

    return users;
  }

  async addContact(userId: string, contactId: string): Promise<void> {
    this.checkConnection();
    // Add bidirectional contact relationship
    await User.findByIdAndUpdate(userId, {
      $addToSet: { contacts: contactId }
    });
    
    await User.findByIdAndUpdate(contactId, {
      $addToSet: { contacts: userId }
    });
  }

  async updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void> {
    this.checkConnection();
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
      ...(socketId && { socketId })
    });
  }

  async getMessages(userId: string, contactId: string): Promise<IMessage[]> {
    this.checkConnection();
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 }).lean();

    return messages;
  }

  async sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<IMessage> {
    this.checkConnection();
    const message = await Message.create({
      senderId,
      receiverId,
      encryptedContent,
      timestamp: Date.now(),
      status: 'sent'
    });

    return message.toObject();
  }

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    this.checkConnection();
    await Message.findByIdAndUpdate(messageId, { status });
  }
}

export const storage = new MongoStorage();
