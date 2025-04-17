const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const db = require('./db');
const authController = require('./authController');
const productController = require('./productController');
const dashboardController = require('./dashboardController');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
db.initDb();

// Configure file uploads with multer
const uploadDir = path.join(__dirname, '../public/uploads');
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'grocery-website-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 3600000, // 1 hour
    httpOnly: true
  }
}));

// Serve static files
// Route to use the CSS from root level css folder
app.use('/css', express.static(path.join(__dirname, '../css')));
// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));
// Serve other static files from root
app.use(express.static(path.join(__dirname, '..')));

// Routes
// Authentication routes
app.post('/register', authController.register);
app.post('/login', authController.login);
app.get('/logout', authController.logout);

// Test route to check database connection
app.get('/db-test', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// User profile route (protected)
app.get('/profile', authController.isAuthenticated, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
        first_name: req.session.user.first_name,
        last_name: req.session.user.last_name,
        role: req.session.user.role
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: error.message
    });
  }
});

// Seller Product Routes
app.get('/api/seller/products', authController.isSeller, productController.getSellerProducts);
app.get('/api/seller/products/:id', authController.isSeller, productController.getProductById);
app.post('/api/seller/products', authController.isSeller, upload.single('product_image'), productController.createProduct);
app.put('/api/seller/products/:id', authController.isSeller, upload.single('product_image'), productController.updateProduct);
app.delete('/api/seller/products/:id', authController.isSeller, productController.deleteProduct);

// Category Routes
app.get('/api/categories', productController.getCategories);
app.post('/api/seller/categories', authController.isSeller, productController.createCategory);

// Seller Dashboard Routes
app.get('/api/seller/dashboard', authController.isSeller, dashboardController.getDashboardSummary);
app.get('/api/seller/orders', authController.isSeller, dashboardController.getSellerOrders);
app.get('/api/seller/analytics/revenue', authController.isSeller, dashboardController.getRevenueAnalytics);
app.get('/api/seller/orders/:id', authController.isSeller, dashboardController.getOrderDetails);

// Customer-facing Product Routes
app.get('/api/products/featured', async (req, res) => {
  try {
    // Get featured products
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.featured = true AND p.status = 'active' AND p.stock > 0
       ORDER BY p.created_at DESC
       LIMIT 12`
    );
    
    return res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching featured products',
      error: error.message
    });
  }
});

// Add endpoint for fetching all active products
app.get('/api/products/all', async (req, res) => {
  try {
    // Get all active products
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.status = 'active' AND p.stock > 0
       ORDER BY p.created_at DESC
       LIMIT 24`
    );
    
    return res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error fetching all products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching all products',
      error: error.message
    });
  }
});

// Add endpoint for fetching products by category ID
app.get('/api/products/category/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }
    
    // Get products by category ID
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.category_id = $1 AND p.status = 'active' AND p.stock > 0
       ORDER BY p.created_at DESC
       LIMIT 12`,
      [categoryId]
    );
    
    return res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products by category',
      error: error.message
    });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, limit = 12, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, c.name as category_name, u.first_name as seller_first_name, u.last_name as seller_last_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'active'
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Add category filter if provided
    if (category) {
      query += ` AND c.name = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }
    
    // Add search filter if provided
    if (search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add sorting and pagination
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Execute query
    const result = await db.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `;
    
    if (category) {
      countQuery += ` AND c.name = $1`;
    }
    
    if (search) {
      countQuery += category 
        ? ` AND (p.name ILIKE $2 OR p.description ILIKE $2)`
        : ` AND (p.name ILIKE $1 OR p.description ILIKE $1)`;
    }
    
    const countParams = [];
    if (category) countParams.push(category);
    if (search) countParams.push(`%${search}%`);
    
    const countResult = await db.query(countQuery, countParams);
    const totalProducts = parseInt(countResult.rows[0].count);
    
    return res.json({
      success: true,
      products: result.rows,
      pagination: {
        total: totalProducts,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalProducts / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get product details
    const result = await db.query(
      `SELECT p.*, c.name as category_name, u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.id = $1 AND p.status = 'active'`,
      [productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get related products (same category)
    const relatedResult = await db.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = $1 AND p.id != $2 AND p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT 4`,
      [result.rows[0].category_id, productId]
    );
    
    return res.json({
      success: true,
      product: result.rows[0],
      relatedProducts: relatedResult.rows
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
});

// Protected routes
app.get('/seller/*', authController.isSeller, (req, res, next) => {
  next();
});

// Add this with the other authentication routes
app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.user) {
    // User is authenticated, return user info
    return res.json({
      isAuthenticated: true,
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
        first_name: req.session.user.first_name,
        last_name: req.session.user.last_name,
        role: req.session.user.role
      }
    });
  } else {
    // User is not authenticated
    return res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 