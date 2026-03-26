/**
 * Email Notification Service
 * 
 * This module handles sending email notifications to clients and admins.
 * It supports multiple email providers (SendGrid, Mailgun, SMTP) and
 * provides a unified interface for sending emails.
 * 
 * Setup:
 * 1. Install email service: npm install @sendgrid/mail (or nodemailer for SMTP)
 * 2. Configure environment variables (see .env.example)
 * 3. Set up email templates
 */

import { db } from './firebase';
import { R } from './routes';
import { doc, getDoc } from 'firebase/firestore';
import sgMail from '@sendgrid/mail';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailTemplate {
  subject: string | ((data: Record<string, any>) => string);
  html: (data: Record<string, any>) => string;
  text?: string | ((data: Record<string, any>) => string);
}

export type EmailProvider = 'sendgrid' | 'mailgun' | 'smtp' | 'console';

// ── Configuration ────────────────────────────────────────────────────────────

const EMAIL_CONFIG = {
  provider: (import.meta.env.VITE_EMAIL_PROVIDER || 'console') as EmailProvider,
  fromEmail: import.meta.env.VITE_EMAIL_FROM || 'noreply@marketflow.com',
  fromName: import.meta.env.VITE_EMAIL_FROM_NAME || 'MarketFlow',
  sendgridApiKey: import.meta.env.VITE_SENDGRID_API_KEY || '',
  mailgunApiKey: import.meta.env.VITE_MAILGUN_API_KEY || '',
  mailgunDomain: import.meta.env.VITE_MAILGUN_DOMAIN || '',
  smtpHost: import.meta.env.VITE_SMTP_HOST || '',
  smtpPort: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
  smtpUser: import.meta.env.VITE_SMTP_USER || '',
  smtpPassword: import.meta.env.VITE_SMTP_PASSWORD || '',
};

const isBrowser = typeof window !== 'undefined';

/** SendGrid/Mailgun block browser CORS; SMTP expects a same-origin /api. Avoid red "failed" network calls in the SPA. */
function mustFallbackEmailToConsole(provider: EmailProvider): boolean {
  if (!isBrowser || provider === 'console') return false;
  if (import.meta.env.VITE_ALLOW_BROWSER_EMAIL === 'true') return false;
  return provider === 'sendgrid' || provider === 'mailgun' || provider === 'smtp';
}

// ── Email Templates ──────────────────────────────────────────────────────────

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  // Welcome email
  welcome: {
    subject: (data) => `Welcome to MarketFlow, ${data.businessName || 'there'}!`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to MarketFlow!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.businessName || 'there'},</p>
            <p>Thank you for joining MarketFlow! We're excited to help you grow your business with data-driven marketing strategies.</p>
            <p>Your account has been set up successfully. Here's what you can do next:</p>
            <ul>
              <li>Complete your onboarding to get started</li>
              <li>Review your marketing plan</li>
              <li>Track your campaign results</li>
            </ul>
            <a href="${data.dashboardUrl || 'https://app.marketflow.com/dashboard'}" class="button">Go to Dashboard</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The MarketFlow Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${data.email}. If you didn't sign up, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  // Invoice notification
  invoice_created: {
    subject: (data) => `Invoice #${data.invoiceId || 'NEW'} - ${data.month || 'Payment Due'}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .invoice-box { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .invoice-total { font-size: 24px; font-weight: bold; color: #667eea; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Invoice</h1>
          </div>
          <div class="content">
            <p>Hi ${data.clientName || 'there'},</p>
            <p>A new invoice has been generated for your account.</p>
            <div class="invoice-box">
              <div class="invoice-row">
                <span>Month:</span>
                <span>${data.month || 'N/A'}</span>
              </div>
              <div class="invoice-row">
                <span>Amount:</span>
                <span class="invoice-total">₹${data.amount?.toLocaleString() || '0'}</span>
              </div>
              <div class="invoice-row">
                <span>Due Date:</span>
                <span>${data.dueDate || 'N/A'}</span>
              </div>
              <div class="invoice-row">
                <span>Status:</span>
                <span>${data.status || 'Pending'}</span>
              </div>
            </div>
            <a href="${data.invoiceUrl || 'https://app.marketflow.com/invoices'}" class="button">View Invoice</a>
            <p>Please make payment by the due date to avoid any service interruptions.</p>
            <p>Best regards,<br>The MarketFlow Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  // Payment reminder
  payment_reminder: {
    subject: (data) => `Payment Reminder - Invoice #${data.invoiceId || ''} ${data.daysOverdue ? `(${data.daysOverdue} days overdue)` : ''}`,
    html: (data) => {
      const isOverdue = data.daysOverdue && data.daysOverdue > 0;
      return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${isOverdue ? '#ef4444' : '#f59e0b'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background: ${isOverdue ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${isOverdue ? '#ef4444' : '#f59e0b'}; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isOverdue ? 'Payment Overdue' : 'Payment Reminder'}</h1>
          </div>
          <div class="content">
            <p>Hi ${data.clientName || 'there'},</p>
            ${isOverdue 
              ? `<div class="alert"><strong>Your invoice is ${data.daysOverdue} day${data.daysOverdue > 1 ? 's' : ''} overdue.</strong> Please make payment as soon as possible to avoid service interruptions.</div>`
              : `<p>This is a friendly reminder that your invoice is due ${data.daysUntilDue === 0 ? 'today' : `in ${data.daysUntilDue} day${data.daysUntilDue > 1 ? 's' : ''}`}.</p>`
            }
            <p><strong>Invoice Details:</strong></p>
            <ul>
              <li>Month: ${data.month || 'N/A'}</li>
              <li>Amount: ₹${data.amount?.toLocaleString() || '0'}</li>
              <li>Due Date: ${data.dueDate || 'N/A'}</li>
            </ul>
            <a href="${data.invoiceUrl || 'https://app.marketflow.com/invoices'}" class="button">Pay Now</a>
            <p>If you've already made payment, please ignore this email.</p>
            <p>Best regards,<br>The MarketFlow Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    },
  },

  // Report added notification
  report_added: {
    subject: (data) => `New Campaign Report - ${data.month || 'Report'}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-box { background: white; padding: 15px; border-radius: 4px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Campaign Report</h1>
          </div>
          <div class="content">
            <p>Hi ${data.clientName || 'there'},</p>
            <p>A new campaign report has been added for ${data.month || 'this month'}.</p>
            <div class="stats">
              <div class="stat-box">
                <div class="stat-value">${data.leads || 0}</div>
                <div>Leads</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">₹${data.adSpend?.toLocaleString() || '0'}</div>
                <div>Ad Spend</div>
              </div>
            </div>
            <a href="${data.reportUrl || 'https://app.marketflow.com/results'}" class="button">View Full Report</a>
            <p>Best regards,<br>The MarketFlow Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  // Plan updated notification
  plan_updated: {
    subject: (data) => `Marketing Plan Updated`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Marketing Plan Updated</h1>
          </div>
          <div class="content">
            <p>Hi ${data.clientName || 'there'},</p>
            <p>Your marketing plan has been updated by ${data.updatedBy || 'your marketing team'}.</p>
            <p>Please review the changes and let us know if you have any questions.</p>
            <a href="${data.planUrl || 'https://app.marketflow.com/plan'}" class="button">View Updated Plan</a>
            <p>Best regards,<br>The MarketFlow Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  // Task assigned notification
  task_assigned: {
    subject: (data) => `New Task: ${data.taskTitle || 'Task Assigned'}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .task-box { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #667eea; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hi ${data.clientName || 'there'},</p>
            <p>A new task has been assigned to you:</p>
            <div class="task-box">
              <h3>${data.taskTitle || 'Task'}</h3>
              ${data.taskDescription ? `<p>${data.taskDescription}</p>` : ''}
              ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
              ${data.week ? `<p><strong>Week:</strong> ${data.week}</p>` : ''}
            </div>
            <a href="${data.taskUrl || 'https://app.marketflow.com/tasks'}" class="button">View Task</a>
            <p>Best regards,<br>The MarketFlow Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

// ── Email Sending Functions ──────────────────────────────────────────────────

/**
 * Send email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (mustFallbackEmailToConsole(EMAIL_CONFIG.provider)) {
      console.warn(
        `[email] Provider "${EMAIL_CONFIG.provider}" is not usable from the browser (CORS or missing backend). ` +
          'Logging only. Set VITE_EMAIL_PROVIDER=console, or send mail from a Cloud Function / server. ' +
          '(Optional unsafe override: VITE_ALLOW_BROWSER_EMAIL=true)'
      );
      return sendViaConsole(options);
    }

    switch (EMAIL_CONFIG.provider) {
      case 'sendgrid':
        return await sendViaSendGrid(options);
      case 'mailgun':
        return await sendViaMailgun(options);
      case 'smtp':
        return await sendViaSMTP(options);
      case 'console':
      default:
        return await sendViaConsole(options);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send email using SendGrid
 * Requires: VITE_SENDGRID_API_KEY in .env (see EMAIL_SETUP.md)
 */
async function sendViaSendGrid(options: EmailOptions): Promise<boolean> {
  if (!EMAIL_CONFIG.sendgridApiKey) {
    console.warn('SendGrid: VITE_SENDGRID_API_KEY not set. Using console fallback.');
    return sendViaConsole(options);
  }
  try {
    sgMail.setApiKey(EMAIL_CONFIG.sendgridApiKey);

    const msg = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      from: options.from || `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
      ...(options.replyTo && { replyTo: options.replyTo }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
    };

    await sgMail.send(msg);
    console.log('Email sent via SendGrid:', options.to);
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}

/**
 * Send email using Mailgun
 */
async function sendViaMailgun(options: EmailOptions): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('from', options.from || `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`);
    formData.append('to', Array.isArray(options.to) ? options.to.join(',') : options.to);
    formData.append('subject', options.subject);
    formData.append('html', options.html);
    if (options.text) formData.append('text', options.text);

    const response = await fetch(
      `https://api.mailgun.net/v3/${EMAIL_CONFIG.mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${EMAIL_CONFIG.mailgunApiKey}`)}`,
        },
        body: formData,
      }
    );

    if (response.ok) {
      console.log('Email sent via Mailgun:', options.to);
      return true;
    } else {
      console.error('Mailgun error:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Mailgun error:', error);
    return false;
  }
}

/**
 * Send email using SMTP (requires backend)
 */
async function sendViaSMTP(options: EmailOptions): Promise<boolean> {
  // No Vite dev server route for /api/send-email — avoid guaranteed failed fetch in Network tab.
  console.warn('[email] SMTP needs a real backend (e.g. Cloud Function). Use VITE_EMAIL_PROVIDER=console in .env.');
  return sendViaConsole(options);
}

/**
 * Console logger (for development)
 */
async function sendViaConsole(options: EmailOptions): Promise<boolean> {
  console.log('📧 Email (Console Mode):', {
    to: options.to,
    subject: options.subject,
    html: options.html.substring(0, 200) + '...',
  });
  return true;
}

/**
 * Send email using a template
 */
export async function sendTemplatedEmail(
  templateName: string,
  to: string | string[],
  data: Record<string, any>
): Promise<boolean> {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    console.error(`Email template not found: ${templateName}`);
    return false;
  }

  const subject = typeof template.subject === 'function' 
    ? template.subject(data) 
    : template.subject;
  
  const html = typeof template.html === 'function'
    ? template.html(data)
    : template.html;

  const text = template.text 
    ? (typeof template.text === 'function' ? template.text(data) : template.text)
    : html.replace(/<[^>]*>/g, '');

  return await sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Get user email preferences
 */
export async function getUserEmailPreferences(userId: string): Promise<{
  emailEnabled: boolean;
  emailTypes: string[];
}> {
  try {
    const userDoc = await getDoc(doc(db, 'clients', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        emailEnabled: data.emailNotificationsEnabled !== false, // Default to true
        emailTypes: data.emailNotificationTypes || ['all'], // Default to all
      };
    }
    // Default preferences
    return {
      emailEnabled: true,
      emailTypes: ['all'],
    };
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    return {
      emailEnabled: true,
      emailTypes: ['all'],
    };
  }
}

/**
 * Check if user should receive email for this notification type
 */
export async function shouldSendEmail(
  userId: string,
  notificationType: string
): Promise<boolean> {
  const preferences = await getUserEmailPreferences(userId);
  
  if (!preferences.emailEnabled) {
    return false;
  }

  if (preferences.emailTypes.includes('all')) {
    return true;
  }

  return preferences.emailTypes.includes(notificationType);
}

/**
 * Get user email address
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'clients', userId));
    if (userDoc.exists()) {
      return userDoc.data().email || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
}

/**
 * Send notification email (with preference check)
 */
export async function sendNotificationEmail(
  userId: string,
  templateName: string,
  data: Record<string, any>
): Promise<boolean> {
  // Check preferences
  const shouldSend = await shouldSendEmail(userId, templateName);
  if (!shouldSend) {
    console.log(`Email not sent to ${userId} - preferences disabled for ${templateName}`);
    return false;
  }

  // Get user email
  const email = await getUserEmail(userId);
  if (!email) {
    console.error(`No email found for user ${userId}`);
    return false;
  }

  // Add user-specific data
  const userDoc = await getDoc(doc(db, 'clients', userId));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    data.clientName = userData.businessName || userData.email || 'there';
    data.email = email;
  }

  // Add base URLs (use encoded routes for obfuscation)
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://app.marketflow.com';
  data.dashboardUrl = `${baseUrl}${R.DASHBOARD}`;
  data.invoiceUrl = `${baseUrl}${R.INVOICES}`;
  data.reportUrl = `${baseUrl}${R.RESULTS}`;
  data.planUrl = `${baseUrl}${R.PLAN}`;
  data.taskUrl = `${baseUrl}${R.TASKS}`;

  return await sendTemplatedEmail(templateName, email, data);
}


