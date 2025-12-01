import mongoose from 'mongoose';
import { User, Message, type IUser, type IMessage } from "@shared/schema";
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI!;

// Connect to MongoDB
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
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
    connectDB();
  }

  async getUser(id: string): Promise<IUser | null> {
    return await User.findById(id).lean();
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email }).lean();
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    return await User.findOne({ username }).lean();
  }

  async createUser(username: string, email: string, password: string): Promise<IUser> {
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
    // Add bidirectional contact relationship
    await User.findByIdAndUpdate(userId, {
      $addToSet: { contacts: contactId }
    });
    
    await User.findByIdAndUpdate(contactId, {
      $addToSet: { contacts: userId }
    });
  }

  async updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      lastSeen: new Date(),
      ...(socketId && { socketId })
    });
  }

  async getMessages(userId: string, contactId: string): Promise<IMessage[]> {
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: contactId },
        { senderId: contactId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 }).lean();

    return messages;
  }

  async sendMessage(senderId: string, receiverId: string, encryptedContent: string): Promise<IMessage> {
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
    await Message.findByIdAndUpdate(messageId, { status });
  }
}

export const storage = new MongoStorage();
