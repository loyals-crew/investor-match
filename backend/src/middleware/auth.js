import jwt from 'jsonwebtoken';
import sql from '../db/index.js';

/**
 * Bug #3: Authenticate middleware now verifies the user still exists in DB,
 * not just that the JWT is valid.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Verify user still exists in DB
  sql`SELECT id, email, role FROM users WHERE id = ${payload.id}`
    .then(([user]) => {
      if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
      }
      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    })
    .catch(() => {
      return res.status(500).json({ error: 'Auth verification failed' });
    });
}
