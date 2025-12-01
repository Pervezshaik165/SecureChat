import CryptoJS from 'crypto-js';

// In a real app, we would use Diffie-Hellman key exchange.
// For this prototype, we'll derive a shared secret from the two user IDs.
// This ensures both users generate the same key for their conversation.
export function generateSharedKey(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  return CryptoJS.SHA256(sortedIds.join('-')).toString();
}

export function encryptMessage(message: string, key: string): string {
  return CryptoJS.AES.encrypt(message, key).toString();
}

export function decryptMessage(encryptedMessage: string, key: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Failed to decrypt message", error);
    return "⚠️ Error decrypting message";
  }
}
