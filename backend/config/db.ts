import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is not defined in the environment variables.');
      process.exit(1);
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log(`📍 Database: ${mongoUri.split('@')[1]?.split('/')[1]?.split('?')[0] || 'unknown'}`);

    const conn = await mongoose.connect(mongoUri, { 
      autoIndex: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Check if MongoDB Atlas cluster is running');
    console.error('   2. Verify your IP address is whitelisted (or use 0.0.0.0/0 for all IPs)');
    console.error('   3. Confirm username and password are correct');
    console.error('   4. Ensure network access is allowed');
    process.exit(1);
  }
};

export default connectDB;
