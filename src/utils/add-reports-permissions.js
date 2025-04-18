/**
 * Utility to add 'read' permission for reports module to all users
 * This script updates all users to ensure they have access to reports data
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { User } = require('../models');

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Add reports read permission to all users
 */
async function addReportsPermission() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/security_reports', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} user(s)`);
    
    let updatedCount = 0;
    
    // Update each user to have reports read permission
    for (const user of users) {
      // Check if user already has the permission
      const hasReportsModule = user.permissions.some(p => p.module === 'reports');
      
      if (hasReportsModule) {
        // Check if user already has read permission for reports
        const reportPermission = user.permissions.find(p => p.module === 'reports');
        
        if (!reportPermission.actions.includes('read')) {
          // Add read permission
          reportPermission.actions.push('read');
          await user.save();
          updatedCount++;
          console.log(`Added 'read' permission for 'reports' module to user: ${user.username}`);
        } else {
          console.log(`User ${user.username} already has 'read' permission for 'reports' module`);
        }
      } else {
        // Add reports module with read permission
        user.permissions.push({
          module: 'reports',
          actions: ['read']
        });
        await user.save();
        updatedCount++;
        console.log(`Added 'reports' module with 'read' permission to user: ${user.username}`);
      }
    }
    
    console.log(`\nPermission update complete. Updated ${updatedCount} user(s).`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating permissions:', error);
    process.exit(1);
  }
}

// Run the function
addReportsPermission();
