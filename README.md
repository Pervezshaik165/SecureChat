# SecureChat Web

A real-time, end-to-end encrypted chat application built with React, Node.js, and Socket.io. This project is designed for Information Network Security, implementing robust encryption algorithms to protect user communications.

---

## 🎯 Project Overview

SecureChat Web is a WhatsApp-like real-time messaging application that prioritizes security and privacy. All messages are encrypted end-to-end before transmission, ensuring that only the intended recipients can read them. The application features a modern, responsive UI built with React and provides seamless real-time communication through WebSocket connections.

---

## ✨ Features

### Core Features
- 🔐 **End-to-End Encryption**: All messages are encrypted using AES-256 before sending
- 💬 **Real-Time Messaging**: Instant message delivery via Socket.io WebSocket connections
- 👥 **Contact Management**: Search and add contacts to start conversations
- 🔔 **Read Receipts**: Blue ticks (✓✓) when messages are read, grey ticks when sent
- 📊 **Unread Count**: Visual badge showing number of unread messages
- 🔒 **Secure Authentication**: JWT token-based authentication with bcrypt password hashing
- 🌐 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful, intuitive interface built with Radix UI components

### Security Features
- AES-256 encryption for messages
- SHA-256 for key generation
- bcrypt password hashing (10 salt rounds)
- JWT tokens for secure authentication
- Client-side encryption/decryption
- No server-side message decryption

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2.0** - UI library
- **TypeScript** - Type safety
- **Vite 7.1.9** - Build tool and dev server
- **Tailwind CSS 4.1.14** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Socket.io Client 4.8.1** - Real-time WebSocket communication
- **CryptoJS 4.2.0** - Cryptographic functions (AES, SHA-256)
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching

### Backend
- **Node.js** - Runtime environment
- **Express 4.21.2** - Web framework
- **Socket.io 4.8.1** - WebSocket server
- **MongoDB 9.0.0** - Database (via Mongoose)
- **bcryptjs 3.0.3** - Password hashing
- **jsonwebtoken 9.0.2** - JWT token generation
- **TypeScript** - Type safety
- **dotenv** - Environment variable management

### Development Tools
- **TSX** - TypeScript execution
- **ESBuild** - Fast bundler
- **Concurrently** - Run multiple commands
- **Cross-env** - Cross-platform environment variables

---

## 📁 Project Structure

```
EncryptedChat/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   └── ui/          # Radix UI components
│   │   ├── hooks/           # React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   │   ├── api.ts      # API client
│   │   │   ├── encryption.ts # Encryption/decryption logic
│   │   │   ├── socket.ts   # Socket.io client setup
│   │   │   └── utils.ts    # Utility functions
│   │   ├── pages/          # Page components
│   │   │   ├── auth.tsx    # Login/Register page
│   │   │   ├── chat.tsx    # Main chat interface
│   │   │   └── not-found.tsx
│   │   ├── App.tsx         # Root component
│   │   └── main.tsx        # Entry point
│   ├── index.html          # HTML template
│   └── public/             # Static assets
│
├── server/                  # Backend Express application
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes and Socket.io handlers
│   ├── storage.ts          # Storage interface
│   ├── storage-mongo.ts    # MongoDB implementation
│   ├── static.ts           # Static file serving
│   └── vite.ts             # Vite dev server integration
│
├── shared/                  # Shared code between client and server
│   └── schema.ts           # Mongoose schemas (User, Message)
│
├── script/                  # Build scripts
│   └── build.ts            # Production build script
│
├── attached_assets/         # Project assets
│   └── generated_images/   # Images and graphics
│
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── render.yaml             # Render deployment config
└── README.md              # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20.x)
- **MongoDB** (local installation or MongoDB Atlas account)
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EncryptedChat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # JWT Configuration
   JWT_SECRET=my secret
   JWT_EXPIRY=2h

   # Server Port
   PORT=5000

   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/securechat
   MONGODB_PASSWORD=

   # Node Environment
   NODE_ENV=development
   ```

   **For MongoDB Atlas**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/securechat
   ```

4. **Start MongoDB** (if using local installation)
   ```bash
   # On macOS/Linux
   mongod

   # On Windows
   net start MongoDB
   ```

### Running the Application

#### Development Mode

**Option 1: Run both frontend and backend together**
```bash
npm run dev:all
```

**Option 2: Run separately**

Terminal 1 (Backend):
```bash
npm run dev
```

Terminal 2 (Frontend):
```bash
npm run dev:client
```

#### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

The application will be available at:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:5000/api

---

## 📡 API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "gender": "male"
}
```

**Response**:
```json
{
  "user": {
    "_id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "avatar_url",
    "isOnline": true,
    "lastSeen": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/login`
Authenticate user and get JWT token.

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": { /* user object */ },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/logout`
Logout user (updates online status).

**Request Body**:
```json
{
  "userId": "user_id"
}
```

### Users

#### GET `/api/users/search?q=query&userId=user_id`
Search for users by username or email.

**Response**:
```json
{
  "users": [
    {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "avatar_url"
    }
  ]
}
```

#### GET `/api/users/:id`
Get user details by ID.

#### GET `/api/users/:id/contacts`
Get all contacts for a user with unread counts.

**Response**:
```json
{
  "contacts": [
    {
      "_id": "contact_id",
      "username": "janedoe",
      "email": "jane@example.com",
      "isOnline": true,
      "unreadCount": 3
    }
  ]
}
```

#### POST `/api/users/:id/contacts`
Add a contact.

**Request Body**:
```json
{
  "contactId": "contact_user_id"
}
```

### Messages

#### GET `/api/messages?userId=user_id&contactId=contact_id`
Get all messages between two users.

**Response**:
```json
{
  "messages": [
    {
      "_id": "message_id",
      "senderId": "sender_id",
      "receiverId": "receiver_id",
      "encryptedContent": "encrypted_string",
      "timestamp": 1234567890,
      "status": "read"
    }
  ]
}
```

#### POST `/api/messages`
Send a message (also handled via Socket.io).

**Request Body**:
```json
{
  "senderId": "sender_id",
  "receiverId": "receiver_id",
  "encryptedContent": "encrypted_message_string"
}
```

---

## 🔌 Socket.io Events

### Client → Server

- `register_user(userId)` - Register user for real-time updates
- `send_message({ senderId, receiverId, encryptedContent })` - Send message
- `message_read({ messageId, senderId })` - Mark message as read
- `mark_contact_read({ userId, contactId })` - Mark all messages from contact as read

### Server → Client

- `receive_message(message)` - New message received
- `message_sent(message)` - Message sent confirmation
- `message_status_update({ messageId, status })` - Message status changed (read/delivered)
- `user_online(userId)` - User came online
- `user_offline(userId)` - User went offline

---

## 🔐 Security Implementation

### Encryption Flow

1. **Key Generation**: Shared key derived from user IDs using SHA-256
2. **Message Encryption**: AES-256 encryption on client-side before sending
3. **Storage**: Only encrypted messages stored in database
4. **Decryption**: Messages decrypted on client-side after receiving

See [`ins_algo.md`](./ins_algo.md) for detailed encryption algorithms documentation.

### Authentication Flow

1. User registers/logs in with credentials
2. Password hashed with bcrypt (10 salt rounds)
3. JWT token generated and returned
4. Token stored in localStorage
5. Token included in subsequent API requests

---

## 🔄 Application Workflow

### User Registration Flow

```
1. User fills registration form
   ↓
2. Client validates input (Zod schema)
   ↓
3. POST /api/auth/register
   ↓
4. Server validates unique email/username
   ↓
5. Password hashed with bcrypt
   ↓
6. User created in MongoDB
   ↓
7. JWT token generated
   ↓
8. User data + token returned
   ↓
9. Client stores in localStorage
   ↓
10. Redirect to chat page
```

### Message Sending Flow

```
1. User types message
   ↓
2. Client generates shared key (SHA-256 of user IDs)
   ↓
3. Message encrypted (AES-256)
   ↓
4. Optimistic UI update (message appears immediately)
   ↓
5. Socket.io emit 'send_message'
   ↓
6. Server saves encrypted message to database
   ↓
7. Server emits to receiver via Socket.io
   ↓
8. Receiver's client decrypts message
   ↓
9. Message displayed in chat
```

### Message Read Flow

```
1. Receiver opens chat
   ↓
2. Client fetches messages via GET /api/messages
   ↓
3. Server marks messages as 'read'
   ↓
4. Server emits 'message_status_update' to sender
   ↓
5. Sender sees blue ticks (✓✓)
```

---

## 🧪 Development Commands

```bash
# Development
npm run dev              # Run backend server
npm run dev:client       # Run frontend dev server
npm run dev:all          # Run both concurrently

# Build
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run check            # TypeScript type checking
npm run db:push          # Push database schema changes
```

---

## 📦 Dependencies

### Key Dependencies

- **crypto-js** - AES encryption and SHA-256 hashing
- **socket.io** - Real-time bidirectional communication
- **mongoose** - MongoDB object modeling
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation
- **express** - Web application framework
- **react** - UI library
- **vite** - Build tool

See `package.json` for complete list.

---

## 🌐 Deployment

### Deploy to Render (Recommended)

1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `MONGODB_URI=your_mongodb_connection_string`
   - `JWT_SECRET=your_secret`
   - `JWT_EXPIRY=2h`

See `render.yaml` for configuration details.

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/securechat` |
| `MONGODB_PASSWORD` | MongoDB password (if needed) | - |
| `JWT_SECRET` | JWT signing secret | `my secret` |
| `JWT_EXPIRY` | JWT expiration time | `2h` |

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

- Project developed for Information Network Security course

---

## 📚 Additional Documentation

- **[Encryption Algorithms](./ins_algo.md)** - Detailed documentation of all cryptographic algorithms used
- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment instructions (if available)

---

## 🐛 Troubleshooting

### Common Issues

**Socket.io not connecting**:
- Check if server is running
- Verify CORS settings
- Check browser console for errors

**Messages not appearing**:
- Check Socket.io connection status
- Verify encryption/decryption keys match
- Check browser console for errors

**MongoDB connection error**:
- Verify MongoDB is running (local) or connection string is correct (Atlas)
- Check network access settings (for Atlas)
- Verify credentials

---

## 🔮 Future Enhancements

- [ ] Implement Diffie-Hellman key exchange for perfect forward secrecy
- [ ] Add file/image sharing with encryption
- [ ] Implement message editing and deletion
- [ ] Add group chat functionality
- [ ] Implement message search
- [ ] Add dark/light theme toggle
- [ ] Implement typing indicators
- [ ] Add voice/video call support

---

