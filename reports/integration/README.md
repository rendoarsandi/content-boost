# Integration Tests

This directory contains reports from integration tests for the Creator Promotion Platform API endpoints.

## Test Coverage

The integration tests cover the following API endpoints:

### Dashboard App

1. **Campaign Management API**
   - `GET /api/campaigns` - List campaigns for authenticated creator
   - `POST /api/campaigns` - Create new campaign
   - `GET /api/campaigns/[id]` - Get specific campaign
   - `PUT /api/campaigns/[id]` - Update campaign
   - `DELETE /api/campaigns/[id]` - Delete campaign

2. **Metrics Collection API**
   - `GET /api/campaigns/[id]/metrics` - Get real-time campaign metrics

### Admin App

1. **Payment Processing API**
   - `GET /api/finances/transactions` - Get financial transactions

2. **Admin Functionality API**
   - `POST /api/users/[id]/unban` - Unban a user

## Running Tests

To run the integration tests, use the following command:

```bash
npm run test:integration
```

This will:
1. Run all integration tests for each app
2. Generate a JSON report in this directory
3. Display a summary of test results

## Test Reports

Test reports are generated in JSON format with the naming convention:
`integration-test-report-{timestamp}.json`

Each report contains:
- Timestamp of the test run
- Summary of test results (total, passed, failed, skipped)
- Detailed results for each app

## Requirements Coverage

These tests cover the following requirements from the project specifications:

- Requirement 1.1, 1.2: Campaign creation and management
- Requirement 4.3, 4.4: View tracking and metrics collection
- Requirement 6.4: Payment processing
- Requirement 7.2: Admin functionality for user management
- Requirement 10.1, 10.3: Testing and reporting infrastructure