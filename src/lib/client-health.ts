/**
 * Client health score calculation
 * Calculates health score based on engagement metrics
 */

export interface ClientHealthMetrics {
  engagementLevel: number; // 0-100
  taskCompletionRate: number; // 0-100
  reportSubmissionFrequency: number; // 0-100
  responseTime: number; // 0-100 (lower is better, inverted)
}

export interface ClientHealthScore {
  score: number; // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'at-risk';
  metrics: ClientHealthMetrics;
  factors: string[];
}

/**
 * Calculate client health score
 */
export function calculateHealthScore(
  metrics: Partial<ClientHealthMetrics>
): ClientHealthScore {
  const engagementLevel = metrics.engagementLevel ?? 50;
  const taskCompletionRate = metrics.taskCompletionRate ?? 50;
  const reportSubmissionFrequency = metrics.reportSubmissionFrequency ?? 50;
  const responseTime = metrics.responseTime ?? 50;

  // Weighted average
  const score = Math.round(
    engagementLevel * 0.3 +
    taskCompletionRate * 0.3 +
    reportSubmissionFrequency * 0.2 +
    responseTime * 0.2
  );

  // Determine level
  let level: ClientHealthScore['level'] = 'fair';
  if (score >= 80) level = 'excellent';
  else if (score >= 65) level = 'good';
  else if (score >= 50) level = 'fair';
  else if (score >= 35) level = 'poor';
  else level = 'at-risk';

  // Identify factors
  const factors: string[] = [];
  if (engagementLevel < 40) factors.push('Low engagement');
  if (taskCompletionRate < 40) factors.push('Low task completion');
  if (reportSubmissionFrequency < 40) factors.push('Infrequent reports');
  if (responseTime < 40) factors.push('Slow response time');
  if (score >= 80) factors.push('High performer');
  if (taskCompletionRate >= 90) factors.push('Excellent task completion');

  return {
    score,
    level,
    metrics: {
      engagementLevel,
      taskCompletionRate,
      reportSubmissionFrequency,
      responseTime,
    },
    factors,
  };
}

/**
 * Get health score color
 */
export function getHealthScoreColor(level: ClientHealthScore['level']): string {
  const colors = {
    excellent: 'text-success bg-success/10',
    good: 'text-primary bg-primary/10',
    fair: 'text-warning bg-warning/10',
    poor: 'text-destructive bg-destructive/10',
    'at-risk': 'text-destructive bg-destructive/20',
  };
  return colors[level];
}

/**
 * Get health score icon
 */
export function getHealthScoreIcon(level: ClientHealthScore['level']): string {
  const icons = {
    excellent: '✓',
    good: '✓',
    fair: '⚠',
    poor: '⚠',
    'at-risk': '✗',
  };
  return icons[level];
}



