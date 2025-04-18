/**
 * Report Seeding Utility
 * This script adds sample reports to the database for testing
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { DailyReport, Governorate, User } = require('../models');

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Seed sample reports
 */
async function seedReports() {
  try {
    // Check if reports already exist
    const count = await DailyReport.countDocuments();
    
    if (count > 0) {
      console.log(`✓ ${count} reports already exist, skipping creation`);
      return;
    }
    
    // Get admin user
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.error('Admin user not found. Please run seed.js first.');
      process.exit(1);
    }
    
    // Get governorates for reference
    const governorates = await Governorate.find({});
    if (governorates.length === 0) {
      console.error('No governorates found. Please run seed.js first.');
      process.exit(1);
    }
    
    // Create sample reports
    const reportData = [
      {
        reportNumber: 'REP-20250504-M-001',
        reportDate: new Date('2025-05-04'),
        reportType: 'morning',
        status: 'complete',
        summary: 'تقرير يومي صباحي عن الحالة الأمنية في المحافظات',
        governorates: governorates.slice(0, 3).map(g => g._id),
        createdBy: admin._id
      },
      {
        reportNumber: 'REP-20250503-M-001',
        reportDate: new Date('2025-05-03'),
        reportType: 'morning',
        status: 'complete',
        summary: 'تقرير يومي صباحي عن الحالة الأمنية في المحافظات',
        governorates: governorates.slice(0, 3).map(g => g._id),
        createdBy: admin._id
      },
      {
        reportNumber: 'REP-20250417-M-001',
        reportDate: new Date('2025-04-17'),
        reportType: 'morning',
        status: 'complete',
        summary: 'تقرير يومي صباحي عن الحالة الأمنية في المحافظات',
        governorates: governorates.slice(0, 3).map(g => g._id),
        createdBy: admin._id
      },
      {
        reportNumber: 'REP-20250402-E-001',
        reportDate: new Date('2025-04-02'),
        reportType: 'evening',
        status: 'complete',
        summary: 'تقرير يومي مسائي عن الحالة الأمنية في المحافظات',
        governorates: governorates.slice(3, 6).map(g => g._id),
        createdBy: admin._id
      },
      {
        reportNumber: 'REP-20250401-E-001',
        reportDate: new Date('2025-04-01'),
        reportType: 'evening',
        status: 'complete',
        summary: 'تقرير يومي مسائي عن الحالة الأمنية في المحافظات',
        governorates: governorates.slice(3, 6).map(g => g._id),
        createdBy: admin._id
      },
      {
        reportNumber: 'REP-20250401-M-001',
        reportDate: new Date('2025-04-01'),
        reportType: 'morning',
        status: 'complete',
        summary: 'تقرير يومي صباحي عن الحالة الأمنية في المحافظات',
        governorates: governorates.slice(0, 3).map(g => g._id),
        createdBy: admin._id
      },
    ];
    
    // Insert reports
    const reports = await DailyReport.insertMany(reportData);
    
    console.log(`✓ ${reports.length} sample reports created successfully`);
    return reports;
  } catch (error) {
    console.error('Error creating sample reports:', error.message);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seedDatabaseReports() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/security_reports', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Seed reports
    console.log('\nSeeding sample reports...');
    const reports = await seedReports();
    
    if (reports) {
      console.log('\nReport seeding completed successfully!');
      console.log('Sample reports:');
      reports.forEach(report => {
        console.log(`- ${report.reportNumber} (${report.reportType}, ${report.status})`);
      });
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding reports:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabaseReports();
