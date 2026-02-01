import db from '../config/database-sqlite';
import { User } from '../models/User';

export class UserService {
  async findByPhone(phone: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(userData: Partial<User>): Promise<User> {
    const result = await db.query<User>(
      'INSERT INTO users (phone, email, password_hash, nickname) VALUES ($1, $2, $3, $4) RETURNING *',
      [userData.phone, userData.email, userData.password_hash, userData.nickname]
    );
    return result.rows[0];
  }

  async update(id: number, userData: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userData.nickname !== undefined) {
      fields.push(`nickname = $${paramCount++}`);
      values.push(userData.nickname);
    }
    if (userData.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(userData.avatar_url);
    }
    if (userData.member_level !== undefined) {
      fields.push(`member_level = $${paramCount++}`);
      values.push(userData.member_level);
    }
    if (userData.member_expires_at !== undefined) {
      fields.push(`member_expires_at = $${paramCount++}`);
      values.push(userData.member_expires_at);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query<User>(query, values);
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  async count(): Promise<number> {
    const result = await db.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }

  async list(limit: number = 20, offset: number = 0): Promise<User[]> {
    const result = await db.query<User>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }
}

export default new UserService();
