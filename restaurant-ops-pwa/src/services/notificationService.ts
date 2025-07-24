/**
 * 推送通知服务
 * 处理 PWA 推送通知的权限请求、注册和发送
 * @created by Claude
 * @date 2025-01-24
 */

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
}

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    // 检查浏览器是否支持通知
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 检查是否支持推送通知
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('该浏览器不支持推送通知');
      return 'denied';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return 'denied';
    }
  }

  /**
   * 获取当前权限状态
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * 发送本地通知
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    if (this.permission !== 'granted') {
      console.debug('没有通知权限');
      return;
    }

    try {
      // 如果有 Service Worker，使用它来发送通知
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icon.svg',
          badge: options.badge || '/icon.svg',
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
          data: options.data,
          vibrate: [200, 100, 200], // 振动模式
        });
      } else {
        // 降级到普通通知
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icon.svg',
        });
      }
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  }

  /**
   * 发送任务提醒通知
   */
  async sendTaskReminder(taskName: string, periodName: string): Promise<void> {
    await this.sendNotification({
      title: '任务提醒',
      body: `${periodName}时段：请完成"${taskName}"任务`,
      tag: `task-${taskName}`,
      requireInteraction: true,
      data: {
        type: 'task-reminder',
        task: taskName,
        period: periodName,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 发送时段开始通知
   */
  async sendPeriodStartNotification(periodName: string, taskCount: number): Promise<void> {
    await this.sendNotification({
      title: '新时段开始',
      body: `${periodName}时段已开始，您有 ${taskCount} 个任务待完成`,
      tag: `period-${periodName}`,
      data: {
        type: 'period-start',
        period: periodName,
        taskCount,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 发送任务逾期提醒
   */
  async sendOverdueNotification(taskName: string, minutesOverdue: number): Promise<void> {
    await this.sendNotification({
      title: '任务逾期提醒',
      body: `"${taskName}"任务已逾期 ${minutesOverdue} 分钟，请尽快完成`,
      tag: `overdue-${taskName}`,
      requireInteraction: true,
      data: {
        type: 'task-overdue',
        task: taskName,
        minutesOverdue,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 测试通知功能
   */
  async testNotification(): Promise<void> {
    if (this.permission !== 'granted') {
      await this.requestPermission();
    }
    
    await this.sendNotification({
      title: '测试通知',
      body: '推送通知功能正常工作',
      tag: 'test',
    });
  }
}

// 创建单例实例
const notificationService = new NotificationService();

export default notificationService;
export { NotificationService, type NotificationOptions };