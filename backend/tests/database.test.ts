import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../src/config/database';

describe('Database Connection', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should connect to database successfully', async () => {
    const result = await pool.query('SELECT NOW()');
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].now).toBeDefined();
  });

  it('should execute query successfully', async () => {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    expect(result.rows[0].count).toBeDefined();
    expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(0);
  });
});
