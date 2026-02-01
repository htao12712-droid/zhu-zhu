import { User, UserThirdPartyAccount, UserSettings } from '../models/User';
import { Fund, FundNavHistory, FundHoldings } from '../models/Fund';
import { UserHolding, SimulatedPortfolio, SimulatedPortfolioAllocation, StopLossProfitSetting } from '../models/Portfolio';

interface MockDatabase {
  users: Map<number, User>;
  usersByPhone: Map<string, User>;
  funds: Map<number, Fund>;
  fundsByCode: Map<string, Fund>;
  userHoldings: Map<number, UserHolding[]>;
  fundNavHistory: Map<number, FundNavHistory[]>;
  userIdCounter: number;
  fundIdCounter: number;
  holdingIdCounter: number;
}

const mockDB: MockDatabase = {
  users: new Map(),
  usersByPhone: new Map(),
  funds: new Map(),
  fundsByCode: new Map(),
  userHoldings: new Map(),
  fundNavHistory: new Map(),
  userIdCounter: 1,
  fundIdCounter: 1,
  holdingIdCounter: 1
};

export const isMockMode = (): boolean => {
  return !mockDB.users;
};

export const createUser = async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
  const newUser: User = {
    ...user,
    id: mockDB.userIdCounter++,
    created_at: new Date(),
    updated_at: new Date()
  };
  mockDB.users.set(newUser.id, newUser);
  mockDB.usersByPhone.set(newUser.phone, newUser);
  return newUser;
};

export const findUserByPhone = async (phone: string): Promise<User | null> => {
  return mockDB.usersByPhone.get(phone) || null;
};

export const findUserById = async (id: number): Promise<User | null> => {
  return mockDB.users.get(id) || null;
};

export const createFund = async (fund: Omit<Fund, 'id' | 'created_at' | 'updated_at'>): Promise<Fund> => {
  const newFund: Fund = {
    ...fund,
    id: mockDB.fundIdCounter++,
    created_at: new Date(),
    updated_at: new Date()
  };
  mockDB.funds.set(newFund.id, newFund);
  mockDB.fundsByCode.set(newFund.fund_code, newFund);
  return newFund;
};

export const findFundByCode = async (code: string): Promise<Fund | null> => {
  return mockDB.fundsByCode.get(code) || null;
};

export const findFundById = async (id: number): Promise<Fund | null> => {
  return mockDB.funds.get(id) || null;
};

export const listFunds = async (filters: any = {}, pagination: any = { page: 1, pageSize: 20 }): Promise<{ funds: Fund[]; total: number }> => {
  let funds = Array.from(mockDB.funds.values());

  if (filters.type) {
    funds = funds.filter(f => f.fund_type === filters.type);
  }

  const start = (pagination.page - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  const paginatedFunds = funds.slice(start, end);

  return {
    funds: paginatedFunds,
    total: funds.length
  };
};

export const searchFunds = async (keyword: string, limit: number = 20): Promise<Fund[]> => {
  const allFunds = Array.from(mockDB.funds.values());
  const lowerKeyword = keyword.toLowerCase();
  return allFunds
    .filter(f =>
      f.fund_code.toLowerCase().includes(lowerKeyword) ||
      f.fund_name.toLowerCase().includes(lowerKeyword)
    )
    .slice(0, limit);
};

export const createHolding = async (holding: Omit<UserHolding, 'id' | 'created_at' | 'updated_at'>): Promise<UserHolding> => {
  const newHolding: UserHolding = {
    ...holding,
    id: mockDB.holdingIdCounter++,
    created_at: new Date(),
    updated_at: new Date(),
    cost_amount: holding.holding_shares * holding.cost_price
  };

  const userHoldings = mockDB.userHoldings.get(holding.user_id) || [];
  userHoldings.push(newHolding);
  mockDB.userHoldings.set(holding.user_id, userHoldings);

  return newHolding;
};

export const getUserHoldings = async (userId: number): Promise<UserHolding[]> => {
  const holdings = mockDB.userHoldings.get(userId) || [];

  return await Promise.all(holdings.map(async (holding: UserHolding) => {
    const fund = await findFundById(holding.fund_id);
    const fundCode = fund?.fund_code || '未知';
    const fundName = fund?.fund_name || '未知基金';
    const fundType = fund?.fund_type || '其他';

    const currentNav = 1.0;
    const currentValue = holding.holding_shares * currentNav;
    const returnRate = holding.cost_amount > 0
      ? ((currentValue - holding.cost_amount) / holding.cost_amount * 100)
      : 0;

    return {
      ...holding,
      fund_code: fundCode,
      fund_name: fundName,
      fund_type: fundType,
      current_nav: currentNav,
      current_value: currentValue,
      return_rate: returnRate
    };
  }));
};

export const updateHolding = async (userId: number, holdingId: number, updates: Partial<UserHolding>): Promise<UserHolding | null> => {
  const userHoldings = mockDB.userHoldings.get(userId) || [];
  const holding = userHoldings.find(h => h.id === holdingId);

  if (!holding) {
    return null;
  }

  Object.assign(holding, updates, {
    updated_at: new Date(),
    cost_amount: updates.holding_shares && updates.cost_price
      ? updates.holding_shares * updates.cost_price
      : holding.cost_amount
  });

  return holding;
};

export const deleteHolding = async (userId: number, holdingId: number): Promise<boolean> => {
  const userHoldings = mockDB.userHoldings.get(userId) || [];
  const index = userHoldings.findIndex(h => h.id === holdingId);

  if (index === -1) {
    return false;
  }

  userHoldings.splice(index, 1);
  mockDB.userHoldings.set(userId, userHoldings);

  return true;
};

export const getPortfolioSummary = async (userId: number): Promise<any> => {
  const holdings = await getUserHoldings(userId);

  const totalCost = holdings.reduce((sum, h) => sum + (h.cost_amount || 0), 0);
  const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  const fundCount = holdings.length;

  const totalReturn = totalCost > 0
    ? ((totalValue - totalCost) / totalCost * 100)
    : 0;

  return {
    total_cost: totalCost,
    total_value: totalValue,
    fund_count: fundCount,
    total_return: totalReturn,
    todayReturn: 0
  };
};

export const verifyPassword = (plainPassword: string, hashedPassword: string): boolean => {
  return plainPassword === '123456';
};

export const hashPassword = async (password: string): Promise<string> => {
  return 'mock_hash_' + password;
};

export const generateToken = (userId: number): string => {
  return `mock_token_${userId}_${Date.now()}`;
};

export const verifyToken = (token: string): { userId: number } | null => {
  const match = token.match(/^mock_token_(\d+)_/);
  if (match) {
    return { userId: parseInt(match[1]) };
  }
  return null;
};

export const resetMockData = () => {
  mockDB.users.clear();
  mockDB.usersByPhone.clear();
  mockDB.funds.clear();
  mockDB.fundsByCode.clear();
  mockDB.userHoldings.clear();
  mockDB.fundNavHistory.clear();
  mockDB.userIdCounter = 1;
  mockDB.fundIdCounter = 1;
  mockDB.holdingIdCounter = 1;
};
