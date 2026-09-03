const https = require('https');

async function testLiveEmailAndOtp() {
  console.log('Testing live OTP and Email delivery on https://pragatidesk.onrender.com...\n');

  // Test 1: Send OTP using Gmail ID
  const otpResGmail = await new Promise(resolve => {
    const body = JSON.stringify({ email: 'jitendra.jania@gmail.com' });
    const req = https.request('https://pragatidesk.onrender.com/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.write(body);
    req.end();
  });
  console.log('Test 1: Send OTP using Gmail ID (jitendra.jania@gmail.com):');
  console.log('Status:', otpResGmail.status, 'Response:', otpResGmail.data);

  // Test 2: Send OTP using SSO ID
  const otpResSso = await new Promise(resolve => {
    const body = JSON.stringify({ email: 'DOITC-ADMIN-01' });
    const req = https.request('https://pragatidesk.onrender.com/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.write(body);
    req.end();
  });
  console.log('\nTest 2: Send OTP using SSO ID (DOITC-ADMIN-01):');
  console.log('Status:', otpResSso.status, 'Response:', otpResSso.data);

  // Test 3: Send OTP using Official Email
  const otpResOfficial = await new Promise(resolve => {
    const body = JSON.stringify({ email: 'jitendrajania.doit@rajasthan.gov.in' });
    const req = https.request('https://pragatidesk.onrender.com/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.write(body);
    req.end();
  });
  console.log('\nTest 3: Send OTP using Official Email (jitendrajania.doit@rajasthan.gov.in):');
  console.log('Status:', otpResOfficial.status, 'Response:', otpResOfficial.data);
}

testLiveEmailAndOtp();
