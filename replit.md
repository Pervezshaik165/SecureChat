# SecureChat - End-to-End Encrypted Messaging Application

## Overview

SecureChat is a real-time chat application with end-to-end encryption, inspired by WhatsApp. The application enables users to register, add contacts, and exchange encrypted messages in real-time. Messages are encrypted on the client-side before transmission and stored encrypted in the database, ensuring privacy and security.

**Tech Stack:**
- **Frontend**: React with TypeScript, Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Real-time Communication**: Socket.io
- **Encryption**: CryptoJS (AES-256)
- **Database**: MongoDB (via Mongoose) with optional PostgreSQL support (Drizzle ORM configured)
- **Authentication**: bcrypt for password hashing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Library**: The application uses shadcn/ui (Radix UI primitives) for a comprehensive set of accessible, customizable UI components with the "new-york" style variant.

**State Management**: 
- React Query (@tanstack/react-query) handles server state, caching, and data synchronization
- Local state managed with React hooks
- User session persisted in localStorage

**Routing**: Wouter provides lightweight client-side routing with three main routes:
- `/auth` - Authentication (login/register)
- `/chat` - Main chat interface
- `/` - Redirects to chat

**Styling System**: 
- TailwindCSS with custom theme configuration
- CSS variables for theming (light/dark mode support)
- Custom fonts: Inter (body), Plus Jakarta Sans (headings)

**Build Tool**: Vite with custom plugins:
- Runtime error overlay (@replit/vite-plugin-runtime-error-modal)
- Meta images plugin for OpenGraph tags
- Cartographer and dev banner for Replit development environment

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js

**API Structure**: RESTful API endpoints under `/api` prefix for:
- User authentication (register, login)
- Contact management (search, add contacts)
- Message operations (send, retrieve, update status)

**Real-time Communication**: Socket.io handles bidirectional event-based communication for:
- User online/offline status
- Real-time message delivery
- Typing indicators
- Message delivery confirmations

**Session Management**: User registration tracking via socket connections with unique socket IDs for presence detection.

**Build Process**: Custom esbuild configuration bundles server code for production with selective dependency bundling to optimize cold start times.

### Data Storage Solutions

**Database Options**: Dual storage implementation with abstraction layer:

1. **MongoDB (Primary)**:
   - Mongoose ODM for schema definition and data validation
   - Collections: Users, Messages
   - Connection with retry logic and timeout configuration
   - Credentials via environment variables (MONGODB_URI, MONGODB_PASSWORD)

2. **In-Memory Storage (Development Fallback)**:
   - Map-based storage for users
   - Array-based storage for messages
   - Seeded with demo users for quick testing
   - Used when MongoDB credentials are unavailable

3. **PostgreSQL (Configured, Not Active)**:
   - Drizzle ORM configured via drizzle.config.ts
   - Neon Database serverless driver (@neondatabase/serverless)
   - Schema defined in shared/schema.ts
   - Migration support via drizzle-kit

**Storage Interface**: Abstraction layer (IStorage) allows switching between storage implementations without changing application code.

### Authentication and Authorization

**Password Security**: 
- bcryptjs hashes passwords with salt rounds before database storage
- No plaintext passwords stored or transmitted

**User Authentication Flow**:
1. Registration: username, email, password → hash password → store in database
2. Login: email, password → retrieve user → compare hashed password
3. Session: User data stored in localStorage on client-side

**Authorization**: Currently implemented via client-side user session. Socket.io connections authenticated via user ID registration.

### Encryption System

**Algorithm**: AES-256 encryption via CryptoJS

**Key Generation**: Deterministic shared key derived from sorted user IDs using SHA-256 hash, ensuring both parties generate identical keys without key exchange.

**Encryption Flow**:
1. User composes message
2. Client generates shared key from current user ID + contact ID
3. Message encrypted with AES before sending
4. Encrypted content transmitted to server via Socket.io
5. Server stores encrypted message in database

**Decryption Flow**:
1. Client requests messages for conversation
2. Server sends encrypted messages
3. Client generates same shared key
4. Messages decrypted on client-side for display

**Security Note**: This implementation prioritizes simplicity. Production systems should use proper key exchange protocols (e.g., Diffie-Hellman) and per-message keys.

## External Dependencies

### Third-Party Services
- **Replit**: Hosting and development environment with custom Vite plugins for development tools
- **Neon Database**: Serverless PostgreSQL (configured but not currently active)
- **MongoDB Atlas**: Cloud MongoDB hosting (credentials required via environment variables)

### Key Libraries
- **UI Components**: @radix-ui/* primitives for accessible component foundation
- **Real-time**: socket.io and socket.io-client for WebSocket communication
- **Encryption**: crypto-js for AES encryption
- **Forms**: react-hook-form with @hookform/resolvers for form validation
- **Validation**: zod for schema validation
- **Styling**: tailwindcss, class-variance-authority, clsx, tailwind-merge
- **Icons**: lucide-react icon library
- **Date**: date-fns for timestamp formatting

### Development Tools
- **TypeScript**: Full type safety across client and server
- **Vite**: Fast development server and optimized production builds
- **ESBuild**: Server bundling for production
- **tsx**: TypeScript execution for development server

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string (for Drizzle/Neon)
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_PASSWORD`: MongoDB password (injected into URI)
- `NODE_ENV`: Environment mode (development/production)