import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female'], default: 'male' },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String, default: '' },
}, { timestamps: true });

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  }
}, { timestamps: true });

// Export Models
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// TypeScript Types
export interface IUser {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string;
  gender?: 'male' | 'female';
  contacts: string[];
  isOnline: boolean;
  lastSeen: Date;
  socketId?: string;
}

export interface IMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}
