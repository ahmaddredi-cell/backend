/**
 * Database Seeding Utility
 * This script initializes the database with essential data for the system to function.
 * It creates an admin user, governorates, and basic settings.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const { User, Governorate, Setting } = require('../models');

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Governorate seed data
const governorates = [
  {
    name: 'رام الله والبيرة',
    code: 'RAB',
    regions: ['رام الله', 'البيرة', 'بيتونيا', 'دير دبوان', 'سلواد'],
    contactInfo: {
      address: 'شارع الإرسال، رام الله',
      phone: '02-2956478',
      email: 'ramallah@gov.ps'
    }
  },
  {
    name: 'نابلس',
    code: 'NAB',
    regions: ['نابلس', 'بيتا', 'حوارة', 'سبسطية', 'بيت فوريك', 'عصيرة الشمالية'],
    contactInfo: {
      address: 'وسط المدينة، نابلس',
      phone: '09-2376541',
      email: 'nablus@gov.ps'
    }
  },
  {
    name: 'الخليل',
    code: 'HEB',
    regions: ['الخليل', 'حلحول', 'دورا', 'يطا', 'سعير', 'بني نعيم'],
    contactInfo: {
      address: 'وسط المدينة، الخليل',
      phone: '02-2254789',
      email: 'hebron@gov.ps'
    }
  },
  {
    name: 'بيت لحم',
    code: 'BET',
    regions: ['بيت لحم', 'بيت جالا', 'بيت ساحور', 'الخضر', 'الدوحة'],
    contactInfo: {
      address: 'شارع المهد، بيت لحم',
      phone: '02-2746589',
      email: 'bethlehem@gov.ps'
    }
  },
  {
    name: 'جنين',
    code: 'JEN',
    regions: ['جنين', 'قباطية', 'يعبد', 'عرابة', 'ميثلون'],
    contactInfo: {
      address: 'وسط المدينة، جنين',
      phone: '04-2436987',
      email: 'jenin@gov.ps'
    }
  },
  {
    name: 'طولكرم',
    code: 'TUL',
    regions: ['طولكرم', 'عنبتا', 'بلعا', 'دير الغصون', 'قفين'],
    contactInfo: {
      address: 'وسط المدينة، طولكرم',
      phone: '09-2674851',
      email: 'tulkarm@gov.ps'
    }
  },
  {
    name: 'قلقيلية',
    code: 'QAL',
    regions: ['قلقيلية', 'حبلة', 'كفر ثلث', 'عزون', 'جيوس'],
    contactInfo: {
      address: 'وسط المدينة، قلقيلية',
      phone: '09-2945612',
      email: 'qalqilya@gov.ps'
    }
  },
  {
    name: 'سلفيت',
    code: 'SAL',
    regions: ['سلفيت', 'بديا', 'مردا', 'كفر الديك', 'دير بلوط'],
    contactInfo: {
      address: 'وسط المدينة، سلفيت',
      phone: '09-2519467',
      email: 'salfit@gov.ps'
    }
  },
  {
    name: 'أريحا والأغوار',
    code: 'JER',
    regions: ['أريحا', 'العوجا', 'الجفتلك', 'مرج نعجة', 'فصايل'],
    contactInfo: {
      address: 'شارع القدس، أريحا',
      phone: '02-2325698',
      email: 'jericho@gov.ps'
    }
  },
  {
    name: 'طوباس',
    code: 'TUB',
    regions: ['طوباس', 'تياسير', 'عقابا', 'وادي الفارعة', 'العقبة'],
    contactInfo: {
      address: 'وسط المدينة، طوباس',
      phone: '09-2573256',
      email: 'tubas@gov.ps'
    }
  },
  {
    name: 'القدس',
    code: 'JER',
    regions: ['القدس الشرقية', 'العيزرية', 'أبو ديس', 'الرام', 'بير نبالا', 'بدو', 'قطنة'],
    contactInfo: {
      address: 'الرام، القدس',
      phone: '02-2347896',
      email: 'jerusalem@gov.ps'
    }
  }
];

// System settings seed data
const settings = [
  {
    key: 'system_name',
    value: 'نظام إدارة التقارير الأمنية الشاملة',
    description: 'اسم النظام كما يظهر في العنوان والتقارير',
    category: 'general',
    isSystem: true
  },
  {
    key: 'logo_path',
    value: '/assets/logo.png',
    description: 'مسار شعار النظام',
    category: 'general',
    isSystem: true
  },
  {
    key: 'report_header',
    value: 'دولة فلسطين\nالجهاز المركزي للأمن',
    description: 'ترويسة التقارير',
    category: 'reports',
    isSystem: true
  },
  {
    key: 'report_footer',
    value: 'سري - للاستخدام الرسمي فقط',
    description: 'تذييل التقارير',
    category: 'reports',
    isSystem: true
  },
  {
    key: 'pagination_limit',
    value: 20,
    description: 'عدد العناصر في الصفحة الواحدة',
    category: 'general',
    isSystem: true
  },
  {
    key: 'report_approval_required',
    value: true,
    description: 'هل يتطلب نشر التقارير موافقة المشرف',
    category: 'workflow',
    isSystem: true
  }
];

/**
 * Seed admin user
 */
async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('✓ Admin user already exists, skipping creation');
      return;
    }
    
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);
    
    const adminUser = await User.create({
      username: 'admin',
      password: hashedPassword,
      fullName: 'مدير النظام',
      email: 'admin@example.com',
      role: 'admin',
      permissions: [
        { module: 'reports', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'events', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'coordinations', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'memos', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'meetings', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'users', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'settings', actions: ['read', 'update'] }
      ],
      isActive: true
    });
    
    console.log('✓ Admin user created successfully');
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    throw error;
  }
}

/**
 * Seed governorates
 */
async function seedGovernorates() {
  try {
    // Check if governorates already exist
    const count = await Governorate.countDocuments();
    
    if (count > 0) {
      console.log(`✓ ${count} governorates already exist, skipping creation`);
      return;
    }
    
    // Create governorates
    const created = await Governorate.insertMany(governorates);
    
    console.log(`✓ ${created.length} governorates created successfully`);
    return created;
  } catch (error) {
    console.error('Error creating governorates:', error.message);
    throw error;
  }
}

/**
 * Seed settings
 */
async function seedSettings() {
  try {
    // Check if settings already exist
    const count = await Setting.countDocuments();
    
    if (count > 0) {
      console.log(`✓ ${count} settings already exist, skipping creation`);
      return;
    }
    
    // Create settings
    const created = await Setting.insertMany(settings);
    
    console.log(`✓ ${created.length} settings created successfully`);
    return created;
  } catch (error) {
    console.error('Error creating settings:', error.message);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seedDatabase() {
  try {
    // Log environment variables for debugging
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/security_reports', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Seed data in sequence
    console.log('\nSeeding database...');
    await seedAdminUser();
    await seedGovernorates();
    await seedSettings();
    
    console.log('\nDatabase seeding completed successfully!');
    console.log('\nAdmin user credentials:');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('\nPlease change the default password after first login.');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
