const db = require('./db');
const path = require('path');
const fs = require('fs');

// Get all products for a seller
const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.session.user.id;
    
    // Get seller's products with category info
    const result = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC`,
      [sellerId]
    );
    
    return res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get a single product by ID
const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.session.user.id;
    
    const result = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.seller_id = $2`,
      [productId, sellerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    return res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product details',
      error: error.message
    });
  }
};

// Create a new product
const createProduct = async (req, res) => {
  try {
    const sellerId = req.session.user.id;
    const { name, description, price, stock, category_id, featured } = req.body;
    
    // Validate required fields
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required fields'
      });
    }
    
    // Handle image upload if present
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    
    // Insert product into database
    const result = await db.query(
      `INSERT INTO products (
        seller_id, name, description, price, stock, 
        category_id, image_url, featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [sellerId, name, description, price, stock, category_id, imageUrl, featured || false]
    );
    
    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update an existing product
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.session.user.id;
    const { name, description, price, stock, category_id, featured, status } = req.body;
    
    // Check if product exists and belongs to the seller
    const checkProduct = await db.query(
      'SELECT * FROM products WHERE id = $1 AND seller_id = $2',
      [productId, sellerId]
    );
    
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to edit it'
      });
    }
    
    // Handle image upload if present
    let imageUrl = checkProduct.rows[0].image_url;
    if (req.file) {
      // Delete old image if exists
      if (checkProduct.rows[0].image_url) {
        const oldImagePath = path.join(__dirname, '..', 'public', checkProduct.rows[0].image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imageUrl = `/uploads/${req.file.filename}`;
    }
    
    // Update product in database
    const result = await db.query(
      `UPDATE products SET 
        name = $1, 
        description = $2, 
        price = $3, 
        stock = $4, 
        category_id = $5, 
        image_url = $6, 
        featured = $7,
        status = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND seller_id = $10
       RETURNING *`,
      [
        name, 
        description, 
        price, 
        stock, 
        category_id, 
        imageUrl, 
        featured || false, 
        status || 'active',
        productId, 
        sellerId
      ]
    );
    
    return res.json({
      success: true,
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.session.user.id;
    
    // Check if product exists and belongs to the seller
    const checkProduct = await db.query(
      'SELECT * FROM products WHERE id = $1 AND seller_id = $2',
      [productId, sellerId]
    );
    
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to delete it'
      });
    }
    
    // Delete product image if exists
    if (checkProduct.rows[0].image_url) {
      const imagePath = path.join(__dirname, '..', 'public', checkProduct.rows[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete product from database
    await db.query(
      'DELETE FROM products WHERE id = $1 AND seller_id = $2',
      [productId, sellerId]
    );
    
    return res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name');
    
    return res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Check if category already exists
    const checkCategory = await db.query(
      'SELECT * FROM categories WHERE name = $1',
      [name]
    );
    
    if (checkCategory.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }
    
    // Insert new category
    const result = await db.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

module.exports = {
  getSellerProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory
}; 