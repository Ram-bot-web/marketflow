/**
 * Error logging utilities
 * Centralized error logging with different severity levels
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorLog {
  message: string;
  error: Error | any;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  url?: string;
  userAgent?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  /**
   * Log an error
   */
  log(
    message: string,
    error: Error | any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): void {
    const logEntry: ErrorLog = {
      message,
      error: this.sanitizeError(error),
      severity,
      context: this.sanitizeContext(context),
      timestamp: Date.now(),
      userId: this.getUserId(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry);
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.logToService(logEntry);
    }
  }

  /**
   * Log critical error
   */
  critical(message: string, error: Error | any, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.CRITICAL, context);
  }

  /**
   * Log high severity error
   */
  high(message: string, error: Error | any, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.HIGH, context);
  }

  /**
   * Log medium severity error
   */
  medium(message: string, error: Error | any, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Log low severity error
   */
  low(message: string, error: Error | any, context?: Record<string, any>): void {
    this.log(message, error, ErrorSeverity.LOW, context);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 10): ErrorLog[] {
    return this.logs.slice(-count).reverse();
  }

  /**
   * Get logs by severity
   */
  getLogsBySeverity(severity: ErrorSeverity): ErrorLog[] {
    return this.logs.filter(log => log.severity === severity).reverse();
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Sanitize error object
   */
  private sanitizeError(error: Error | any): any {
    if (!error) return null;
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    // Remove sensitive data
    const sanitized = { ...error };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Sanitize context object
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    
    const sanitized = { ...context };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;
    
    return sanitized;
  }

  /**
   * Get current user ID
   */
  private getUserId(): string | undefined {
    try {
      // Try to get from Firebase Auth
      if (typeof window !== 'undefined') {
        const auth = (window as any).__FIREBASE_AUTH__;
        if (auth?.currentUser?.uid) {
          return auth.currentUser.uid;
        }
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Log to console (development)
   */
  private logToConsole(log: ErrorLog): void {
    const style = this.getConsoleStyle(log.severity);
    console.group(`%c${log.severity.toUpperCase()}`, style);
    console.error('Message:', log.message);
    console.error('Error:', log.error);
    if (log.context) {
      console.error('Context:', log.context);
    }
    console.error('Timestamp:', new Date(log.timestamp).toISOString());
    console.groupEnd();
  }

  /**
   * Get console style for severity
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      [ErrorSeverity.LOW]: 'color: #666; font-weight: bold;',
      [ErrorSeverity.MEDIUM]: 'color: #ff9800; font-weight: bold;',
      [ErrorSeverity.HIGH]: 'color: #f44336; font-weight: bold;',
      [ErrorSeverity.CRITICAL]: 'color: #d32f2f; font-weight: bold; background: #ffebee;',
    };
    return styles[severity] || '';
  }

  /**
   * Log to external service (production)
   * Override this method to integrate with your error tracking service
   */
  private logToService(log: ErrorLog): void {
    // Example: Send to error tracking service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(log),
    // }).catch(() => {
    //   // Fail silently if logging service is down
    // });
    
    // For now, just log to console in production too
    // In a real app, integrate with Sentry, LogRocket, etc.
    if (log.severity === ErrorSeverity.CRITICAL || log.severity === ErrorSeverity.HIGH) {
      console.error('Error logged:', log);
    }
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

/**
 * React error boundary helper
 */
export function logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
  errorLogger.critical('React Error Boundary', error, {
    componentStack: errorInfo.componentStack,
  });
}



