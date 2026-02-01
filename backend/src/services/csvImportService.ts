import portfolioService from './portfolioService';

export interface FundCSVRecord {
  fundName: string;
  fundCode: string;
  holdingShares: number;
  costPrice: number;
  buyDate?: string;
  sellDate?: string;
}

export const importFundFromCSV = async (userId: number, csvBuffer: Buffer): Promise<any[]> => {
  const csvContent = csvBuffer.toString('utf-8');

  const lines = csvContent.split('\n');
  const results: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',').map(col => col.trim());

    if (columns.length < 4) continue;

    const record: FundCSVRecord = {
      fundName: columns[0],
      fundCode: columns[1],
      holdingShares: parseFloat(columns[2]),
      costPrice: parseFloat(columns[3]),
      buyDate: columns[4],
      sellDate: columns[5]
    };

    if (isNaN(record.holdingShares) || isNaN(record.costPrice)) {
      continue;
    }

    try {
      const holding = await portfolioService.addHolding({
        user_id: userId,
        fund_id: parseInt(record.fundCode),
        holding_shares: record.holdingShares,
        cost_price: record.costPrice,
        source: 'CSV导入'
      });

      results.push(holding);
    } catch (error) {
      console.error(`Failed to import fund ${record.fundCode}:`, error);
    }
  }

  return results;
};
