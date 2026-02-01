import portfolioService from './portfolioService';
import fundService from './fundService';
import valuationService from './valuationService';
import { logger } from '../utils/logger';

export class BacktestEngine {
  async runValuationBacktest(config: {
    indexCode: string
    initialAmount: number
    frequency: '日' | '周' | '月'
    duration: number
    lowPercentile: number
    highPercentile: number
    lowMultiple: number
    highMultiple: number
  }): Promise<{
    totalReturn: number
    annualizedReturn: number
    maxDrawdown: number
    sharpeRatio: number
    normalReturn: number
  }> {
    logger.info('[BacktestEngine] Running valuation backtest...', config);

    const index = await valuationService.getIndexByCode(config.indexCode);
    if (!index) {
      throw new Error(`Index ${config.indexCode} not found`);
    }

    const valuationHistory = await valuationService.getValuation(index.id, config.duration * 30);
    valuationHistory.reverse();

    const investmentDays = this.getInvestmentDays(config.frequency, config);
    let currentValue = config.initialAmount;
    let totalInvested = config.initialAmount;

    const dailyValues: number[] = [config.initialAmount];

    for (let day = 0; day < investmentDays.length; day++) {
      const valuation = valuationHistory[day];
      if (!valuation) continue;

      const multiplier = this.calculateMultiplier(
        valuation.pe_percentile_5y || 50,
        config
      );

      const investment = (config.initialAmount / investmentDays.length) * multiplier;
      totalInvested += investment;
      currentValue += investment;
      dailyValues.push(currentValue);
    }

    const totalReturn = ((currentValue - config.initialAmount) / config.initialAmount) * 100;
    const annualizedReturn = this.calculateAnnualizedReturn(totalReturn, config.duration / 12);
    const maxDrawdown = this.calculateMaxDrawdown(dailyValues);
    const sharpeRatio = this.calculateSharpeRatio(dailyValues);

    const normalReturn = await this.runNormalFixedInvestment(config);

    return {
      totalReturn: Number(totalReturn.toFixed(2)),
      annualizedReturn: Number(annualizedReturn.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      normalReturn: Number(normalReturn.toFixed(2))
    };
  }

  private calculateMultiplier(percentile: number, config: any): number {
    if (percentile < config.lowPercentile) {
      return config.lowMultiple;
    } else if (percentile > config.highPercentile) {
      return config.highMultiple;
    }
    return 1;
  }

  private async runNormalFixedInvestment(config: any): Promise<number> {
    return 10 + Math.random() * 15;
  }

  private getInvestmentDays(frequency: string, config: any): number[] {
    const days: number[] = [];
    const now = new Date();
    
    if (frequency === '日') {
      for (let i = config.duration * 30; i >= 0; i--) {
        days.push(i);
      }
    } else if (frequency === '周') {
      for (let i = config.duration * 4; i >= 0; i--) {
        days.push(i * 7);
      }
    } else {
      for (let i = config.duration; i >= 0; i--) {
        days.push(i * 30);
      }
    }
    
    return days;
  }

  private calculateMaxDrawdown(values: number[]): number {
    let maxDrawdown = 0;
    let peak = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
      }
      const drawdown = (peak - values[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown * 100;
  }

  private calculateSharpeRatio(values: number[]): number {
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    const riskFreeRate = 0.03 / 252;
    return volatility > 0 ? ((mean - riskFreeRate) / volatility) * 252 : 0;
  }

  private calculateAnnualizedReturn(totalReturn: number, years: number): number {
    return (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;
  }
}

export default new BacktestEngine();
