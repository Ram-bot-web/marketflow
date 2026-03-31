# Firestore Collections Documentation

This document outlines all Firestore collections used in the MarketFlow Dashboard application.

## Collections Overview

### 1. **activities** ✅
- **Purpose**: Stores activity logs for all system events
- **Structure**:
  - `type`: ActivityType (registration, report, status_change, task_created, task_completed, asset_uploaded, asset_approved, asset_rejected, invoice_created, invoice_paid, plan_created, plan_updated, onboarding_completed)
  - `title`: string - Activity title
  - `subtitle`: string - Activity description
  - `clientId`: string - Associated client ID (empty for global activities)
  - `metadata`: object - Additional activity data
  - `ts`: number - Timestamp in milliseconds
  - `createdAt`: Timestamp - Firestore server timestamp
- **Used in**: AdminActivity page
- **Created by**: activityLogger utility (src/lib/activityLogger.ts)

### 2. **clients** ✅
- **Purpose**: Stores client/user data including onboarding information
- **Structure**:
  - `uid`: string - User ID
  - `email`: string - User email
  - `businessName`: string - Business name
  - `website`: string - Business website
  - `industry`: string - Industry type
  - `description`: string - Business description
  - `goals`: array - Marketing goals
  - `budget`: string - Budget tier
  - `audienceAge`: string - Target audience age
  - `audienceLocation`: string - Target location
  - `audienceInterests`: array - Target interests
  - `currentMarketing`: string - Current marketing activities
  - `competitors`: string - Competitor information
  - `status`: string - Client status
  - `projectStatus`: string - Project status
  - `onboardingCompleted`: boolean - Onboarding completion flag
  - `marketingPlan`: string - Marketing plan (legacy, also stored in marketingPlans collection)
  - `marketingPlanUpdatedAt`: Timestamp - Last plan update time
  - `marketingPlanUpdatedBy`: string - Who updated the plan
  - `createdAt`: Timestamp - Creation timestamp
  - `updatedAt`: Timestamp - Last update timestamp
- **Used in**: Onboarding, AdminClientDetail, AdminPlanEditor, and many other pages
- **Subcollections**: `reports` (see below)

### 3. **reports** ✅ (Subcollection under clients)
- **Purpose**: Stores monthly campaign reports for each client
- **Path**: `clients/{clientId}/reports/{reportId}`
- **Structure**:
  - `month`: string - Report month (e.g., "Feb 2025")
  - `leads`: number - Number of leads generated
  - `adSpend`: number - Advertising spend amount
  - `costPerLead`: number - Calculated cost per lead
  - `notes`: string - Additional notes
  - `createdAt`: Timestamp - Creation timestamp
- **Used in**: Results (client view), AdminReports, AdminClientDetail
- **Note**: Uses collectionGroup query to access all reports across clients

### 4. **tasks** ✅
- **Purpose**: Stores task management data
- **Structure**:
  - `title`: string - Task title
  - `description`: string - Task description
  - `priority`: string - Priority level (high, medium, low)
  - `status`: string - Task status (todo, in_progress, done)
  - `dueDate`: string - Due date
  - `createdAt`: Timestamp - Creation timestamp
  - `createdBy`: string - Creator email
- **Used in**: AdminTasks page

### 5. **assets** ✅
- **Purpose**: Stores asset upload metadata for review
- **Structure**:
  - `clientId`: string - Client ID who uploaded
  - `clientEmail`: string - Client email
  - `fileName`: string - File name
  - `category`: string - Asset category (logo, brand, products)
  - `status`: string - Review status (pending, approved, rejected)
  - `uploadedAt`: Timestamp - Upload timestamp
- **Used in**: Assets (client upload), AdminAssets (admin review)

### 6. **invoices** ✅
- **Purpose**: Stores billing and invoice data
- **Structure**:
  - `clientName`: string - Client name
  - `clientEmail`: string - Client email
  - `amount`: number - Invoice amount
  - `status`: string - Invoice status (pending, paid, overdue)
  - `month`: string - Invoice month
  - `dueDate`: string - Due date
  - `paidDate`: string - Payment date (if paid)
  - `notes`: string - Additional notes
  - `createdAt`: Timestamp - Creation timestamp
- **Used in**: AdminBilling page

### 7. **plans** ✅
- **Purpose**: Stores subscription plan definitions
- **Structure**:
  - `name`: string - Plan name (e.g., "Starter", "Growth")
  - `price`: number - Monthly price
  - `description`: string - Plan description
  - `features`: array - List of plan features
  - `isActive`: boolean - Whether plan is active
  - `createdAt`: Timestamp - Creation timestamp
- **Used in**: AdminPlanManager page

### 8. **marketingPlans** ✅ (NEW)
- **Purpose**: Dedicated collection for marketing plan documents
- **Structure**:
  - `clientId`: string - Associated client ID
  - `plan`: string - Marketing plan content (markdown/text)
  - `createdAt`: Timestamp - Creation timestamp
  - `updatedAt`: Timestamp - Last update timestamp
  - `updatedBy`: string - Who last updated the plan
- **Used in**: AdminPlanEditor (admin), Plan (client view)
- **Note**: Also stored in clients collection for backward compatibility

### 9. **users** ✅
- **Purpose**: Stores additional user profile data
- **Structure**:
  - `fullName`: string - User full name
  - `email`: string - User email
  - `businessName`: string - Business name
  - `createdAt`: Date - Registration date
- **Used in**: Register page

## Activity Logging

All major operations now log activities to the `activities` collection:
- User registration
- Onboarding completion
- Report creation
- Task creation/completion
- Asset upload/approval/rejection
- Invoice creation/payment
- Marketing plan creation/updates
- Status changes

## Collection Access Patterns

1. **Client-specific data**: Stored under `clients/{clientId}` or with `clientId` field
2. **Global data**: Stored at root level (tasks, plans, invoices)
3. **Subcollections**: Used for hierarchical data (reports under clients)
4. **Collection Groups**: Used to query across subcollections (reports)

## Notes

- All collections use Firestore server timestamps for `createdAt` and `updatedAt` fields
- The `activities` collection provides a centralized audit log
- Marketing plans are stored in both `marketingPlans` collection and `clients` collection for backward compatibility
- Reports use a subcollection pattern for better organization and security

