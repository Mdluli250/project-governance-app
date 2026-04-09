import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { generateToken, comparePassword } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await query(
      'SELECT id, email, password_hash FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { id, password_hash } = result.rows[0];
    
    if (!password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await comparePassword(password, password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(parseInt(id));
    res.status(200).json({ token, userId: id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}
