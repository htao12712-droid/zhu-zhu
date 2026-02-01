import db from '../config/database-sqlite';
import { Fund, FundNavHistory, FundHoldings } from '../models/Fund';

export class FundService {
  async findByCode(code: string): Promise<Fund | null> {
    const result = await db.query<Fund>(
      'SELECT * FROM funds WHERE fund_code = $1',
      [code]
    );
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<Fund | null> {
    const result = await db.query<Fund>(
      'SELECT * FROM funds WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async list(filters: {
    type?: string;
    status?: string;
    managerId?: number;
  } = {}, pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 }): Promise<{
    funds: Fund[];
    total: number;
  }> {
    const conditions: string[] = ['status = $1'];
    const params: any[] = ['正常'];
    let paramCount = 2;

    if (filters.type) {
      conditions.push(`fund_type = $${paramCount++}`);
      params.push(filters.type);
    }

    if (filters.managerId) {
      conditions.push(`manager_id = $${paramCount++}`);
      params.push(filters.managerId);
    }

    const offset = (pagination.page - 1) * pagination.pageSize;
    params.push(pagination.pageSize, offset);

    const query = `
      SELECT * FROM funds
      WHERE ${conditions.join(' AND ')}
      ORDER BY fund_size DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    const fundsResult = await db.query<Fund>(query, params);

    const countParams = params.slice(0, paramCount - 2);
    const countQuery = `
      SELECT COUNT(*) as total FROM funds WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, countParams);

    return {
      funds: fundsResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async create(fundData: Partial<Fund>): Promise<Fund> {
    const result = await db.query<Fund>(
      'INSERT INTO funds (fund_code, fund_name, fund_type, fund_company, established_date, fund_size, manager_id, benchmark_index, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        fundData.fund_code,
        fundData.fund_name,
        fundData.fund_type,
        fundData.fund_company,
        fundData.established_date,
        fundData.fund_size,
        fundData.manager_id,
        fundData.benchmark_index,
        fundData.status || '正常'
      ]
    );
    
    // For SQLite, RETURNING * is removed, so query the inserted row
    const queryResult = await db.query<Fund>(
      'SELECT * FROM funds WHERE fund_code = $1',
      [fundData.fund_code]
    );
    
    return queryResult.rows[0];
  }

  async update(id: number, fundData: Partial<Fund>): Promise<Fund | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const updatableFields = ['fund_name', 'fund_type', 'fund_company', 'established_date', 'fund_size', 'manager_id', 'benchmark_index', 'status'];

    for (const field of updatableFields) {
      if (fundData[field as keyof Fund] !== undefined) {
        fields.push(`${field} = $${paramCount++}`);
        values.push(fundData[field as keyof Fund]);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `UPDATE funds SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query<Fund>(query, values);
    return result.rows[0] || null;
  }

  async getNavHistory(fundId: number, limit: number = 365): Promise<FundNavHistory[]> {
    const result = await db.query<FundNavHistory>(
      'SELECT * FROM fund_nav_history WHERE fund_id = $1 ORDER BY nav_date DESC LIMIT $2',
      [fundId, limit]
    );
    return result.rows;
  }

  async addNavHistory(navData: Partial<FundNavHistory>[]): Promise<FundNavHistory[]> {
    const results: FundNavHistory[] = [];

    await db.transaction(async (client) => {
      for (const nav of navData) {
        const result = await client.query<FundNavHistory>(
          'INSERT INTO fund_nav_history (fund_id, nav_date, unit_nav, accumulated_nav, daily_return) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (fund_id, nav_date) DO UPDATE SET unit_nav = EXCLUDED.unit_nav, accumulated_nav = EXCLUDED.accumulated_nav, daily_return = EXCLUDED.daily_return RETURNING *',
          [nav.fund_id, nav.nav_date, nav.unit_nav, nav.accumulated_nav, nav.daily_return]
        );
        results.push(result.rows[0]);
      }
    });

    return results;
  }

  async getHoldings(fundId: number, limit: number = 10): Promise<FundHoldings[]> {
    const result = await db.query<FundHoldings>(
      'SELECT * FROM fund_holdings WHERE fund_id = $1 ORDER BY holding_ratio DESC LIMIT $2',
      [fundId, limit]
    );
    return result.rows;
  }

  async search(keyword: string, limit: number = 20): Promise<Fund[]> {
    const result = await db.query<Fund>(
      `SELECT * FROM funds
       WHERE status = '正常'
       AND (fund_code LIKE $1 OR fund_name LIKE $1)
       ORDER BY fund_size DESC
       LIMIT $2`,
      [`%${keyword}%`, limit]
    );
    return result.rows;
  }

  async getTopFunds(type?: string, limit: number = 10): Promise<Fund[]> {
    let query = `
      SELECT f.*, (fnh.unit_nav - fnh_prev.unit_nav) / fnh_prev.unit_nav * 100 as recent_return
      FROM funds f
      LEFT JOIN fund_nav_history fnh ON f.id = fnh.fund_id
      LEFT JOIN fund_nav_history fnh_prev ON f.id = fnh_prev.fund_id AND fnh_prev.nav_date = fnh.nav_date - INTERVAL '1 day'
      WHERE f.status = '正常'
      AND fnh.nav_date = (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f.id)
    `;
    const params: any[] = [];

    if (type) {
      query += ' AND f.fund_type = $1';
      params.push(type);
    }

    query += ' ORDER BY recent_return DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query<Fund>(query, params);
    return result.rows;
  }
}

export default new FundService();
