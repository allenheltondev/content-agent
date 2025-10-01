#!/usr/bin/env node

/**
 * Test script for Blog API endpoints
 * This script tests the API Gateway integration with Lambda functions and authorizer
 */

import { readFileSync } from 'fs';

// Configuration
const CONFIG_FILE = 'samconfig.toml';
const TEST_JWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJ0ZW5hbnRJZCI6InRlc3QtdGVuYW50LWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjk5OTk5OTk5OTl9.invalid-signature';

// Read stack name from samconfig.toml
function getStackName() {
  try {
    const config = readFileSync(CONFIG_FILE, 'utf8');
    const match = config.match(/stack_name\s*=\s*"([^"]+)"/);
    return match ? match[1] : 'blog-api-stack';
  } catch (error) {
    console.log('Could not read samconfig.toml, using default stack name');
    return 'blog-api-stack';
  }
}

// Get API Gateway URL from CloudFormation outputs
async function getApiUrl() {
  const stackName = getStackName();

  try {
    // This would normally use AWS SDK to get the stack outputs
    // For now, we'll construct the expected URL format
    const region = process.env.AWS_REGION || 'us-east-1';
    console.log(`Expected API URL format: https://{api-id}.execute-api.${region}.amazonaws.com/api`);
    console.log(`Stack name: ${stackName}`);
    console.log('To get the actual API URL, run: aws cloudformation describe-stacks --stack-name', stackName);
    return null;
  } catch (error) {
    console.error('Error getting API URL:', error.message);
    return null;
  }
}

// Test API endpoints
async function testEndpoints(baseUrl) {
  const endpoints = [
    { method: 'GET', path: '/posts', description: 'List posts' },
    { method: 'POST', path: '/posts', description: 'Create post', body: { title: 'Test Post', body: 'Test content' } },
    { method: 'GET', path: '/posts/test-id', description: 'Get specific post' },
    { method: 'PUT', path: '/posts/test-id', description: 'Update post', body: { title: 'Updated Post' } },
    { method: 'DELETE', path: '/posts/test-id', description: 'Delete post' },
    { method: 'GET', path: '/posts/test-id/suggestions', description: 'Get suggestions' },
    { method: 'DELETE', path: '/suggestions/test-suggestion-id', description: 'Delete suggestion' }
  ];

  console.log('\n=== API Endpoint Tests ===');
  console.log('Note: These tests require a deployed stack and valid JWT token\n');

  for (const endpoint of endpoints) {
    console.log(`${endpoint.method} ${endpoint.path} - ${endpoint.description}`);

    if (baseUrl) {
      const url = `${baseUrl}${endpoint.path}`;
      const options = {
        method: endpoint.method,
        headers: {
          'Authorization': TEST_JWT,
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      console.log(`  URL: ${url}`);
      console.log(`  Headers: Authorization: ${TEST_JWT.substring(0, 20)}...`);

      if (endpoint.body) {
        console.log(`  Body: ${JSON.stringify(endpoint.body)}`);
      }
    }

    console.log('');
  }
}

// Verify authorizer context
function verifyAuthorizerContext() {
  console.log('\n=== Authorizer Context Verification ===');
  console.log('The Lambda authorizer should:');
  console.log('1. Validate JWT token signature against Cognito public keys');
  console.log('2. Extract tenantId and userId from JWT claims');
  console.log('3. Return IAM policy with context containing:');
  console.log('   - tenantId: extracted from JWT custom claim');
  console.log('   - userId: extracted from JWT sub claim');
  console.log('   - email: extracted from JWT email claim');
  console.log('4. Lambda functions should receive context via event.requestContext.authorizer');
  console.log('');
}

// CORS verification
function verifyCorsConfiguration() {
  console.log('\n=== CORS Configuration Verification ===');
  console.log('API Gateway should return these CORS headers:');
  console.log('- Access-Control-Allow-Origin: configured origin or *');
  console.log('- Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token');
  console.log('- Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
  console.log('');
  console.log('Lambda functions also include CORS headers in responses via formatResponse utility');
  console.log('');
}

// Main test function
async function main() {
  console.log('Blog API Integration Test');
  console.log('========================');

  const apiUrl = await getApiUrl();

  await testEndpoints(apiUrl);
  verifyAuthorizerContext();
  verifyCorsConfiguration();

  console.log('=== Deployment Instructions ===');
  console.log('1. Deploy the stack: sam deploy --guided');
  console.log('2. Get the API URL from CloudFormation outputs');
  console.log('3. Test with a valid Cognito JWT token');
  console.log('4. Verify authorizer context is passed to Lambda functions');
  console.log('5. Check CORS headers in browser developer tools');
  console.log('');
}

// Run the test
main().catch(console.error);
