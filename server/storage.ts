// Using in-memory storage for now - MongoDB credentials need verification
// To use MongoDB, fix credentials and update this to: export { storage } from './storage-mongo';

export { storage } from './storage-memory';
export type { IStorage } from './storage-memory';
