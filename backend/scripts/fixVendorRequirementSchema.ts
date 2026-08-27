import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixSchema = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ MONGO_URI is not defined');
            process.exit(1);
        }

        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Drop the VendorRequirement collection
        console.log('🗑️  Dropping VendorRequirement collection...');
        try {
            if (mongoose.connection.db) {
                await mongoose.connection.db.dropCollection('vendorrequirements');
                console.log('✅ Collection dropped successfully');
            } else {
                console.error('❌ Database connection not available');
                process.exit(1);
            }
        } catch (error: any) {
            if (error.message && error.message.includes('ns not found')) {
                console.log('ℹ️  Collection does not exist, nothing to drop');
            } else {
                throw error;
            }
        }

        console.log('✅ Schema fix complete!');
        console.log('📝 You can now restart your backend server');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

fixSchema();

