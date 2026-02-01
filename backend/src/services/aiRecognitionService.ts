import { FundRecognitionResult } from '../types';

export const recognizeFundFromImage = async (imageBuffer: Buffer): Promise<FundRecognitionResult> => {
  // TODO: Integrate with real AI service like Google Vision API, AWS Textract, or Azure Computer Vision
  // For now, return a mock result

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock recognition result
  return {
    fundName: '易方达蓝筹精选混合',
    fundCode: '005827',
    holdingShares: 1234.56,
    costPrice: 1.2345
  };
};

export const recognizeTradeHistoryFromImage = async (imageBuffer: Buffer): Promise<any[]> => {
  // TODO: Recognize multiple fund transactions from image

  await new Promise(resolve => setTimeout(resolve, 1000));

  return [
    {
      fundName: '易方达蓝筹精选混合',
      fundCode: '005827',
      holdingShares: 1234.56,
      costPrice: 1.2345,
      buyDate: '2024-01-01',
      sellDate: '2024-12-31'
    }
  ];
};
