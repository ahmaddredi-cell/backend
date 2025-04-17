const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const winston = require('winston');
const { connectDB, logger } = require('./config/database');
const { notFound, errorHandler } = require('./api/middlewares/error.middleware');

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(`/${process.env.UPLOADS_FOLDER}`, express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', require('./api/routes/auth.routes'));
app.use('/api/governorates', require('./api/routes/governorates.routes'));
app.use('/api/users', require('./api/routes/users.routes'));
app.use('/api/reports', require('./api/routes/reports.routes'));
app.use('/api/events', require('./api/routes/events.routes'));
app.use('/api/test', require('./api/routes/test.routes')); // Test endpoints for debugging
app.use('/api/coordinations', require('./api/routes/coordinations.routes'));
app.use('/api/memos', require('./api/routes/memos.routes'));
// app.use('/api/meetings', require('./api/routes/meetings.routes'));
// app.use('/api/statistics', require('./api/routes/statistics.routes'));

// Base route
app.get('/', (req, res) => {
  res.send('Security Reports Management System API');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`Error starting server: ${err.message}`);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});
