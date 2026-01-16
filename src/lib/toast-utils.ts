import { toast } from 'sonner';

/**
 * 检测是否是用户主动取消/拒绝的操作
 */
function isUserRejection(error: unknown): boolean {
  if (!error) return false;
  
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  
  // 常见的用户拒绝/取消错误关键词
  const rejectionPatterns = [
    'user rejected',
    'user denied',
    'user cancelled',
    'user canceled',
    'rejected the request',
    'denied transaction',
    'transaction was rejected',
    'request rejected',
    'user refused',
    'action_rejected',
    'user disapproved',
    '用户拒绝',
    '用户取消',
    'cancelled by user',
    'canceled by user',
  ];
  
  return rejectionPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * 检测是否是网络/连接错误
 */
function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  
  const networkPatterns = [
    'network',
    'timeout',
    'connection',
    'failed to fetch',
    'rpc',
    'request failed',
  ];
  
  return networkPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * 智能显示交易相关的错误/警告
 * - 用户拒绝 → warning toast
 * - 网络错误 → error toast with retry hint
 * - 其他错误 → error toast
 */
export function showTxError(
  error: unknown, 
  context?: string,
  options?: { 
    onRetry?: () => void;
  }
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // 用户主动取消 - 显示友好的 warning
  if (isUserRejection(error)) {
    toast.warning('交易已取消', {
      description: '您取消了此次操作',
      duration: 3000,
    });
    return;
  }
  
  // 网络错误 - 提示重试
  if (isNetworkError(error)) {
    toast.error('网络连接问题', {
      description: '请检查网络连接后重试',
      duration: 5000,
      action: options?.onRetry ? {
        label: '重试',
        onClick: options.onRetry,
      } : undefined,
    });
    return;
  }
  
  // 其他错误
  toast.error(context || '操作失败', {
    description: truncateMessage(errorMessage),
    duration: 5000,
  });
}

/**
 * 截断过长的错误信息
 */
function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + '...';
}

/**
 * 将错误转换为用户友好的提示信息
 * 用于 UI 中显示的 error state
 */
export function formatUserFriendlyError(error: unknown): string | null {
  if (!error) return null;
  
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  
  // 用户拒绝签名
  if (lowerMessage.includes('user rejected') || 
      lowerMessage.includes('user denied') ||
      lowerMessage.includes('rejected the request') ||
      lowerMessage.includes('denied request signature')) {
    return '您取消了签名请求';
  }
  
  // 用户取消操作
  if (lowerMessage.includes('user cancelled') || 
      lowerMessage.includes('user canceled') ||
      lowerMessage.includes('cancelled by user')) {
    return '您取消了操作';
  }
  
  // 余额不足
  if (lowerMessage.includes('insufficient') || 
      lowerMessage.includes('not enough')) {
    return '余额不足';
  }
  
  // 网络错误
  if (lowerMessage.includes('network') || 
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('failed to fetch')) {
    return '网络连接失败，请稍后重试';
  }
  
  // Gas 相关
  if (lowerMessage.includes('gas')) {
    return 'Gas 费用估算失败';
  }
  
  // 默认：截断过长的错误信息
  return truncateMessage(message, 80);
}

/**
 * 显示交易进度提示
 */
export function showTxProgress(message: string, description?: string) {
  return toast.loading(message, {
    description,
  });
}

/**
 * 显示交易成功提示
 */
export function showTxSuccess(message: string, description?: string, txHash?: string) {
  toast.success(message, {
    description,
    duration: 5000,
  });
}

/**
 * 显示信息提示
 */
export function showInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 4000,
  });
}

/**
 * 显示警告提示
 */
export function showWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

