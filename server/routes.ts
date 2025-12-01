import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from 'bcryptjs';
import { Server as SocketIOServer } from 'socket.io';

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
        
        // Confirm to sender
        socket.emit('message_sent', message);

        // Auto-update to delivered if receiver is online
        const receiver = await storage.getUser(data.receiverId);
        if (receiver?.isOnline) {
          setTimeout(async () => {
            await storage.updateMessageStatus(message._id, 'delivered');
            io.to(data.senderId).emit('message_status_update', { messageId: message._id, status: 'delivered' });
          }, 500);
        }
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
      await storage.updateMessageStatus(data.messageId, 'read');
      io.to(data.senderId).emit('message_status_update', { messageId: data.messageId, status: 'read' });
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      // Find user by socketId and mark offline
      // Note: This requires querying, which might be slow. In production, use Redis for session management.
    });
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

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

      const user = await storage.createUser(username, email, password);
      
      // Don't send password hash to client
      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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

      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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

      // Get full contact details
      const contacts = await Promise.all(
        user.contacts.map(async (contactId) => {
          const contact = await storage.getUser(contactId);
          if (contact) {
            const { passwordHash, ...contactWithoutPassword } = contact;
            return contactWithoutPassword;
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
