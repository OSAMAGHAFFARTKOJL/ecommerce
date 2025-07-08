// Optional: Use this script to generate your own JWT secrets
const crypto = require("crypto")

function generateJWTSecret(length = 64) {
  return crypto.randomBytes(length).toString("hex")
}

function generateSecureKey(prefix = "ecom_jwt_2024") {
  const randomPart = crypto.randomBytes(32).toString("base64url")
  return `${prefix}_${randomPart}`
}

console.log("Generated JWT Secrets:")
console.log("1. Hex format:", generateJWTSecret())
console.log("2. Base64URL format:", generateSecureKey())
console.log("3. Custom format:", generateSecureKey("myapp_secure"))

// Example output:
// 1. Hex format: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
// 2. Base64URL format: ecom_jwt_2024_xK8mN2pQ7wE9rT5yU3iO1aS6dF4gH9jL0zX8cV2bN5mQ
// 3. Custom format: myapp_secure_vB9nM4kL7xC2wE8rT1yU6iO3aS5dF0gH4jL9zX7cV1bN2mQ
