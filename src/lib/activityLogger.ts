import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendNotificationEmail } from './email';

export type ActivityType = 'registration' | 'report' | 'status_change' | 'task_created' | 'task_completed' | 'asset_uploaded' | 'asset_approved' | 'asset_rejected' | 'invoice_created' | 'invoice_paid' | 'plan_created' | 'plan_updated' | 'onboarding_completed';

export interface ActivityLog {
  type: ActivityType;
  title: string;
  subtitle: string;
  clientId: string;
  metadata?: Record<string, any>;
}

// Map activity types to email templates
const ACTIVITY_TO_EMAIL_TEMPLATE: Record<string, string> = {
  'invoice_created': 'invoice_created',
  'invoice_paid': 'invoice_created', // Reuse invoice template
  'plan_updated': 'plan_updated',
  'task_created': 'task_assigned',
  'report': 'report_added',
  'registration': 'welcome',
  'onboarding_completed': 'welcome',
};

/**
 * Log an activity to the Firestore 'activities' collection and send email if applicable
 */
export async function logActivity(activity: ActivityLog): Promise<void> {
  try {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      ts: Date.now(),
      createdAt: serverTimestamp(),
    });

    // Send email notification if template exists for this activity type
    const emailTemplate = ACTIVITY_TO_EMAIL_TEMPLATE[activity.type];
    if (emailTemplate && activity.clientId) {
      // Send email asynchronously (don't wait for it)
      sendNotificationEmail(activity.clientId, emailTemplate, {
        ...activity.metadata,
        activityType: activity.type,
        title: activity.title,
        subtitle: activity.subtitle,
      }).catch(error => {
        console.error('Failed to send email notification:', error);
        // Don't throw - email sending should not break activity logging
      });
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

