import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Message, User } from "@shared/schema";
import bcrypt from 'bcryptjs';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register_user', async (userId: string) => {
      await storage.updateUserStatus(userId, true, socket.id);
      socket.join(userId);
      
      // Notify contacts that user is online
      const user = await storage.getUser(userId);
      if (user?.contacts) {
        user.contacts.forEach((contactId: string) => {
          io.to(contactId).emit('user_online', userId);
        });
      }
    });

    socket.on('send_message', async (data: { receiverId: string, senderId: string, encryptedContent: string }) => {
      try {
        const message = await storage.sendMessage(data.senderId, data.receiverId, data.encryptedContent);
        
        // Send to receiver
        io.to(data.receiverId).emit('receive_message', message);
        
        // Confirm to sender (message stays as 'sent' - non-blue until receiver opens chat)
        socket.emit('message_sent', message);
        console.log(`message_sent -> sender:${data.senderId} id:${message._id}`);

        // Don't auto-update to delivered - keep as 'sent' until receiver opens chat
        // This ensures messages stay non-blue until actually seen
      } catch (error) {
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('typing', (data: { receiverId: string, senderId: string }) => {
      io.to(data.receiverId).emit('user_typing', data.senderId);
    });

    socket.on('stop_typing', (data: { receiverId: string, senderId: string }) => {
      io.to(data.receiverId).emit('user_stop_typing', data.senderId);
    });

    socket.on('message_read', async (data: { messageId: string, senderId: string }) => {
      console.log(`message_read received from socket ${socket.id}: messageId=${data.messageId} sender=${data.senderId}`);
      await storage.updateMessageStatus(data.messageId, 'read');
      console.log(`emitting read for ${data.messageId} to ${data.senderId} - this will show blue ticks`);
      // Notify sender that message was read - this shows blue ticks
      io.to(String(data.senderId)).emit('message_status_update', { 
        messageId: data.messageId, 
        status: 'read' 
      });
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      // Find user by socketId and mark offline
      // Note: This requires querying, which might be slow. In production, use Redis for session management.
    });

    // Mark all messages from a contact to this user as read (socket)
    socket.on('mark_contact_read', async (data: { userId: string, contactId: string }) => {
      try {
        const { userId, contactId } = data;
        console.log(`mark_contact_read received for user=${userId} contact=${contactId}`);
        
        // Find all unread messages from this contact to this user
        const unreadMessages = await Message.find({ 
          senderId: contactId, 
          receiverId: userId, 
          status: { $ne: 'read' } 
        }).lean();
        
        if (unreadMessages.length === 0) {
          console.log('No unread messages to mark as read');
          return;
        }
        
        const ids = unreadMessages.map(m => String(m._id));
        await Message.updateMany({ _id: { $in: ids } }, { status: 'read' });
        console.log(`Marked ${ids.length} messages as read`);

        // Notify the sender (contact) about each message being read - this shows blue ticks
        unreadMessages.forEach(m => {
          try {
            io.to(String(contactId)).emit('message_status_update', { 
              messageId: String(m._id), 
              status: 'read' 
            });
            console.log(`Notified ${contactId} that message ${m._id} was read`);
          } catch (e) {
            console.error('Failed to emit message_status_update in mark_contact_read', e);
          }
        });
      } catch (e) {
        console.error('Error in mark_contact_read handler', e);
      }
    });
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password, gender } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const user = await storage.createUser(username, email, password, gender || 'male');
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'my secret',
        { expiresIn: process.env.JWT_EXPIRY || '2h' }
      );
      
      // Don't send password hash to client
      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await storage.updateUserStatus(user._id, true);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'my secret',
        { expiresIn: process.env.JWT_EXPIRY || '2h' }
      );

      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { userId } = req.body;
      if (userId) {
        await storage.updateUserStatus(userId, false);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // User Routes
  app.get('/api/users/search', async (req, res) => {
    try {
      const { q, userId } = req.query;
      
      if (!q || !userId) {
        return res.status(400).json({ error: 'Missing query parameters' });
      }

      const users = await storage.searchUsers(q as string, userId as string);
      
      // Remove password hashes
      const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
      res.json({ users: sanitizedUsers });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  app.post('/api/users/:id/contacts', async (req, res) => {
    try {
      const { contactId } = req.body;
      const userId = req.params.id;

      if (!contactId) {
        return res.status(400).json({ error: 'Missing contactId' });
      }

      await storage.addContact(userId, contactId);
      res.json({ success: true });
    } catch (error) {
      console.error('Add contact error:', error);
      res.status(500).json({ error: 'Failed to add contact' });
    }
  });

  app.get('/api/users/:id/contacts', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get full contact details and unread counts
      // Deduplicate contact ids in case the DB array has duplicates
      const uniqueContactIds = Array.from(new Set(user.contacts.map(String)));
      const contacts = await Promise.all(
        uniqueContactIds.map(async (contactId) => {
          const contact = await storage.getUser(contactId);
          if (contact) {
            const { passwordHash, ...contactWithoutPassword } = contact;
            // compute unread count (messages sent by contact to this user that are not read)
            const unreadCount = await Message.countDocuments({
              senderId: contactId,
              receiverId: user._id,
              status: { $ne: 'read' }
            });

            return { ...contactWithoutPassword, unreadCount };
          }
          return null;
        })
      );

      res.json({ contacts: contacts.filter(c => c !== null) });
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ error: 'Failed to get contacts' });
    }
  });

  // Message Routes
  app.get('/api/messages', async (req, res) => {
    try {
      const { userId, contactId } = req.query;

      if (!userId || !contactId) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      const messages = await storage.getMessages(userId as string, contactId as string);

      // Mark messages received by this user from the contact as 'read'
      const unread = messages.filter(m => m.receiverId === (userId as string) && m.status !== 'read');
      if (unread.length > 0) {
        const ids = unread.map(m => m._id);
        await Message.updateMany({ _id: { $in: ids } }, { status: 'read' });

        // notify senders about read status for each message - shows blue ticks
        unread.forEach(m => {
          try {
            io.to(String(m.senderId)).emit('message_status_update', { 
              messageId: String(m._id), 
              status: 'read' 
            });
          } catch (e) {
            console.error('Failed to emit message_status_update for read message', e);
          }
        });

        // update local array statuses before returning
        messages.forEach(m => {
          if (ids.includes(m._id)) m.status = 'read';
        });
      }

      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const { senderId, receiverId, encryptedContent } = req.body;

      if (!senderId || !receiverId || !encryptedContent) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const message = await storage.sendMessage(senderId, receiverId, encryptedContent);
      res.json({ message });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  return httpServer;
}
