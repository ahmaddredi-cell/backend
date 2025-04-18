/**
 * Upload Middleware
 * 
 * Handles file uploads using multer
 * Includes detailed logging and error handling
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Get uploads folder from environment or use default
const UPLOADS_FOLDER = process.env.UPLOADS_FOLDER || 'uploads';

// Create a more robust upload destination
const createUploadDestination = () => {
  // Use absolute path for uploads directory
  const uploadPath = path.resolve(process.cwd(), UPLOADS_FOLDER);
  
  console.log(`Upload directory path: ${uploadPath}`);
  
  // Ensure directory exists
  if (!fs.existsSync(uploadPath)) {
    try {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Created upload directory: ${uploadPath}`);
    } catch (error) {
      console.error(`Failed to create upload directory: ${error.message}`);
      throw new Error(`Could not create upload directory: ${error.message}`);
    }
  }
  
  // Verify directory permissions
  try {
    fs.accessSync(uploadPath, fs.constants.W_OK);
    console.log(`Upload directory is writable: ${uploadPath}`);
  } catch (error) {
    console.error(`Upload directory is not writable: ${error.message}`);
    throw new Error(`Upload directory is not writable: ${error.message}`);
  }
  
  return uploadPath;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dest = createUploadDestination();
      console.log(`File will be stored in: ${dest}`);
      cb(null, dest);
    } catch (error) {
      console.error(`Error setting upload destination: ${error.message}`);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Create secure, unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      
      // Get original filename parts and sanitize
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const ext = path.extname(originalName) || '.unknown';
      const baseName = path.basename(originalName, ext).substring(0, 20); // Limit base name length
      
      // Build new filename: fieldname-basename-timestamp-random.ext
      const newFilename = `${file.fieldname}-${baseName}-${timestamp}-${randomString}${ext}`;
      
      console.log(`Generated file name: ${newFilename} for original: ${file.originalname}`);
      cb(null, newFilename);
    } catch (error) {
      console.error(`Error generating filename: ${error.message}`);
      cb(error);
    }
  }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  console.log(`Validating file: ${file.originalname}, mimetype: ${file.mimetype}`);
  
  // Accept common document formats and images
  const allowedFileTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
    // Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed',
    // Allow all if we're in development mode
    ...(process.env.NODE_ENV === 'development' ? ['*/*'] : [])
  ];
  
  // In development mode, accept all files
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: accepting all file types');
    return cb(null, true);
  }
  
  if (allowedFileTypes.includes(file.mimetype)) {
    console.log(`File type ${file.mimetype} is allowed`);
    cb(null, true);
  } else {
    console.log(`File type ${file.mimetype} is not allowed`);
    cb(new Error(`نوع الملف ${file.mimetype} غير مسموح به. يرجى تحميل الملفات المسموح بها فقط.`), false);
  }
};

// Multer upload instance with enhanced logging
const createUploader = (options = {}) => {
  console.log('Creating multer uploader with options:', options);
  
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: options.maxSize || 10 * 1024 * 1024, // Default 10MB limit
    }
  });
};

// Standard upload middleware
const upload = createUploader();

// File field upload (wrapper for better error handling and logging)
const uploadFile = (fieldName) => {
  console.log(`Setting up file upload for field: ${fieldName}`);
  
  return (req, res, next) => {
    console.log(`Processing upload request for ${fieldName}`);
    console.log(`Request headers:`, req.headers);
    
    // Create single file upload handler for specified field
    const fileUpload = upload.single(fieldName);
    
    // Handle the upload with detailed logging
    fileUpload(req, res, (err) => {
      if (err) {
        console.error(`Upload error for ${fieldName}:`, err);
        return next(err);
      }
      
      // Log success or failure
      if (req.file) {
        console.log(`Successfully uploaded file:`, {
          field: fieldName,
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        });
      } else {
        console.warn(`No file received for field: ${fieldName}`);
        console.log(`Request body:`, req.body);
      }
      
      next();
    });
  };
};

// Error handler for multer errors
const handleUploadErrors = (err, req, res, next) => {
  console.error('Upload error middleware caught:', err);
  
  if (err instanceof multer.MulterError) {
    console.error(`Multer error: ${err.code}`, err);
    
    // Handle specific Multer errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: `حقل الملف غير متوقع: ${err.field}`
        });
      default:
        return res.status(400).json({
          success: false,
          message: `خطأ في تحميل الملف: ${err.message}`,
          code: err.code
        });
    }
  }
  
  if (err) {
    console.error('Non-Multer upload error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'حدث خطأ أثناء تحميل الملف'
    });
  }
  
  next();
};

// Initialize uploads folder on module load
try {
  createUploadDestination();
  console.log('Upload middleware initialized successfully');
} catch (error) {
  console.error('Failed to initialize upload middleware:', error);
}

module.exports = {
  upload,
  uploadFile,
  handleUploadErrors
};
