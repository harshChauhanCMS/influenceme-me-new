import dotenv = require('dotenv');
import connectDB from '../config/db';
import User from '../models/user';
import Service from '../models/service';
import * as bcrypt from 'bcrypt';

dotenv.config();

const vendors = [
    {
        name: 'Professional Photography Studio',
        phone: '+919876543210',
        email: 'photo@studio.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '123 MG Road',
            state: 'Maharashtra',
            country: 'India',
            pinCode: '400001',
        },
        vendorInfo: {
            vendorSince: '2018-01-15',
            vendorType: 'Photography',
            businessName: 'Pro Photo Studio',
            description: 'Professional photography services for events, products, and portraits',
            experience: 6,
            servicesOffered: [],
            serviceAreas: ['Mumbai', 'Pune', 'Nagpur'],
            availability: 'full-time',
            rating: 4.8,
            totalReviews: 145,
            completedProjects: 200,
            portfolio: [],
            certifications: ['Professional Photography Certification', 'Adobe Certified'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Elite Event Planners',
        phone: '+919876543211',
        email: 'events@elite.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '456 Brigade Road',
            state: 'Karnataka',
            country: 'India',
            pinCode: '560001',
        },
        vendorInfo: {
            vendorSince: '2015-03-20',
            vendorType: 'Event Planning',
            businessName: 'Elite Events Pvt Ltd',
            description: 'Full-service event planning for corporate and social events',
            experience: 9,
            servicesOffered: [],
            serviceAreas: ['Bangalore', 'Mysore', 'Chennai'],
            availability: 'full-time',
            rating: 4.9,
            totalReviews: 230,
            completedProjects: 350,
            portfolio: [],
            certifications: ['Certified Event Planner', 'ISO 9001 Certified'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Creative Videography Services',
        phone: '+919876543212',
        email: 'video@creative.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '789 Connaught Place',
            state: 'Delhi',
            country: 'India',
            pinCode: '110001',
        },
        vendorInfo: {
            vendorSince: '2019-06-10',
            vendorType: 'Videography',
            businessName: 'Creative Video Productions',
            description: 'Cinematic videography for weddings, events, and brand campaigns',
            experience: 5,
            servicesOffered: [],
            serviceAreas: ['Delhi', 'Noida', 'Gurgaon'],
            availability: 'full-time',
            rating: 4.7,
            totalReviews: 98,
            completedProjects: 150,
            portfolio: [],
            certifications: ['Professional Videographer', 'Drone Pilot License'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Glam Makeup & Hair Studio',
        phone: '+919876543213',
        email: 'glam@studio.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '321 Park Street',
            state: 'West Bengal',
            country: 'India',
            pinCode: '700016',
        },
        vendorInfo: {
            vendorSince: '2017-09-05',
            vendorType: 'Makeup & Hair',
            businessName: 'Glam Beauty Studio',
            description: 'Professional makeup and hair styling for all occasions',
            experience: 7,
            servicesOffered: [],
            serviceAreas: ['Kolkata', 'Howrah'],
            availability: 'on-demand',
            rating: 4.9,
            totalReviews: 180,
            completedProjects: 400,
            portfolio: [],
            certifications: ['Certified Makeup Artist', 'Hair Stylist Pro'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Royal Catering Services',
        phone: '+919876543214',
        email: 'royal@catering.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '555 Anna Salai',
            state: 'Tamil Nadu',
            country: 'India',
            pinCode: '600002',
        },
        vendorInfo: {
            vendorSince: '2014-11-12',
            vendorType: 'Catering',
            businessName: 'Royal Catering Co.',
            description: 'Premium catering services for events, weddings, and corporate functions',
            experience: 10,
            servicesOffered: [],
            serviceAreas: ['Chennai', 'Coimbatore', 'Madurai'],
            availability: 'full-time',
            rating: 4.6,
            totalReviews: 210,
            completedProjects: 500,
            portfolio: [],
            certifications: ['Food Safety Certified', 'FSSAI License'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Decor Dreams',
        phone: '+919876543215',
        email: 'decor@dreams.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '888 Linking Road',
            state: 'Maharashtra',
            country: 'India',
            pinCode: '400050',
        },
        vendorInfo: {
            vendorSince: '2016-04-25',
            vendorType: 'Decoration',
            businessName: 'Decor Dreams Pvt Ltd',
            description: 'Creative decoration services for all types of events',
            experience: 8,
            servicesOffered: [],
            serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai'],
            availability: 'full-time',
            rating: 4.8,
            totalReviews: 165,
            completedProjects: 300,
            portfolio: [],
            certifications: ['Event Decorator Certified'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Premium Sound Systems',
        phone: '+919876543216',
        email: 'sound@premium.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '999 Sector 18',
            state: 'Haryana',
            country: 'India',
            pinCode: '122001',
        },
        vendorInfo: {
            vendorSince: '2018-07-30',
            vendorType: 'Sound & Lighting',
            businessName: 'Premium Audio Solutions',
            description: 'Professional sound and lighting equipment rental and setup',
            experience: 6,
            servicesOffered: [],
            serviceAreas: ['Gurgaon', 'Delhi', 'Faridabad'],
            availability: 'full-time',
            rating: 4.7,
            totalReviews: 120,
            completedProjects: 180,
            portfolio: [],
            certifications: ['Audio Engineer Certified', 'Lighting Technician'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Content Creator Pro',
        phone: '+919876543217',
        email: 'content@pro.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '111 Indiranagar',
            state: 'Karnataka',
            country: 'India',
            pinCode: '560038',
        },
        vendorInfo: {
            vendorSince: '2020-01-20',
            vendorType: 'Content Creation',
            businessName: 'ContentPro Studio',
            description: 'Social media content creation, photography, and video production',
            experience: 4,
            servicesOffered: [],
            serviceAreas: ['Bangalore', 'Hyderabad'],
            availability: 'on-demand',
            rating: 4.9,
            totalReviews: 85,
            completedProjects: 120,
            portfolio: [],
            certifications: ['Social Media Marketing Certified', 'Content Strategy Expert'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Design Studio Graphics',
        phone: '+919876543218',
        email: 'design@studio.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '222 Koramangala',
            state: 'Karnataka',
            country: 'India',
            pinCode: '560095',
        },
        vendorInfo: {
            vendorSince: '2017-02-14',
            vendorType: 'Graphic Design',
            businessName: 'Design Studio Pro',
            description: 'Professional graphic design for branding, marketing, and events',
            experience: 7,
            servicesOffered: [],
            serviceAreas: ['Bangalore', 'Pune', 'Mumbai'],
            availability: 'full-time',
            rating: 4.8,
            totalReviews: 140,
            completedProjects: 250,
            portfolio: [],
            certifications: ['Adobe Certified Expert', 'Graphic Designer Pro'],
            isVerified: true,
        },
        isActive: true,
    },
    {
        name: 'Luxury Transportation Services',
        phone: '+919876543219',
        email: 'luxury@transport.com',
        password: 'vendor123',
        role: 'vendor',
        profilePictureUrl: 'https://via.placeholder.com/150',
        country: 'India',
        addresses: {
            streetAddress: '333 Golf Course Road',
            state: 'Haryana',
            country: 'India',
            pinCode: '122002',
        },
        vendorInfo: {
            vendorSince: '2015-08-18',
            vendorType: 'Transportation',
            businessName: 'Luxury Rides Pvt Ltd',
            description: 'Premium transportation services for events and VIP guests',
            experience: 9,
            servicesOffered: [],
            serviceAreas: ['Gurgaon', 'Delhi', 'Noida'],
            availability: 'full-time',
            rating: 4.7,
            totalReviews: 195,
            completedProjects: 600,
            portfolio: [],
            certifications: ['Commercial Transport License', 'Safety Certified'],
            isVerified: true,
        },
        isActive: true,
    },
];

const services = [
    // Photography Services
    {
        serviceName: 'Event Photography',
        category: 'photography',
        subCategory: 'Events',
        description: 'Professional event photography covering weddings, corporate events, and social gatherings. Includes edited high-resolution photos.',
        price: 15000,
        priceType: 'package',
        currency: 'INR',
        duration: '8 hours',
        features: [
            '8 hours of photography',
            '300+ edited photos',
            'Online gallery',
            '2 photographers',
            'All raw files included',
        ],
        tags: ['wedding', 'event', 'corporate', 'party'],
        location: 'Mumbai',
    },
    {
        serviceName: 'Product Photography',
        category: 'photography',
        subCategory: 'Commercial',
        description: 'Studio product photography for e-commerce, catalogs, and marketing materials',
        price: 500,
        priceType: 'hourly',
        currency: 'INR',
        duration: 'Per product',
        features: [
            'White background',
            'Multiple angles',
            'High resolution',
            'Quick turnaround',
            'Retouching included',
        ],
        tags: ['product', 'ecommerce', 'commercial'],
        location: 'Mumbai',
    },
    // Event Planning Services
    {
        serviceName: 'Corporate Event Planning',
        category: 'event-planning',
        subCategory: 'Corporate',
        description: 'Complete corporate event planning including venue selection, catering, entertainment, and logistics',
        price: 50000,
        priceType: 'package',
        currency: 'INR',
        duration: 'Full event',
        features: [
            'Venue selection and booking',
            'Catering coordination',
            'Entertainment booking',
            'Logistics management',
            'On-site coordination',
        ],
        tags: ['corporate', 'conference', 'seminar', 'team-building'],
        location: 'Bangalore',
    },
    {
        serviceName: 'Wedding Planning',
        category: 'event-planning',
        subCategory: 'Wedding',
        description: 'Full-service wedding planning from engagement to reception',
        price: 100000,
        priceType: 'package',
        currency: 'INR',
        duration: 'Complete wedding',
        features: [
            'Venue selection',
            'Vendor coordination',
            'Decor planning',
            'Timeline management',
            'Day-of coordination',
        ],
        tags: ['wedding', 'marriage', 'ceremony'],
        location: 'Bangalore',
    },
    // Videography Services
    {
        serviceName: 'Cinematic Wedding Video',
        category: 'videography',
        subCategory: 'Wedding',
        description: 'Cinematic wedding videography with drone shots and professional editing',
        price: 25000,
        priceType: 'package',
        currency: 'INR',
        duration: 'Full day',
        features: [
            'Full day coverage',
            'Drone footage',
            'Highlight reel (5-7 mins)',
            'Full ceremony video',
            'Background music',
        ],
        tags: ['wedding', 'cinematic', 'drone'],
        location: 'Delhi',
    },
    {
        serviceName: 'Brand Campaign Video',
        category: 'videography',
        subCategory: 'Commercial',
        description: 'Professional video production for brand campaigns and marketing',
        price: 2000,
        priceType: 'hourly',
        currency: 'INR',
        duration: 'Per hour',
        features: [
            'Concept development',
            'Professional equipment',
            'Video editing',
            'Color grading',
            'Music licensing',
        ],
        tags: ['brand', 'commercial', 'marketing', 'advertising'],
        location: 'Delhi',
    },
    // Makeup Services
    {
        serviceName: 'Bridal Makeup',
        category: 'makeup-artist',
        subCategory: 'Bridal',
        description: 'Complete bridal makeup with trial session',
        price: 8000,
        priceType: 'package',
        currency: 'INR',
        duration: '3-4 hours',
        features: [
            'One trial session',
            'HD makeup',
            'Hair styling',
            'Draping',
            'Touch-up kit',
        ],
        tags: ['bridal', 'wedding', 'makeup'],
        location: 'Kolkata',
    },
    {
        serviceName: 'Party Makeup',
        category: 'makeup-artist',
        subCategory: 'Party',
        description: 'Professional makeup for parties and events',
        price: 3000,
        priceType: 'fixed',
        currency: 'INR',
        duration: '1-2 hours',
        features: [
            'Party makeup',
            'Hair styling',
            'Lashes',
            'Touch-up advice',
        ],
        tags: ['party', 'event', 'makeup'],
        location: 'Kolkata',
    },
    // Catering Services
    {
        serviceName: 'Corporate Catering',
        category: 'catering',
        subCategory: 'Corporate',
        description: 'Professional catering for corporate events and meetings',
        price: 300,
        priceType: 'fixed',
        currency: 'INR',
        duration: 'Per person',
        features: [
            'Multi-cuisine menu',
            'Live counters',
            'Service staff',
            'Setup and cleanup',
            'Customizable menu',
        ],
        tags: ['corporate', 'office', 'meeting'],
        location: 'Chennai',
    },
    {
        serviceName: 'Wedding Catering',
        category: 'catering',
        subCategory: 'Wedding',
        description: 'Premium wedding catering with multi-cuisine options',
        price: 500,
        priceType: 'fixed',
        currency: 'INR',
        duration: 'Per person',
        features: [
            'Multi-cuisine buffet',
            'Live stations',
            'Dessert counter',
            'Service staff',
            'Decor for food area',
        ],
        tags: ['wedding', 'celebration'],
        location: 'Chennai',
    },
    // Content Creation Services
    {
        serviceName: 'Social Media Content Package',
        category: 'content-creation',
        subCategory: 'Social Media',
        description: 'Monthly social media content creation package',
        price: 20000,
        priceType: 'package',
        currency: 'INR',
        duration: '1 month',
        features: [
            '20 posts per month',
            'Photography and videography',
            'Content calendar',
            'Captions and hashtags',
            'Stories and reels',
        ],
        tags: ['social-media', 'instagram', 'content'],
        location: 'Bangalore',
    },
];

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Connect to MongoDB
        await connectDB();

        // Clear existing vendors and services
        console.log('🗑️  Clearing existing vendors...');
        await User.deleteMany({ role: 'vendor', email: { $in: vendors.map(v => v.email) } });
        
        console.log('🗑️  Clearing existing services...');
        await Service.deleteMany({});

        // Hash passwords and create vendors
        console.log('👥 Creating vendors...');
        const createdVendors = [];
        for (const vendorData of vendors) {
            const hashedPassword = await bcrypt.hash(vendorData.password, 10);
            const vendor = await User.create({
                ...vendorData,
                password: hashedPassword,
            });
            createdVendors.push(vendor);
            console.log(`✅ Created vendor: ${vendor.name}`);
        }

        // Create services and assign to vendors
        console.log('📋 Creating services...');
        const servicesByCategory: Record<string, typeof services[0][]> = {
            photography: [],
            videography: [],
            'event-planning': [],
            'makeup-artist': [],
            catering: [],
            'content-creation': [],
        };

        services.forEach(service => {
            if (!servicesByCategory[service.category]) {
                servicesByCategory[service.category] = [];
            }
            servicesByCategory[service.category].push(service);
        });

        for (const vendor of createdVendors) {
            const vendorType = vendor.vendorInfo?.vendorType?.toLowerCase();
            let servicesToCreate: typeof services = [];

            if (vendorType?.includes('photography')) {
                servicesToCreate = servicesByCategory.photography || [];
            } else if (vendorType?.includes('event')) {
                servicesToCreate = servicesByCategory['event-planning'] || [];
            } else if (vendorType?.includes('video')) {
                servicesToCreate = servicesByCategory.videography || [];
            } else if (vendorType?.includes('makeup')) {
                servicesToCreate = servicesByCategory['makeup-artist'] || [];
            } else if (vendorType?.includes('catering')) {
                servicesToCreate = servicesByCategory.catering || [];
            } else if (vendorType?.includes('content')) {
                servicesToCreate = servicesByCategory['content-creation'] || [];
            }

            for (const serviceData of servicesToCreate) {
                await Service.create({
                    ...serviceData,
                    vendorId: vendor._id,
                });
            }

            console.log(`✅ Created ${servicesToCreate.length} services for ${vendor.name}`);
        }

        console.log('\n🎉 Database seeding completed successfully!');
        console.log(`📊 Created ${createdVendors.length} vendors`);
        console.log(`📊 Created ${await Service.countDocuments()} services`);
        console.log('\n📝 Vendor login credentials:');
        console.log('Email: photo@studio.com, Password: vendor123');
        console.log('Email: events@elite.com, Password: vendor123');
        console.log('Email: video@creative.com, Password: vendor123');
        console.log('... (all vendors use password: vendor123)\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();

