export interface Notification {
  id: string;
  userId: number;
  type: 'system' | 'portfolio' | 'valuation' | 'fund';
  title: string;
  content: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface NotificationTemplate {
  type: Notification['type'];
  template: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export class NotificationService {
  private notificationQueue: Notification[] = [];
  private processing: boolean = false;

  private templates: Map<string, NotificationTemplate> = new Map([
    ['valuation_signal_low', {
      type: 'valuation',
      template: '指数{indexName}进入低估区域(PE分位点{percentile}%),建议加大定投',
      priority: 'normal'
    }],
    ['valuation_signal_high', {
      type: 'valuation',
      template: '指数{indexName}进入高估区域(PE分位点{percentile}%),建议注意风险',
      priority: 'high'
    }],
    ['stop_profit_trigger', {
      type: 'portfolio',
      template: '基金{fundName}达到止盈条件({value}{type}),建议及时止盈',
      priority: 'urgent'
    }],
    ['stop_loss_trigger', {
      type: 'portfolio',
      template: '基金{fundName}触发止损条件({value}{type}),请注意控制损失',
      priority: 'urgent'
    }],
    ['manager_change', {
      type: 'fund',
      template: '基金{fundName}经理已变更,新经理为{newManager}',
      priority: 'normal'
    }],
    ['fund_new_nav', {
      type: 'fund',
      template: '您关注的基金{fundName}今日净值{nav},涨跌幅{change}%',
      priority: 'low'
    }],
    ['portfolio_risk_warning', {
      type: 'portfolio',
      template: '您的组合{warningType},建议分散投资降低风险',
      priority: 'high'
    }]
  ]);

  public async send(userId: number, type: Notification['type'], title: string, content: string, data?: any): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      userId,
      type,
      title,
      content,
      data,
      read: false,
      createdAt: new Date()
    };

    this.notificationQueue.push(notification);

    return notification;
  }

  public async sendByTemplate(userId: number, templateKey: string, params: Record<string, any>): Promise<Notification> {
    const template = this.templates.get(templateKey);

    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    const content = this.renderTemplate(template.template, params);

    return this.send(userId, template.type, this.getTemplateTitle(templateKey, params), content, params);
  }

  public async sendBatch(userIds: number[], type: Notification['type'], title: string, content: string, data?: any): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const userId of userIds) {
      const notification = await this.send(userId, type, title, content, data);
      notifications.push(notification);
    }

    return notifications;
  }

  public async sendValuationSignal(userId: number, indexName: string, percentile: number, isLow: boolean): Promise<void> {
    const templateKey = isLow ? 'valuation_signal_low' : 'valuation_signal_high';
    await this.sendByTemplate(userId, templateKey, {
      indexName,
      percentile: percentile.toFixed(1)
    });
  }

  public async sendStopProfit(userId: number, fundName: string, value: number, type: string): Promise<void> {
    await this.sendByTemplate(userId, 'stop_profit_trigger', {
      fundName,
      value,
      type
    });
  }

  public async sendStopLoss(userId: number, fundName: string, value: number, type: string): Promise<void> {
    await this.sendByTemplate(userId, 'stop_loss_trigger', {
      fundName,
      value,
      type
    });
  }

  public async sendPortfolioRiskWarning(userId: number, warningType: string): Promise<void> {
    await this.sendByTemplate(userId, 'portfolio_risk_warning', {
      warningType
    });
  }

  private renderTemplate(template: string, params: Record<string, any>): string {
    let content = template;

    for (const [key, value] of Object.entries(params)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    return content;
  }

  private getTemplateTitle(templateKey: string, params: Record<string, any>): string {
    const titleMap: Record<string, string> = {
      'valuation_signal_low': '估值信号提示',
      'valuation_signal_high': '估值信号提示',
      'stop_profit_trigger': '止盈提醒',
      'stop_loss_trigger': '止损提醒',
      'manager_change': '经理变更提醒',
      'fund_new_nav': '净值更新',
      'portfolio_risk_warning': '组合风险提示'
    };

    return titleMap[templateKey] || '系统通知';
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async getUserNotifications(userId: number, options: {
    type?: Notification['type'];
    read?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    notifications: Notification[];
    total: number;
  }> {
    let filtered = this.notificationQueue.filter(n => n.userId === userId);

    if (options.type) {
      filtered = filtered.filter(n => n.type === options.type);
    }

    if (options.read !== undefined) {
      filtered = filtered.filter(n => n.read === options.read);
    }

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    const notifications = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return {
      notifications,
      total
    };
  }

  public async markAsRead(userId: number, notificationIds: string[]): Promise<void> {
    for (const id of notificationIds) {
      const notification = this.notificationQueue.find(n => n.id === id && n.userId === userId);
      if (notification) {
        notification.read = true;
      }
    }
  }

  public async markAllAsRead(userId: number): Promise<void> {
    for (const notification of this.notificationQueue) {
      if (notification.userId === userId) {
        notification.read = true;
      }
    }
  }

  public async deleteNotifications(userId: number, notificationIds: string[]): Promise<void> {
    this.notificationQueue = this.notificationQueue.filter(
      n => !(n.userId === userId && notificationIds.includes(n.id))
    );
  }

  public getUnreadCount(userId: number): number {
    return this.notificationQueue.filter(n => n.userId === userId && !n.read).length;
  }

  public async startProcessing(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        await this.deliverNotification(notification);
      }
    }

    this.processing = false;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    console.log(`[Notification] Delivering notification to user ${notification.userId}:`, notification.title);
  }

  public async stopProcessing(): Promise<void> {
    this.processing = false;
  }

  public addTemplate(key: string, template: NotificationTemplate): void {
    this.templates.set(key, template);
  }

  public getTemplates(): Map<string, NotificationTemplate> {
    return new Map(this.templates);
  }
}

export default new NotificationService();
