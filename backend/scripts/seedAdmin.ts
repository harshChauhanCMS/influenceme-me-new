import dotenv = require('dotenv');
import connectDB from '../config/db';
import User from '../models/user';
import * as bcrypt from 'bcrypt';

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('🌱 Starting admin seeding...');

    // Connect to MongoDB
    await connectDB();

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin@123';
    const adminName = 'InfluenceMe Admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: adminEmail,
      role: 'admin'
    });

    if (existingAdmin) {
      console.log('📧 Admin already exists with email:', adminEmail);
      console.log('🔄 Updating admin password and details...');
      
      // Update password and other fields
      // Use updateOne to bypass pre-save hooks that might re-hash the password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            name: adminName,
            password: hashedPassword,
            isActive: true,
            status: 'approved'
          }
        }
      );
      
      console.log('✅ Admin password updated successfully!');
      console.log('\n📋 Admin Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    ', adminEmail);
      console.log('Password: ', adminPassword);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('👤 Creating new admin user...');
      
      // Create admin user
      const admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword, // Pre-save hook will hash this once
        role: 'admin',
        status: 'approved',
        isActive: true,
      });
      
      console.log('✅ Admin created successfully!');
      console.log('\n📋 Admin Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    ', adminEmail);
      console.log('Password: ', adminPassword);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Verify admin can be found and test password
    const verifyAdmin = await User.findOne({ 
      email: adminEmail,
      role: 'admin'
    });

    if (verifyAdmin) {
      console.log('✅ Verification successful!');
      console.log('Admin details:', JSON.stringify({
        _id: verifyAdmin._id,
        name: verifyAdmin.name,
        email: verifyAdmin.email,
        role: verifyAdmin.role,
        status: verifyAdmin.status,
        isActive: verifyAdmin.isActive,
        hasPassword: !!verifyAdmin.password
      }, null, 2));
      
      // Test password comparison
      if (verifyAdmin.password) {
        const passwordMatch = await verifyAdmin.comparePassword(adminPassword);
        console.log('🔐 Password verification test:', passwordMatch ? '✅ PASSED' : '❌ FAILED');
        if (!passwordMatch) {
          console.error('⚠️  WARNING: Password comparison failed!');
        }
      } else {
        console.error('❌ ERROR: Admin has no password set!');
      }
    } else {
      console.error('❌ Verification failed - admin not found!');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

