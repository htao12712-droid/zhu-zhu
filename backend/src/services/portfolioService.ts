import db from '../config/database-sqlite';
import authorityProviderService from './authorityProviderService';
import { logger } from '../utils/logger';
import { UserHolding, SimulatedPortfolio, SimulatedPortfolioAllocation, StopLossProfitSetting } from '../models/Portfolio';

export class PortfolioService {
  private async enrichRealtimeForHoldings(holdings: any[]): Promise<any[]> {
    const codes = Array.from(new Set(holdings.map(h => h.fund_code).filter(Boolean)));
    const estimates: Record<string, any> = {};
    const concurrency = 5;
    let idx = 0;
    const workers = new Array(concurrency).fill(0).map(async () => {
      while (idx < codes.length) {
        const code = codes[idx++];
        try {
          estimates[code] = await authorityProviderService.getRealtimeEstimate(code);
        } catch (e) {
          estimates[code] = null;
        }
      }
    });
    await Promise.all(workers);

    // valuation tag by benchmark index (optional)
    const benchmarkCodes = Array.from(new Set(holdings.map(h => h.benchmark_index).filter(Boolean)));
    const valuationMap: Record<string, any> = {};
    if (benchmarkCodes.length) {
      // Map benchmark_index (index_code) -> latest percentile
      const placeholders = benchmarkCodes.map((_, i) => `$${i + 1}`).join(',');
      const q = `
        SELECT i.index_code, v.valuation_date, v.pe_percentile_5y, v.pb_percentile_5y
        FROM indices i
        LEFT JOIN LATERAL (
          SELECT valuation_date, pe_percentile_5y, pb_percentile_5y
          FROM index_valuations
          WHERE index_id = i.id
          ORDER BY valuation_date DESC
          LIMIT 1
        ) v ON true
        WHERE i.index_code IN (${placeholders})
      `;
      try {
        const r = await db.query<any>(q, benchmarkCodes);
        for (const row of r.rows) {
          const pe = row.pe_percentile_5y != null ? Number(row.pe_percentile_5y) : null;
          const pb = row.pb_percentile_5y != null ? Number(row.pb_percentile_5y) : null;
          const p = (pe != null && pb != null) ? (pe + pb) / 2 : (pe != null ? pe : (pb != null ? pb : null));
          valuationMap[row.index_code] = { percentile_5y: p, valuation_date: row.valuation_date };
        }
      } catch (e) {
        logger.warn('load valuation map failed', { e });
      }
    }

    return holdings.map(h => {
      const est = estimates[h.fund_code] || null;
      const estNav = est ? Number(est.estimate_nav || 0) : 0;
      const navT1 = est ? Number(est.unit_nav || 0) : (h.current_nav ? Number(h.current_nav) : 0);
      const navT1Date = est ? est.nav_date : (h.nav_date ? h.nav_date : null);
      const todayChangeRate = est ? Number(est.estimate_change_pct || 0) : (h.latest_change_rate ? Number(h.latest_change_rate) : 0);
      const todayProfit = (h.holding_shares || 0) * (estNav - navT1);
      const totalProfitEst = (h.holding_shares || 0) * estNav - (h.cost_amount || 0);
      const totalProfitNav = (h.holding_shares || 0) * (h.current_nav || 0) - (h.cost_amount || 0);
      const currentValueEst = (h.holding_shares || 0) * estNav;
      const returnRateEst = (h.cost_amount || 0) > 0 ? (totalProfitEst / h.cost_amount * 100) : 0;

      const vm = h.benchmark_index ? valuationMap[h.benchmark_index] : null;
      let valuationTag: '低估' | '正常' | '高估' | null = null;
      let valuationPercentile: number | null = null;
      if (vm && vm.percentile_5y != null) {
        valuationPercentile = Number(vm.percentile_5y);
        if (valuationPercentile <= 20) valuationTag = '低估';
        else if (valuationPercentile >= 80) valuationTag = '高估';
        else valuationTag = '正常';
      }

      return {
        ...h,
        est_nav: estNav || null,
        nav_t1: navT1 || null,
        nav_t1_date: navT1Date,
        today_change_rate: todayChangeRate,
        today_profit: todayProfit,
        total_profit_est: totalProfitEst,
        total_profit_nav: totalProfitNav,
        current_value_est: currentValueEst,
        return_rate_est: returnRateEst,
        valuation_tag: valuationTag,
        valuation_percentile_5y: valuationPercentile,
      };
    });
  }

  async getUserHoldings(userId: number): Promise<UserHolding[]> {
    const result = await db.query<UserHolding>(
      `SELECT
        uh.id,
        uh.user_id,
        uh.fund_id,
        uh.holding_shares,
        uh.cost_price,
        uh.cost_amount,
        uh.source,
        uh.sync_platform,
        uh.created_at,
        uh.updated_at,
        f.fund_code,
        f.fund_name,
        f.fund_type,
        f.benchmark_index,
        fnh.unit_nav as current_nav,
        fnh.nav_date as nav_date,
        fnh_prev.unit_nav as prev_nav,
        -- 当前市值
        (uh.holding_shares * COALESCE(fnh.unit_nav, 0)) as current_value,
        -- 持有总收益（金额）
        (uh.holding_shares * COALESCE(fnh.unit_nav, 0) - COALESCE(uh.cost_amount, 0)) as total_profit,
        -- 持有总收益率（%）
        CASE
          WHEN COALESCE(uh.cost_amount, 0) > 0 THEN ((uh.holding_shares * COALESCE(fnh.unit_nav, 0) - uh.cost_amount) / uh.cost_amount * 100)
          ELSE 0
        END as return_rate,
        -- 最新涨幅（相对上一交易日，%）
        CASE
          WHEN COALESCE(fnh_prev.unit_nav, 0) > 0 AND COALESCE(fnh.unit_nav, 0) > 0 THEN ((fnh.unit_nav - fnh_prev.unit_nav) / fnh_prev.unit_nav * 100)
          ELSE 0
        END as latest_change_rate,
        -- 最新收益（相对上一交易日，金额）
        (uh.holding_shares * (COALESCE(fnh.unit_nav, 0) - COALESCE(fnh_prev.unit_nav, COALESCE(fnh.unit_nav, 0)))) as latest_profit
      FROM user_holdings uh
      LEFT JOIN funds f ON uh.fund_id = f.id
      LEFT JOIN fund_nav_history fnh ON f.id = fnh.fund_id
        AND fnh.nav_date = (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f.id)
      LEFT JOIN fund_nav_history fnh_prev ON f.id = fnh_prev.fund_id
        AND fnh_prev.nav_date = (
          SELECT nav_date
          FROM fund_nav_history
          WHERE fund_id = f.id AND nav_date < (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f.id)
          ORDER BY nav_date DESC
          LIMIT 1
        )
      WHERE uh.user_id = $1
      ORDER BY uh.cost_amount DESC`,
      [userId]
    );
    return await this.enrichRealtimeForHoldings(result.rows as any);
  }

  async addHolding(holdingData: Partial<UserHolding> & { user_id: number }): Promise<UserHolding> {
    const costAmount = (holdingData as any).cost_amount !== undefined && (holdingData as any).cost_amount !== null
      ? Number((holdingData as any).cost_amount)
      : (holdingData.holding_shares! * holdingData.cost_price!);

    // AUTO_CALC_SHARES_FROM_AMOUNT: 小倍养基口径 - 只填金额，自动按实时估算价/最新净值换算份额并锁定成本价
    let holdingSharesNum = Number((holdingData as any).holding_shares || 0);
    let costAmountNum = Number((holdingData as any).cost_amount || 0);
    let costPriceNum = Number((holdingData as any).cost_price || 0);

    // If shares missing but amount provided, calculate shares using realtime estimate first, fallback to latest nav
    if ((!holdingSharesNum || holdingSharesNum <= 0) && costAmountNum > 0) {
      let fundCode: string | null = null;
      if ((holdingData as any).fund_code) fundCode = String((holdingData as any).fund_code);
      if (!fundCode && (holdingData as any).fund_id) {
        const fr = await db.query<{ fund_code: string }>('SELECT fund_code FROM funds WHERE id=$1', [Number((holdingData as any).fund_id)]);
        fundCode = fr.rows?.[0]?.fund_code || null;
      }

      let buyPrice = 0;
      if (fundCode) {
        try {
          const est = await authorityProviderService.getRealtimeEstimate(fundCode);
          buyPrice = Number(est.estimate_nav || 0) || Number(est.unit_nav || 0) || 0;
        } catch (e) {
          // ignore
        }
      }

      if (!buyPrice && (holdingData as any).fund_id) {
        const nr = await db.query<{ unit_nav: any }>(
          'SELECT unit_nav FROM fund_nav_history WHERE fund_id=$1 ORDER BY nav_date DESC LIMIT 1',
          [Number((holdingData as any).fund_id)]
        );
        buyPrice = Number(nr.rows?.[0]?.unit_nav || 0) || 0;
      }

      if (buyPrice > 0) {
        holdingSharesNum = Number((costAmountNum / buyPrice).toFixed(4));
        costPriceNum = buyPrice;
      }
    }

    // write back normalized numbers
    (holdingData as any).holding_shares = holdingSharesNum;
    (holdingData as any).cost_amount = costAmountNum;
    (holdingData as any).cost_price = costPriceNum;


    const result = await db.query<UserHolding>(
      'INSERT INTO user_holdings (user_id, fund_id, holding_shares, cost_price, cost_amount, source, sync_platform) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, fund_id) DO UPDATE SET holding_shares = EXCLUDED.holding_shares, cost_price = EXCLUDED.cost_price, cost_amount = EXCLUDED.cost_amount, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [
        holdingData.user_id,
        holdingData.fund_id,
        holdingData.holding_shares,
        holdingData.cost_price,
        costAmount,
        holdingData.source || '手动',
        holdingData.sync_platform
      ]
    );
    return result.rows[0];
  }

  async updateHolding(userId: number, id: number, holdingData: Partial<UserHolding>): Promise<UserHolding | null> {
    const holding = await db.query<UserHolding>('SELECT * FROM user_holdings WHERE id = $1', [id]);

    if (!holding.rows[0]) {
      return null;
    }

    if (holding.rows[0].user_id !== userId) {
      throw new Error('无权操作该持仓');
    }

    const costAmount = (holdingData as any).cost_amount !== undefined && (holdingData as any).cost_amount !== null
      ? Number((holdingData as any).cost_amount)
      : (holdingData.holding_shares && holdingData.cost_price
        ? holdingData.holding_shares * holdingData.cost_price
        : undefined);

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (holdingData.holding_shares !== undefined) {
      fields.push(`holding_shares = $${paramCount++}`);
      values.push(holdingData.holding_shares);
    }
    if (holdingData.cost_price !== undefined) {
      fields.push(`cost_price = $${paramCount++}`);
      values.push(holdingData.cost_price);
    }
    if ((holdingData as any).cost_amount !== undefined) {
      fields.push(`cost_amount = $${paramCount++}`);
      values.push((holdingData as any).cost_amount);
    }
    if (costAmount !== undefined) {
      fields.push(`cost_amount = $${paramCount++}`);
      values.push(costAmount);
    }

    if (fields.length === 0) {
      return holding.rows[0];
    }

    values.push(id);
    const query = `UPDATE user_holdings SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query<UserHolding>(query, values);
    return result.rows[0] || null;
  }

  async deleteHolding(userId: number, id: number): Promise<boolean> {
    const holding = await db.query<UserHolding>('SELECT * FROM user_holdings WHERE id = $1', [id]);

    if (!holding.rows[0]) {
      return false;
    }

    if (holding.rows[0].user_id !== userId) {
      throw new Error('无权操作该持仓');
    }

    const result = await db.query('DELETE FROM user_holdings WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  async getPortfolioSummary(userId: number): Promise<any> {
    const result = await db.query(`
      SELECT
        SUM(uh.cost_amount) as total_cost,
        SUM(uh.holding_shares * fnh.unit_nav) as total_value,
        COUNT(DISTINCT uh.fund_id) as fund_count,
        COALESCE(SUM(
          uh.holding_shares * (
            COALESCE(fnh.unit_nav, 0) - COALESCE(fnh_prev.unit_nav, COALESCE(fnh.unit_nav, 0))
          )
        ), 0) as today_return
      FROM user_holdings uh
      LEFT JOIN funds f ON uh.fund_id = f.id
      LEFT JOIN fund_nav_history fnh ON f.id = fnh.fund_id
        AND fnh.nav_date = (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f.id)
      LEFT JOIN fund_nav_history fnh_prev ON f.id = fnh_prev.fund_id
        AND fnh_prev.nav_date = (
          SELECT nav_date
          FROM fund_nav_history
          WHERE fund_id = f.id AND nav_date < (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f.id)
          ORDER BY nav_date DESC
          LIMIT 1
        )
      WHERE uh.user_id = $1`,
      [userId]
    );
    const summary = result.rows[0];
    summary.total_return = summary.total_cost > 0
      ? ((summary.total_value - summary.total_cost) / summary.total_cost * 100)
      : 0;
    summary.todayReturn = summary.today_return || 0;
    return summary;
  }

  async getAssetAllocation(userId: number): Promise<any[]> {
    const result = await db.query(`
      SELECT
        f.fund_type,
        f.benchmark_index,
        COUNT(DISTINCT uh.fund_id) as fund_count,
        SUM(uh.cost_amount) as total_cost,
        SUM(uh.holding_shares * fnh.unit_nav) as total_value
      FROM user_holdings uh
      LEFT JOIN funds f ON uh.fund_id = f.id
      LEFT JOIN fund_nav_history fnh ON f.id = fnh.fund_id
        AND fnh.nav_date = (SELECT MAX(nav_date) FROM fund_nav_history WHERE fund_id = f.id)
      WHERE uh.user_id = $1
      GROUP BY f.fund_type
      ORDER BY total_value DESC`,
      [userId]
    );
    return result.rows;
  }

  async getRiskDiagnosis(userId: number): Promise<any> {
    const allocation = await this.getAssetAllocation(userId);
    const totalValue = allocation.reduce((sum: number, item: any) => sum + parseFloat(item.total_value || 0), 0);

    const warnings: string[] = [];

    allocation.forEach((item: any) => {
      const ratio = (parseFloat(item.total_value || 0) / totalValue) * 100;
      if (ratio > 70) {
        warnings.push(`单一类型(${item.fund_type})配置过高(${ratio.toFixed(1)}%)`);
      }
    });

    return {
      allocation,
      warnings,
      totalValue
    };
  }

  async getSimulatedPortfolios(userId: number): Promise<SimulatedPortfolio[]> {
    const result = await db.query<SimulatedPortfolio>(
      'SELECT * FROM simulated_portfolios WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async createSimulatedPortfolio(portfolioData: Partial<SimulatedPortfolio> & { user_id: number }): Promise<SimulatedPortfolio> {
    const result = await db.query<SimulatedPortfolio>(
      'INSERT INTO simulated_portfolios (user_id, portfolio_name, initial_capital, start_date, description, is_public) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        portfolioData.user_id,
        portfolioData.portfolio_name,
        portfolioData.initial_capital,
        portfolioData.start_date,
        portfolioData.description,
        portfolioData.is_public || false
      ]
    );
    return result.rows[0];
  }

  async getSimulatedPortfolioAllocations(portfolioId: number): Promise<SimulatedPortfolioAllocation[]> {
    const result = await db.query<SimulatedPortfolioAllocation>(
      `SELECT spa.*, f.fund_code, f.fund_name
       FROM simulated_portfolio_allocations spa
       JOIN funds f ON spa.fund_id = f.id
       WHERE spa.portfolio_id = $1
       ORDER BY spa.allocation_ratio DESC`,
      [portfolioId]
    );
    return result.rows;
  }

  async getStopLossProfitSettings(userId: number): Promise<StopLossProfitSetting[]> {
    const result = await db.query<StopLossProfitSetting>(
      'SELECT * FROM stop_loss_profit_settings WHERE user_id = $1 AND status = $2',
      [userId, '激活']
    );
    return result.rows;
  }

  async addStopLossProfitSetting(settingData: Partial<StopLossProfitSetting> & { user_id: number }): Promise<StopLossProfitSetting> {
    const result = await db.query<StopLossProfitSetting>(
      'INSERT INTO stop_loss_profit_settings (user_id, fund_id, stop_profit_type, stop_profit_value, stop_loss_type, stop_loss_value) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, fund_id) DO UPDATE SET stop_profit_type = EXCLUDED.stop_profit_type, stop_profit_value = EXCLUDED.stop_profit_value, stop_loss_type = EXCLUDED.stop_loss_type, stop_loss_value = EXCLUDED.stop_loss_value, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [
        settingData.user_id,
        settingData.fund_id,
        settingData.stop_profit_type,
        settingData.stop_profit_value,
        settingData.stop_loss_type,
        settingData.stop_loss_value
      ]
    );
    return result.rows[0];
  }
}

export default new PortfolioService();
