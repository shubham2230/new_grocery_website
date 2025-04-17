const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "signup1",
  password: "$hub9835@",
  port: 5432
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    done();
  }
});

// Initialize database: create all required tables if they don't exist
const initDb = async () => {
  try {
    // Users table
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Categories table
    const createCategoriesTableQuery = `
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Products table
    const createProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER REFERENCES users(id),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER REFERENCES categories(id),
        image_url VARCHAR(255),
        featured BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Orders table
    const createOrdersTableQuery = `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        shipping_address TEXT,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Order items table
    const createOrderItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create all tables
    await pool.query(createUsersTableQuery);
    await pool.query(createCategoriesTableQuery);
    await pool.query(createProductsTableQuery);
    await pool.query(createOrdersTableQuery);
    await pool.query(createOrderItemsTableQuery);

    // Insert default categories if none exist
    const categoriesCount = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoriesCount.rows[0].count) === 0) {
      const defaultCategories = [
        ['Vegetables', 'Fresh vegetables from local farms'],
        ['Fruits', 'Organic and seasonal fruits'],
        ['Dairy', 'Milk, cheese, and other dairy products'],
        ['Bakery', 'Freshly baked bread and pastries'],
        ['Meat', 'Quality meats and poultry']
      ];

      for (const [name, description] of defaultCategories) {
        await pool.query(
          'INSERT INTO categories (name, description) VALUES ($1, $2)',
          [name, description]
        );
      }
      console.log('Default categories inserted');
    }
    
    // Insert sample products if none exist
    const productsCount = await pool.query('SELECT COUNT(*) FROM products');
    
    if (parseInt(productsCount.rows[0].count) === 0) {
      // First create a sample seller user if none exists
      const sellersCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'seller'");
      
      let sellerId = null;
      
      if (parseInt(sellersCount.rows[0].count) === 0) {
        // Create a sample seller
        const sellerResult = await pool.query(
          `INSERT INTO users (first_name, last_name, email, password, role) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          ['Sample', 'Seller', 'seller@example.com', '$2b$10$xqnWZvPFN4JgxhQi/jK2puLInM.yz50WrZZ9D1QrBbZMJsiJN84.e', 'seller']
        );
        
        sellerId = sellerResult.rows[0].id;
        console.log('Sample seller user created');
      } else {
        // Get an existing seller
        const sellerResult = await pool.query("SELECT id FROM users WHERE role = 'seller' LIMIT 1");
        sellerId = sellerResult.rows[0].id;
      }
      
      // Define sample products
      const sampleProducts = [
        {
          name: 'Fresh Organic Apples',
          description: 'Sweet and juicy organic apples from local farms',
          price: 3.99,
          stock: 50,
          category_id: 2, // Fruits
          featured: true
        },
        {
          name: 'Farm Fresh Eggs',
          description: 'Free-range eggs from grass-fed chickens',
          price: 4.49,
          stock: 30,
          category_id: 3, // Dairy
          featured: true
        },
        {
          name: 'Organic Milk',
          description: 'Pasteurized whole milk from local dairy farms',
          price: 2.99,
          stock: 25,
          category_id: 3, // Dairy
          featured: true
        },
        {
          name: 'Whole Grain Bread',
          description: 'Freshly baked artisanal whole grain bread',
          price: 3.49,
          stock: 20,
          category_id: 4, // Bakery
          featured: true
        },
        {
          name: 'Fresh Tomatoes',
          description: 'Vine-ripened tomatoes, perfect for salads',
          price: 2.99,
          stock: 40,
          category_id: 1, // Vegetables
          featured: true
        },
        {
          name: 'Organic Bananas',
          description: 'Ethically sourced organic bananas',
          price: 1.99,
          stock: 60,
          category_id: 2, // Fruits
          featured: true
        },
        {
          name: 'Premium Ground Beef',
          description: '100% grass-fed ground beef with no additives',
          price: 7.99,
          stock: 15,
          category_id: 5, // Meat
          featured: true
        },
        {
          name: 'Fresh Spinach',
          description: 'Organic leafy greens, rich in iron and vitamins',
          price: 2.49,
          stock: 35,
          category_id: 1, // Vegetables
          featured: true
        }
      ];
      
      // Insert sample products
      for (const product of sampleProducts) {
        await pool.query(
          `INSERT INTO products (seller_id, name, description, price, stock, category_id, featured, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sellerId,
            product.name,
            product.description,
            product.price,
            product.stock,
            product.category_id,
            product.featured,
            'active'
          ]
        );
      }
      
      console.log('Sample products inserted');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDb
}; 