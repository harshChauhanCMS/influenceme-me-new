const mongoose = require('mongoose');
const User = require('./models/user').default;

// Test query to see what's actually returned
async function test() {
  const user = await User.findOne({ role: 'brand' }).lean();
  console.log('User businessInfo:', JSON.stringify(user?.businessInfo, null, 2));
  console.log('User has businessInfo:', !!user?.businessInfo);
  console.log('businessName:', user?.businessInfo?.businessName);
}
test();
