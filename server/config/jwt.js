const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 16) {
  throw new Error("JWT_SECRET is missing or too short in server/.env. Add a long random value and restart.");
}

module.exports = { JWT_SECRET: secret };
