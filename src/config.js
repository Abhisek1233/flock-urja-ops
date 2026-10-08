const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'https://urja-ops.flockenergy.tech',
  email: process.env.PORTAL_EMAIL || 'operator@urja.local',
  password: process.env.PORTAL_PASSWORD || 'urja-ops-2026',
  cacheTtlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '15', 10),
  sessionExpiryBufferSeconds: 300 // proactively refresh if session older than 55 minutes
};
