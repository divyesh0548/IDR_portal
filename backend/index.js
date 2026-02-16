const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();
const { sendLoginEmail } = require('./scripts/login_email');
const { startIdrEmailJob } = require('./scripts/idr_request_email');

let authRoutes;
try {
  authRoutes = require('./routes/auth');
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.error('Error loading auth routes:', error);
  process.exit(1);
}

let userRoutes;
try {
  userRoutes = require('./routes/users');
  console.log('User routes loaded successfully');
} catch (error) {
  console.error('Error loading user routes:', error);
  process.exit(1);
}

let idrRoutes;
try {
  idrRoutes = require('./routes/idr');
  console.log('IDR routes loaded successfully');
} catch (error) {
  console.error('Error loading IDR routes:', error);
  process.exit(1);
}

let scopeRoutes;
try {
  scopeRoutes = require('./routes/scope');
  console.log('Scope routes loaded successfully');
} catch (error) {
  console.error('Error loading scope routes:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For development, allow localhost and IP-based origins on port 5174
      const isLocalhost = origin.startsWith('http://localhost:') || 
                         origin.startsWith('http://127.0.0.1:');
      const isLocalNetwork = origin.match(/^http:\/\/192\.168\.\d+\.\d+:5174$/);
      
      if (isLocalhost || isLocalNetwork) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/idr', idrRoutes);
app.use('/api/scope', scopeRoutes);


//Background cron jobs
sendLoginEmail();
startIdrEmailJob();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

