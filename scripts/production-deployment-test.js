/**
 * Production Deployment Testing Script
 * 
 * This script tests the deployment in a production-like environment:
 * - Verifies all services are running
 * - Checks database and Redis connections
 * - Tests critical API endpoints
 * - Verifies domain configurations
 * - Checks SSL certificates
 * - Tests load balancing
 */

const fetch = require('node-fetch');
const { Pool } = require('pg');
const Redis = require('ioredis');
const https = require('https');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

// Configuration
const config = {
  domains: {
    landing: process.env.LANDING_DOMAIN || 'www.domain.com',
    auth: process.env.AUTH_DOMAIN || 'auth.domain.com',
    dashboard: process.env.DASHBOARD_DOMAIN || 'dashboard.domain.com',
    admin: process.env.ADMIN_DOMAIN || 'admin.domain.com'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/production_db'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379/0'
  },
  auth: {
    testUser: process.env.TEST_USER_EMAIL || 'test@example.com',
    testPassword: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
  }
};

// Main test function
async function runProductionTests() {
  console.log('🚀 Starting production deployment tests...');
  
  const results = {
    domains: {},
    database: false,
    redis: false,
    api: {},
    ssl: {},
    loadBalancing: false
  };
  
  try {
    // Test database connection
    console.log('\n📊 Testing database connection...');
    const pgPool = new Pool({ connectionString: config.database.url });
    try {
      const dbResult = await pgPool.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      results.database = true;
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
    } finally {
      await pgPool.end();
    }
    
    // Test Redis connection
    console.log('\n📊 Testing Redis connection...');
    const redis = new Redis(config.redis.url);
    try {
      const redisResult = await redis.ping();
      console.log('✅ Redis connection successful');
      results.redis = true;
    } catch (redisError) {
      console.error('❌ Redis connection failed:', redisError.message);
    } finally {
      await redis.quit();
    }
    
    // Test domain availability
    console.log('\n🌐 Testing domain availability...');
    for (const [key, domain] of Object.entries(config.domains)) {
      try {
        const response = await fetch(`https://${domain}`);
        console.log(`✅ ${domain} is available (Status: ${response.status})`);
        results.domains[key] = true;
      } catch (error) {
        console.error(`❌ ${domain} is not available:`, error.message);
        results.domains[key] = false;
      }
    }
    
    // Test SSL certificates
    console.log('\n🔒 Testing SSL certificates...');
    for (const [key, domain] of Object.entries(config.domains)) {
      try {
        const sslInfo = await checkSSL(domain);
        console.log(`✅ ${domain} has valid SSL certificate (expires: ${sslInfo.validTo})`);
        results.ssl[key] = true;
      } catch (error) {
        console.error(`❌ ${domain} SSL certificate issue:`, error.message);
        results.ssl[key] = false;
      }
    }
    
    // Test critical API endpoints
    console.log('\n🔌 Testing critical API endpoints...');
    
    // Test authentication
    try {
      const authResponse = await fetch(`https://${config.domains.auth}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: config.auth.testUser,
          password: config.auth.testPassword
        })
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log('✅ Authentication API is working');
        results.api.auth = true;
        
        // Use the token for further API tests
        const token = authData.token || '';
        
        // Test dashboard API
        try {
          const dashboardResponse = await fetch(`https://${config.domains.dashboard}/api/campaigns`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (dashboardResponse.ok) {
            console.log('✅ Dashboard API is working');
            results.api.dashboard = true;
          } else {
            console.error('❌ Dashboard API failed:', await dashboardResponse.text());
            results.api.dashboard = false;
          }
        } catch (dashboardError) {
          console.error('❌ Dashboard API error:', dashboardError.message);
          results.api.dashboard = false;
        }
        
        // Test admin API
        try {
          const adminResponse = await fetch(`https://${config.domains.admin}/api/health`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (adminResponse.ok) {
            console.log('✅ Admin API is working');
            results.api.admin = true;
          } else {
            console.error('❌ Admin API failed:', await adminResponse.text());
            results.api.admin = false;
          }
        } catch (adminError) {
          console.error('❌ Admin API error:', adminError.message);
          results.api.admin = false;
        }
      } else {
        console.error('❌ Authentication API failed:', await authResponse.text());
        results.api.auth = false;
      }
    } catch (authError) {
      console.error('❌ Authentication API error:', authError.message);
      results.api.auth = false;
    }
    
    // Test load balancing (if applicable)
    console.log('\n⚖️ Testing load balancing...');
    try {
      // Make multiple requests and check if they hit different instances
      // This is a simplified test that assumes Railway's load balancing
      const responses = await Promise.all(
        Array(10).fill().map(() => fetch(`https://${config.domains.landing}/api/health`))
      );
      
      // Check if we get different server IDs (simplified)
      const serverIds = new Set();
      for (const response of responses) {
        const serverId = response.headers.get('x-served-by');
        if (serverId) serverIds.add(serverId);
      }
      
      if (serverIds.size > 1) {
        console.log(`✅ Load balancing is working (detected ${serverIds.size} servers)`);
        results.loadBalancing = true;
      } else {
        console.log('ℹ️ Load balancing could not be verified or is not configured');
        results.loadBalancing = false;
      }
    } catch (lbError) {
      console.error('❌ Load balancing test error:', lbError.message);
      results.loadBalancing = false;
    }
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('----------------');
    console.log(`Database: ${results.database ? '✅' : '❌'}`);
    console.log(`Redis: ${results.redis ? '✅' : '❌'}`);
    
    console.log('\nDomains:');
    for (const [key, value] of Object.entries(results.domains)) {
      console.log(`- ${key}: ${value ? '✅' : '❌'}`);
    }
    
    console.log('\nAPI Endpoints:');
    for (const [key, value] of Object.entries(results.api)) {
      console.log(`- ${key}: ${value ? '✅' : '❌'}`);
    }
    
    console.log('\nSSL Certificates:');
    for (const [key, value] of Object.entries(results.ssl)) {
      console.log(`- ${key}: ${value ? '✅' : '❌'}`);
    }
    
    console.log(`\nLoad Balancing: ${results.loadBalancing ? '✅' : 'ℹ️ Not verified'}`);
    
    // Overall result
    const allPassed = Object.values(results.domains).every(Boolean) &&
                     results.database &&
                     results.redis &&
                     Object.values(results.api).every(Boolean) &&
                     Object.values(results.ssl).every(Boolean);
    
    if (allPassed) {
      console.log('\n🎉 All critical tests passed! Deployment is ready for production.');
      return 0;
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues before proceeding to production.');
      return 1;
    }
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    return 1;
  }
}

// Helper function to check SSL certificate
async function checkSSL(domain) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
      rejectUnauthorized: true,
    };
    
    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      
      if (res.socket.authorized) {
        resolve({
          valid: true,
          validFrom: new Date(cert.valid_from).toISOString(),
          validTo: new Date(cert.valid_to).toISOString(),
          issuer: cert.issuer.CN
        });
      } else {
        reject(new Error('Invalid certificate'));
      }
      
      res.on('data', () => {});
      res.on('end', () => {});
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Run the tests
runProductionTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });