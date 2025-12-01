// For development/testing: Using in-memory storage
// To use MongoDB instead, update server/routes.ts to import from storage-mongo.ts

export { storage } from './storage-memory';
export type { IStorage } from './storage-memory';
