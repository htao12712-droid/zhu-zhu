import db from '../config/database';
import { Index, IndexValuation, IndexFund } from '../models/Valuation';

export class ValuationService {
  async getIndexByCode(code: string): Promise<Index | null> {
    const result = await db.query<Index>(
      'SELECT * FROM indices WHERE index_code = $1',
      [code]
    );
    return result.rows[0] || null;
  }

  async getIndexById(id: number): Promise<Index | null> {
    const result = await db.query<Index>(
      'SELECT * FROM indices WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async list(filters: {
    type?: string;
    isHot?: boolean;
  } = {}): Promise<Index[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.type) {
      conditions.push(`index_type = $${paramCount++}`);
      params.push(filters.type);
    }

    const query = conditions.length > 0
      ? `SELECT * FROM indices WHERE ${conditions.join(' AND ')} ORDER BY index_code`
      : 'SELECT * FROM indices ORDER BY index_code';

    const result = await db.query<Index>(query, params);
    return result.rows;
  }

  async getValuation(indexId: number, limit: number = 100): Promise<IndexValuation[]> {
    const result = await db.query<IndexValuation>(
      'SELECT * FROM index_valuations WHERE index_id = $1 ORDER BY valuation_date DESC LIMIT $2',
      [indexId, limit]
    );
    return result.rows;
  }

  async getLatestValuation(indexId: number): Promise<IndexValuation | null> {
    const result = await db.query<IndexValuation>(
      'SELECT * FROM index_valuations WHERE index_id = $1 ORDER BY valuation_date DESC LIMIT 1',
      [indexId]
    );
    return result.rows[0] || null;
  }

  async getValuationDashboard(): Promise<any[]> {
    const result = await db.query(`
      SELECT
        i.id,
        i.index_code,
        i.index_name,
        i.index_type,
        iv.valuation_date,
        iv.pe_ratio,
        iv.pb_ratio,
        iv.valuation_status,
        iv.pe_percentile_5y
      FROM indices i
      LEFT JOIN LATERAL (
        SELECT *
        FROM index_valuations
        WHERE index_id = i.id
        ORDER BY valuation_date DESC
        LIMIT 1
      ) iv ON true
      ORDER BY iv.pe_percentile_5y ASC NULLS LAST
      LIMIT 50
    `);
    return result.rows;
  }

  async getValuationRanking(): Promise<any[]> {
    const result = await db.query(`
      SELECT
        i.id,
        i.index_code,
        i.index_name,
        i.index_type,
        iv.valuation_date,
        iv.pe_ratio,
        iv.pb_ratio,
        iv.valuation_status,
        iv.pe_percentile_5y,
        iv.pb_percentile_5y
      FROM indices i
      LEFT JOIN LATERAL (
        SELECT *
        FROM index_valuations
        WHERE index_id = i.id
        ORDER BY valuation_date DESC
        LIMIT 1
      ) iv ON true
      ORDER BY iv.pe_percentile_5y ASC NULLS LAST
    `);
    return result.rows;
  }

  async addValuation(valuationData: Partial<IndexValuation>[]): Promise<IndexValuation[]> {
    const results: IndexValuation[] = [];

    await db.transaction(async (client) => {
      for (const valuation of valuationData) {
        const result = await client.query<IndexValuation>(
          `INSERT INTO index_valuations
           (index_id, valuation_date, pe_ratio, pb_ratio, ps_ratio, dividend_yield, pe_percentile_5y, pb_percentile_5y, ps_percentile_5y, valuation_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (index_id, valuation_date)
           DO UPDATE SET
             pe_ratio = EXCLUDED.pe_ratio,
             pb_ratio = EXCLUDED.pb_ratio,
             ps_ratio = EXCLUDED.ps_ratio,
             dividend_yield = EXCLUDED.dividend_yield,
             pe_percentile_5y = EXCLUDED.pe_percentile_5y,
             pb_percentile_5y = EXCLUDED.pb_percentile_5y,
             ps_percentile_5y = EXCLUDED.ps_percentile_5y,
             valuation_status = EXCLUDED.valuation_status
           RETURNING *`,
          [
            valuation.index_id,
            valuation.valuation_date,
            valuation.pe_ratio,
            valuation.pb_ratio,
            valuation.ps_ratio,
            valuation.dividend_yield,
            valuation.pe_percentile_5y,
            valuation.pb_percentile_5y,
            valuation.ps_percentile_5y,
            valuation.valuation_status
          ]
        );
        results.push(result.rows[0]);
      }
    });

    return results;
  }

  async calculatePercentile(indexId: number, currentPe: number, years: number = 5): Promise<number> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    const result = await db.query(
      'SELECT COUNT(*) as count, SUM(CASE WHEN pe_ratio <= $1 THEN 1 ELSE 0 END) as rank FROM index_valuations WHERE index_id = $2 AND valuation_date >= $3',
      [currentPe, indexId, startDate]
    );

    const { count, rank } = result.rows[0];
    return count > 0 ? (rank / count) * 100 : 0;
  }

  async getIndexFunds(indexId: number): Promise<IndexFund[]> {
    const result = await db.query<IndexFund>(
      'SELECT * FROM index_funds WHERE index_id = $1 ORDER BY correlation DESC',
      [indexId]
    );
    return result.rows;
  }

  async getIndexValuationDetail(indexCode: string): Promise<any[]> {
    const result = await db.query(`
      SELECT
        i.id,
        i.index_code,
        i.index_name,
        i.index_type,
        iv.valuation_date,
        iv.pe_ratio,
        iv.pb_ratio,
        iv.ps_ratio,
        iv.dividend_yield,
        iv.pe_percentile_5y,
        iv.pb_percentile_5y,
        iv.ps_percentile_5y,
        iv.valuation_status
      FROM indices i
      LEFT JOIN LATER (
        SELECT *
        FROM index_valuations
        WHERE index_id = i.id
        ORDER BY valuation_date DESC
        LIMIT 100
      ) iv ON true
      WHERE i.index_code = $1
      ORDER BY iv.valuation_date DESC
    `, [indexCode]);

    return result.rows;
  }

  async updateValuationStatus(): Promise<number> {
    const result = await db.query(`
      UPDATE index_valuations
      SET valuation_status = CASE
        WHEN pe_percentile_5y < 30 THEN '低估'
        WHEN pe_percentile_5y > 70 THEN '高估'
        ELSE '正常'
      END
      WHERE valuation_date = (SELECT MAX(valuation_date) FROM index_valuations WHERE index_id = index_valuations.index_id)
      AND pe_percentile_5y IS NOT NULL
    `);
    return result.rowCount || 0;
  }
}

export default new ValuationService();
