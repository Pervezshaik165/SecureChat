# Encryption and Decryption Algorithms

This document describes all encryption and decryption algorithms, cryptographic methods, and security mechanisms used in the SecureChat application .

## Overview

SecureChat implements a comprehensive security architecture that protects user data at multiple layers:
1. **Message Encryption** - End-to-end encryption for chat messages
2. **Password Hashing** - Secure storage of user credentials
3. **Authentication Tokens** - JWT-based session management
4. **Key Management** - Deterministic shared key generation

---

## 1. Message Encryption: AES (Advanced Encryption Standard)

### Algorithm Details
- **Algorithm**: AES (Advanced Encryption Standard)
- **Implementation**: CryptoJS library
- **Mode**: Default AES mode (CBC mode with PKCS7 padding)
- **Key Length**: 256 bits (implied from SHA-256 hash)

### Key Generation: SHA-256 Hash

The shared encryption key is generated using SHA-256 hashing algorithm:

```javascript
generateSharedKey(userId1: string, userId2: string): string
```

**Process**:
1. Take two user IDs (sender and receiver)
2. Sort the IDs alphabetically to ensure consistency
3. Join them with a hyphen separator: `"userId1-userId2"`
4. Apply SHA-256 hash function
5. Convert hash to hexadecimal string representation

**Algorithm Flow**:
```
Input: userId1, userId2
↓
Sort: [userId1, userId2].sort()
↓
Concatenate: sortedIds.join('-')
↓
Hash: SHA256(concatenated_string)
↓
Output: 256-bit hash as hexadecimal string (64 characters)
```

**Why This Approach**:
- **Deterministic**: Same two users always generate the same key
- **No Key Exchange Required**: Both parties can independently generate the key
- **Consistent**: Sorting ensures order doesn't matter (A-B = B-A)

### Message Encryption Process

```javascript
encryptMessage(message: string, key: string): string
```

**Algorithm Steps**:
1. Input: Plain text message (UTF-8 string)
2. Input: Shared key (SHA-256 hash string)
3. Process: `CryptoJS.AES.encrypt(message, key)`
   - AES encryption using the shared key
   - Automatic IV (Initialization Vector) generation
   - PKCS7 padding applied automatically
4. Output: Base64-encoded encrypted string (contains IV + ciphertext)

**Technical Details**:
- **Encryption Mode**: CBC (Cipher Block Chaining)
- **Padding**: PKCS7
- **Key Derivation**: Direct use of SHA-256 hash
- **IV Generation**: Automatic by CryptoJS

### Message Decryption Process

```javascript
decryptMessage(encryptedMessage: string, key: string): string
```

**Algorithm Steps**:
1. Input: Base64-encoded encrypted string
2. Input: Shared key (same SHA-256 hash)
3. Process: `CryptoJS.AES.decrypt(encryptedMessage, key)`
   - Extract IV from encrypted string
   - Decrypt ciphertext using AES-CBC
   - Remove PKCS7 padding
4. Output: Decrypted plain text (UTF-8 string)
5. Error Handling: Returns error message if decryption fails

**Security Properties**:
- **Confidentiality**: Messages are unreadable without the key
- **Integrity**: Modified messages fail to decrypt
- **Authenticity**: Only parties with the shared key can decrypt

---

## 2. Password Hashing: bcrypt

### Algorithm Details
- **Algorithm**: bcrypt (Blowfish-based password hashing)
- **Library**: bcryptjs
- **Salt Rounds**: 10 (2^10 = 1,024 iterations)
- **Output**: 60-character bcrypt hash string

### Password Hashing Process

**Registration/Password Creation**:
```javascript
bcrypt.hash(password, 10)
```

**Algorithm Steps**:
1. Input: Plain text password (user-provided)
2. Generate random salt (automatic)
3. Apply bcrypt hashing function:
   - Blowfish encryption algorithm
   - 10 rounds (cost factor = 2^10)
   - Salt is embedded in the hash
4. Output: bcrypt hash string (format: `$2a$10$...`)

**Hash Format**:
```
$2a$10$[salt 22 chars][hash 31 chars]
│   │  │
│   │  └─ Salt (22 Base64 characters)
│   └──── Cost factor (2^10 = 1,024 iterations)
└──────── Algorithm version (2a = bcrypt)
```

### Password Verification Process

**Login/Authentication**:
```javascript
bcrypt.compare(password, passwordHash)
```

**Algorithm Steps**:
1. Input: Plain text password (user-provided)
2. Input: Stored bcrypt hash from database
3. Extract salt from stored hash
4. Hash the plain text password with extracted salt
5. Compare computed hash with stored hash
6. Output: Boolean (true if passwords match)

**Security Properties**:
- **One-Way Function**: Cannot reverse hash to get original password
- **Salt Protection**: Unique salt prevents rainbow table attacks
- **Adaptive Cost**: 10 rounds provides good balance of security and performance
- **Timing Attack Resistance**: Constant-time comparison

---

## 3. Authentication: JWT (JSON Web Token)

### Algorithm Details
- **Standard**: RFC 7519 (JSON Web Token)
- **Library**: jsonwebtoken
- **Algorithm**: HMAC SHA-256 (HS256)
- **Token Type**: Signed JWT (JSON Web Signature)

### Token Generation Process

**Login/Registration**:
```javascript
jwt.sign(payload, secret, options)
```

**Token Structure** (3 parts separated by dots):

1. **Header** (Base64URL encoded):
   ```json
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   ```

2. **Payload** (Base64URL encoded):
   ```json
   {
     "userId": "user_id_string",
     "email": "user@example.com",
     "iat": 1234567890,  // Issued at timestamp
     "exp": 1234574490   // Expiration timestamp
   }
   ```

3. **Signature** (HMAC SHA-256):
   ```
   HMAC-SHA256(
     base64UrlEncode(header) + "." + base64UrlEncode(payload),
     JWT_SECRET
   )
   ```

**Configuration**:
- **Secret Key**: `JWT_SECRET` environment variable (default: "my secret")
- **Expiration**: `JWT_EXPIRY` environment variable (default: "2h" = 2 hours)
- **Algorithm**: HS256 (HMAC with SHA-256)

### Token Verification

**Process**:
1. Extract token from request (localStorage)
2. Split token into header, payload, and signature
3. Verify signature using JWT_SECRET
4. Check expiration time
5. Validate payload structure

**Security Properties**:
- **Integrity**: Signature ensures token hasn't been tampered with
- **Authenticity**: Only server with secret can create valid tokens
- **Expiration**: Tokens expire after set time (default: 2 hours)
- **Stateless**: No need to store sessions on server

---

## 4. Cryptographic Hash: SHA-256

### Algorithm Details
- **Algorithm**: SHA-256 (Secure Hash Algorithm 256-bit)
- **Function**: One-way cryptographic hash function
- **Output Size**: 256 bits (64 hexadecimal characters)
- **Usage**: Key derivation for message encryption

### SHA-256 Process

**For Shared Key Generation**:
```javascript
CryptoJS.SHA256(sortedIds.join('-')).toString()
```

**Algorithm Steps**:
1. Input: Concatenated and sorted user IDs
2. Process: SHA-256 hash function
   - Message digest algorithm
   - Produces 256-bit output
   - Deterministic (same input = same output)
3. Output: Hexadecimal string (64 characters)

**Properties**:
- **One-Way**: Cannot reverse hash to get original input
- **Deterministic**: Same input always produces same output
- **Avalanche Effect**: Small input change produces completely different output
- **Collision Resistant**: Extremely difficult to find two inputs with same hash

---

## Security Architecture Flow

### Complete Message Encryption Flow

```
1. User A composes message
   ↓
2. Client generates shared key:
   SHA-256(sort(A_ID, B_ID))
   ↓
3. Message encrypted:
   AES.encrypt(message, sharedKey)
   ↓
4. Encrypted message sent to server
   ↓
5. Server stores encrypted message in database
   ↓
6. Server forwards to User B via Socket.io
   ↓
7. User B receives encrypted message
   ↓
8. Client generates same shared key:
   SHA-256(sort(A_ID, B_ID))
   ↓
9. Message decrypted:
   AES.decrypt(encryptedMessage, sharedKey)
   ↓
10. Plain text displayed to User B
```

### Authentication Flow

```
1. User submits credentials (email, password)
   ↓
2. Server retrieves user from database
   ↓
3. Password verified:
   bcrypt.compare(password, storedHash)
   ↓
4. If valid, generate JWT token:
   jwt.sign({userId, email}, JWT_SECRET, {expiresIn: '2h'})
   ↓
5. Token sent to client
   ↓
6. Client stores token in localStorage
   ↓
7. Token included in subsequent requests
   ↓
8. Server verifies token signature and expiration
```

---

## Security Considerations

### Current Implementation Strengths

1. **End-to-End Encryption**: Messages encrypted before leaving client
2. **Strong Algorithms**: AES-256, SHA-256, bcrypt are industry standards
3. **Password Security**: bcrypt with 10 rounds provides good protection
4. **Token-Based Auth**: JWT with expiration prevents long-lived sessions

### Security Recommendations for Production

1. **Key Exchange Protocol**: 
   - Current: Deterministic key from user IDs
   - Recommended: Implement Diffie-Hellman key exchange for perfect forward secrecy

2. **Per-Message Keys**:
   - Current: One key per conversation
   - Recommended: Rotate keys periodically or use per-message keys

3. **JWT Secret**:
   - Current: Default secret or environment variable
   - Recommended: Use strong, randomly generated secret (256 bits)

4. **Token Storage**:
   - Current: localStorage (vulnerable to XSS)
   - Recommended: Consider httpOnly cookies for better XSS protection

5. **Key Management**:
   - Current: Client-side key generation
   - Recommended: Consider server-assisted key exchange with secure channels

6. **Password Policy**:
   - Recommended: Enforce minimum complexity requirements
   - Recommended: Implement password strength meter

7. **Rate Limiting**:
   - Recommended: Implement rate limiting on authentication endpoints
   - Recommended: Prevent brute force attacks

---

## Code References

### Encryption Module
- **File**: `client/src/lib/encryption.ts`
- **Functions**:
  - `generateSharedKey()`: SHA-256 key generation
  - `encryptMessage()`: AES encryption
  - `decryptMessage()`: AES decryption

### Authentication Module
- **File**: `server/routes.ts`
- **Functions**:
  - Registration: bcrypt.hash() for password hashing
  - Login: bcrypt.compare() for password verification
  - JWT generation: jwt.sign() for token creation

### Storage Module
- **File**: `server/storage-mongo.ts`
- **Functions**:
  - `createUser()`: Uses bcrypt.hash() with 10 salt rounds

---

## Algorithm Specifications Summary

| Algorithm | Purpose | Key Size/Output | Security Level |
|-----------|---------|-----------------|----------------|
| AES | Message Encryption | 256 bits | High |
| SHA-256 | Key Generation | 256 bits | High |
| bcrypt | Password Hashing | Variable (60 chars) | High |
| JWT (HS256) | Authentication | Secret-based | Medium-High |
| HMAC-SHA256 | JWT Signature | 256 bits | High |

---

## References

- **AES**: NIST FIPS 197 - Advanced Encryption Standard
- **SHA-256**: NIST FIPS 180-4 - Secure Hash Standard
- **bcrypt**: Password Hashing Competition winner
- **JWT**: RFC 7519 - JSON Web Token (JWT)
- **CryptoJS**: JavaScript cryptographic library
- **bcryptjs**: JavaScript bcrypt implementation

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained For**: Information Network Security Project

