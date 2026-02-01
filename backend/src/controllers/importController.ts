import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { recognizeFundFromImage } from '../services/aiRecognitionService';
import { importFundFromCSV } from '../services/csvImportService';

export const recognizeFund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, '请上传图片');
    }

    const result = await recognizeFundFromImage(req.file.buffer);

    res.json({
      fund_name: result.fundName,
      fund_code: result.fundCode,
      holding_shares: result.holdingShares,
      cost_price: result.costPrice
    });
  } catch (error) {
    next(error);
  }
};

export const importCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    if (!req.file) {
      throw new AppError(400, '请上传文件');
    }

    const result = await importFundFromCSV(userId, req.file.buffer);

    res.json({
      message: '导入成功',
      count: result.length
    });
  } catch (error) {
    next(error);
  }
};
