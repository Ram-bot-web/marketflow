/** Canonical public site URL — set VITE_PUBLIC_SITE_URL in .env for production. */
export const SITE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) ||
  'https://app.marketflow.com';

export const SITE_NAME = 'MarketFlow';

export const HOME_TITLE = `${SITE_NAME} | Client Marketing Dashboard & Campaign Analytics`;

export const HOME_DESCRIPTION =
  'MarketFlow is the client marketing platform for planning campaigns, tracking leads and ad spend, measuring ROI, and collaborating with your marketing team—all in one dashboard.';

export const LOGIN_TITLE = `Sign in | ${SITE_NAME}`;

export const LOGIN_DESCRIPTION =
  'Log in to your MarketFlow client portal to view marketing plans, performance reports, invoices, and tasks.';

export const REGISTER_TITLE = `Create account | ${SITE_NAME}`;

export const REGISTER_DESCRIPTION =
  'Register your business on MarketFlow to access your marketing dashboard, reports, and dedicated campaign insights.';
