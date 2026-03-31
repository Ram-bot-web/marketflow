# Email Notifications Setup Guide

This guide explains how to set up email notifications for the MarketFlow Dashboard.

## Overview

The email notification system supports multiple email providers:
- **SendGrid** (Recommended)
- **Mailgun**
- **SMTP** (via backend API)
- **Console** (Development mode - logs emails to console)

## Quick Setup

### Option 1: SendGrid (Recommended)

1. **Sign up for SendGrid**
   - Go to https://sendgrid.com
   - Create a free account (100 emails/day free tier)

2. **Create API Key**
   - Navigate to Settings > API Keys
   - Click "Create API Key"
   - Name it "MarketFlow"
   - Select "Full Access" or "Mail Send" permissions
   - Copy the API key

3. **Configure Environment Variables**
   Create a `.env` file in the project root:
   ```env
   VITE_EMAIL_PROVIDER=sendgrid
   VITE_EMAIL_FROM=noreply@yourdomain.com
   VITE_EMAIL_FROM_NAME=MarketFlow
   VITE_SENDGRID_API_KEY=your_sendgrid_api_key_here
   VITE_APP_URL=https://app.marketflow.com
   ```

4. **Verify Sender**
   - In SendGrid, go to Settings > Sender Authentication
   - Verify your sender email address
   - Or set up domain authentication for better deliverability

### Option 2: Mailgun

1. **Sign up for Mailgun**
   - Go to https://www.mailgun.com
   - Create a free account (5,000 emails/month free tier)

2. **Get API Credentials**
   - Navigate to Sending > Domain Settings
   - Copy your API Key and Domain

3. **Configure Environment Variables**
   ```env
   VITE_EMAIL_PROVIDER=mailgun
   VITE_EMAIL_FROM=noreply@yourdomain.com
   VITE_EMAIL_FROM_NAME=MarketFlow
   VITE_MAILGUN_API_KEY=your_mailgun_api_key_here
   VITE_MAILGUN_DOMAIN=your_mailgun_domain_here
   VITE_APP_URL=https://app.marketflow.com
   ```

### Option 3: SMTP (Requires Backend)

1. **Set up SMTP Server**
   - Use your existing email server (Gmail, Outlook, etc.)
   - Or use a service like AWS SES, Postmark, etc.

2. **Create Backend API Endpoint**
   - Create `/api/send-email` endpoint
   - Handle SMTP sending server-side
   - See `EMAIL_BACKEND_EXAMPLE.md` for implementation

3. **Configure Environment Variables**
   ```env
   VITE_EMAIL_PROVIDER=smtp
   VITE_EMAIL_FROM=noreply@yourdomain.com
   VITE_EMAIL_FROM_NAME=MarketFlow
   VITE_APP_URL=https://app.marketflow.com
   ```

### Option 4: Console Mode (Development)

For development/testing, use console mode:
```env
VITE_EMAIL_PROVIDER=console
```

Emails will be logged to the browser console instead of being sent.

## Installation

### For SendGrid:
```bash
npm install @sendgrid/mail
```

### For Mailgun:
No additional package needed (uses Fetch API)

### For SMTP:
Requires backend implementation (see backend example)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_EMAIL_PROVIDER` | Email provider: `sendgrid`, `mailgun`, `smtp`, or `console` | No | `console` |
| `VITE_EMAIL_FROM` | Sender email address | Yes | `noreply@marketflow.com` |
| `VITE_EMAIL_FROM_NAME` | Sender name | No | `MarketFlow` |
| `VITE_SENDGRID_API_KEY` | SendGrid API key | If using SendGrid | - |
| `VITE_MAILGUN_API_KEY` | Mailgun API key | If using Mailgun | - |
| `VITE_MAILGUN_DOMAIN` | Mailgun domain | If using Mailgun | - |
| `VITE_SMTP_HOST` | SMTP server host | If using SMTP | - |
| `VITE_SMTP_PORT` | SMTP server port | If using SMTP | `587` |
| `VITE_SMTP_USER` | SMTP username | If using SMTP | - |
| `VITE_SMTP_PASSWORD` | SMTP password | If using SMTP | - |
| `VITE_APP_URL` | Base URL for email links | No | `https://app.marketflow.com` |

## Email Templates

The system includes pre-built templates for:

1. **Welcome Email** - Sent when user registers
2. **Invoice Created** - Sent when invoice is generated
3. **Payment Reminder** - Sent for payment reminders
4. **Report Added** - Sent when new report is added
5. **Plan Updated** - Sent when marketing plan is updated
6. **Task Assigned** - Sent when task is assigned

Templates are defined in `src/lib/email.ts` and can be customized.

## User Preferences

Users can manage their email preferences in their Profile page:
- Enable/disable email notifications
- Select which notification types to receive
- Preferences are stored in Firestore `clients` collection

## Integration Points

Email notifications are automatically sent for:

1. **Invoice Generation** - When invoices are auto-generated
2. **Payment Reminders** - Daily check for overdue invoices
3. **Activity Logging** - When activities are logged (if template exists)
4. **Automation Triggers** - Via automation system

## Testing

### Test Email Sending

```typescript
import { sendTemplatedEmail } from '@/lib/email';

// Test welcome email
await sendTemplatedEmail('welcome', 'test@example.com', {
  businessName: 'Test Business',
  email: 'test@example.com',
});
```

### Test in Console Mode

Set `VITE_EMAIL_PROVIDER=console` and check browser console for email output.

## Troubleshooting

### Emails Not Sending

1. **Check Environment Variables**
   - Ensure all required variables are set
   - Restart dev server after changing `.env`

2. **Check Provider Configuration**
   - Verify API keys are correct
   - Check provider dashboard for errors
   - Ensure sender email is verified

3. **Check User Preferences**
   - User may have disabled email notifications
   - Check Firestore `clients` collection

4. **Check Browser Console**
   - Look for error messages
   - Check network tab for API calls

### SendGrid Issues

- **API Key Invalid**: Regenerate API key in SendGrid dashboard
- **Sender Not Verified**: Verify sender email in SendGrid
- **Rate Limits**: Check SendGrid dashboard for rate limit status

### Mailgun Issues

- **Domain Not Verified**: Verify domain in Mailgun dashboard
- **API Key Invalid**: Check API key in Mailgun settings
- **Sandbox Mode**: Use verified recipient emails in sandbox mode

## Security Considerations

1. **Never commit API keys to git**
   - Use `.env` file (already in `.gitignore`)
   - Use environment variables in production

2. **Use Backend for Production**
   - For production, consider using Firebase Cloud Functions
   - Keep API keys server-side only
   - See `FIREBASE_FUNCTIONS_SETUP.md` for email functions

3. **Rate Limiting**
   - Implement rate limiting to prevent abuse
   - Monitor email sending quotas

## Production Deployment

For production, it's recommended to:

1. **Use Firebase Cloud Functions**
   - Move email sending to server-side
   - Keep API keys secure
   - Better error handling and retries

2. **Set up Email Service**
   - Use production email service (SendGrid/Mailgun paid plan)
   - Set up domain authentication
   - Configure SPF/DKIM records

3. **Monitor Email Delivery**
   - Set up email delivery monitoring
   - Track bounce rates
   - Monitor spam complaints

## Example: Firebase Cloud Function for Email

See `FIREBASE_FUNCTIONS_SETUP.md` for complete example of email sending via Cloud Functions.

## Support

For issues or questions:
1. Check provider documentation (SendGrid/Mailgun)
2. Review error logs in browser console
3. Check Firestore for user preferences
4. Verify environment variables are set correctly


