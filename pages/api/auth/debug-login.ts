import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { comparePassword } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, password } = req.body;

  try {
    console.log(`DEBUG: Attempting login for ${email}`);

    const result = await query(
      'SELECT id, email, password_hash FROM profiles WHERE email = $1',
      [email]
    );

    console.log(`DEBUG: Query returned ${result.rows.length} rows`);

    if (result.rows.length === 0) {
      console.log(`DEBUG: Email not found: ${email}`);
      return res.status(401).json({ error: 'Email not found', debug: true });
    }

    const { id, password_hash } = result.rows[0];
    console.log(`DEBUG: Found user ${id} with hash: ${password_hash.substring(0, 10)}...`);

    if (!password_hash) {
      console.log(`DEBUG: No password hash for user`);
      return res.status(401).json({ error: 'No password set', debug: true });
    }

    const isValid = await comparePassword(password, password_hash);
    console.log(`DEBUG: Password comparison result: ${isValid}`);

    if (!isValid) {
      return res.status(401).json({ error: 'Password mismatch', debug: true });
    }

    return res.status(200).json({ success: true, userId: id });
  } catch (error: any) {
    console.error('DEBUG: Error:', error.message);
    return res.status(500).json({ error: error.message, debug: true });
  }
}
