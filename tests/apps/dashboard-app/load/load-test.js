import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const campaignPageLoads = new Counter('campaign_page_loads');
const apiErrors = new Rate('api_errors');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users over 1 minute
    { duration: '3m', target: 50 }, // Stay at 50 users for 3 minutes
    { duration: '1m', target: 100 }, // Ramp up to 100 users over 1 minute
    { duration: '3m', target: 100 }, // Stay at 100 users for 3 minutes
    { duration: '1m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    'api_latency': ['p(95)<300'], // 95% of API calls should be below 300ms
    'api_errors': ['rate<0.01'], // Less than 1% API error rate
  },
};

// Simulated user pool
const users = Array.from({ length: 20 }).map((_, i) => ({
  email: `loadtest${i}@example.com`,
  password: 'Password123!',
  token: null
}));

// Main test function
export default function() {
  // Select a random user
  const userIndex = Math.floor(Math.random() * users.length);
  const user = users[userIndex];
  
  // Login if no token
  if (!user.token) {
    const loginRes = http.post('http://auth.localhost:3000/api/auth/login', JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    check(loginRes, {
      'login successful': (r) => r.status === 200,
    });
    
    if (loginRes.status === 200) {
      user.token = loginRes.json('token');
    }
  }
  
  // Skip further requests if login failed
  if (!user.token) {
    console.log(`Login failed for user ${user.email}`);
    sleep(1);
    return;
  }
  
  // Headers for authenticated requests
  const authHeaders = {
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json'
  };
  
  // Random user journey selection
  const journey = Math.random();
  
  if (journey < 0.4) {
    // Creator journey - browse campaigns
    const startTime = new Date();
    const campaignsRes = http.get('http://dashboard.localhost:3000/api/campaigns', { headers: authHeaders });
    apiLatency.add(new Date() - startTime);
    
    check(campaignsRes, {
      'campaigns loaded': (r) => r.status === 200,
    });
    
    if (campaignsRes.status !== 200) {
      apiErrors.add(1);
    } else {
      campaignPageLoads.add(1);
      
      // View a specific campaign if available
      try {
        const campaigns = campaignsRes.json('campaigns');
        if (campaigns && campaigns.length > 0) {
          const campaignId = campaigns[0].id;
          
          const campaignDetailRes = http.get(
            `http://dashboard.localhost:3000/api/campaigns/${campaignId}`,
            { headers: authHeaders }
          );
          
          check(campaignDetailRes, {
            'campaign detail loaded': (r) => r.status === 200,
          });
          
          if (campaignDetailRes.status !== 200) {
            apiErrors.add(1);
          }
        }
      } catch (e) {
        console.log('Error parsing campaigns:', e);
      }
    }
  } else if (journey < 0.7) {
    // Promoter journey - view analytics
    const startTime = new Date();
    const analyticsRes = http.get('http://dashboard.localhost:3000/api/promoter/analytics', { headers: authHeaders });
    apiLatency.add(new Date() - startTime);
    
    check(analyticsRes, {
      'analytics loaded': (r) => r.status === 200,
    });
    
    if (analyticsRes.status !== 200) {
      apiErrors.add(1);
    }
  } else {
    // Admin journey - view dashboard stats
    const startTime = new Date();
    const statsRes = http.get('http://admin.localhost:3000/api/dashboard/stats', { headers: authHeaders });
    apiLatency.add(new Date() - startTime);
    
    check(statsRes, {
      'admin stats loaded': (r) => r.status === 200,
    });
    
    if (statsRes.status !== 200) {
      apiErrors.add(1);
    }
  }
  
  // Random sleep between 1-5 seconds to simulate user behavior
  sleep(Math.random() * 4 + 1);
}