const db = require('./db');

// Get seller dashboard summary (counts and stats)
const getDashboardSummary = async (req, res) => {
  try {
    const sellerId = req.session.user.id;
    
    // Get total products count
    const productsCountResult = await db.query(
      'SELECT COUNT(*) FROM products WHERE seller_id = $1',
      [sellerId]
    );
    const productsCount = parseInt(productsCountResult.rows[0].count);
    
    // Get products with low stock (less than 10 items)
    const lowStockResult = await db.query(
      'SELECT COUNT(*) FROM products WHERE seller_id = $1 AND stock < 10 AND stock > 0',
      [sellerId]
    );
    const lowStockCount = parseInt(lowStockResult.rows[0].count);
    
    // Get out of stock products
    const outOfStockResult = await db.query(
      'SELECT COUNT(*) FROM products WHERE seller_id = $1 AND stock = 0',
      [sellerId]
    );
    const outOfStockCount = parseInt(outOfStockResult.rows[0].count);
    
    // Get total orders (through product association)
    const ordersResult = await db.query(
      `SELECT COUNT(DISTINCT o.id) 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       JOIN products p ON oi.product_id = p.id 
       WHERE p.seller_id = $1`,
      [sellerId]
    );
    const ordersCount = parseInt(ordersResult.rows[0].count);
    
    // Get recent orders
    const recentOrdersResult = await db.query(
      `SELECT o.id, o.created_at, o.status, o.total_amount, 
              u.first_name, u.last_name, u.email
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       JOIN products p ON oi.product_id = p.id 
       JOIN users u ON o.user_id = u.id
       WHERE p.seller_id = $1
       GROUP BY o.id, u.first_name, u.last_name, u.email
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [sellerId]
    );
    
    // Get total revenue
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE p.seller_id = $1`,
      [sellerId]
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);
    
    // Get products by category
    const productsByCategoryResult = await db.query(
      `SELECT c.name, COUNT(p.id) as count
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.seller_id = $1
       GROUP BY c.name
       ORDER BY count DESC`,
      [sellerId]
    );
    
    // Get top selling products
    const topProductsResult = await db.query(
      `SELECT p.id, p.name, p.price, p.image_url,
              SUM(oi.quantity) as total_sold,
              SUM(oi.price * oi.quantity) as total_revenue
       FROM products p
       JOIN order_items oi ON p.id = oi.product_id
       WHERE p.seller_id = $1
       GROUP BY p.id, p.name, p.price, p.image_url
       ORDER BY total_sold DESC
       LIMIT 5`,
      [sellerId]
    );
    
    return res.json({
      success: true,
      summary: {
        productsCount,
        lowStockCount,
        outOfStockCount,
        ordersCount,
        totalRevenue,
        recentOrders: recentOrdersResult.rows,
        productsByCategory: productsByCategoryResult.rows,
        topProducts: topProductsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
};

// Get seller orders
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get orders for seller's products
    const ordersResult = await db.query(
      `SELECT DISTINCT o.id, o.created_at, o.status, o.total_amount, 
              u.first_name, u.last_name, u.email
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       JOIN products p ON oi.product_id = p.id 
       JOIN users u ON o.user_id = u.id
       WHERE p.seller_id = $1
       GROUP BY o.id, u.first_name, u.last_name, u.email
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    );
    
    // Get total count for pagination
    const totalResult = await db.query(
      `SELECT COUNT(DISTINCT o.id) 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       JOIN products p ON oi.product_id = p.id 
       WHERE p.seller_id = $1`,
      [sellerId]
    );
    const totalOrders = parseInt(totalResult.rows[0].count);
    
    return res.json({
      success: true,
      orders: ordersResult.rows,
      pagination: {
        total: totalOrders,
        page,
        limit,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get revenue analytics by time period
const getRevenueAnalytics = async (req, res) => {
  try {
    const sellerId = req.session.user.id;
    const period = req.query.period || 'weekly'; // daily, weekly, monthly
    
    let intervalQuery = '';
    let groupByFormat = '';
    
    if (period === 'daily') {
      intervalQuery = 'AND o.created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      groupByFormat = 'YYYY-MM-DD';
    } else if (period === 'weekly') {
      intervalQuery = 'AND o.created_at >= CURRENT_DATE - INTERVAL \'12 weeks\'';
      groupByFormat = 'YYYY-WW';
    } else if (period === 'monthly') {
      intervalQuery = 'AND o.created_at >= CURRENT_DATE - INTERVAL \'12 months\'';
      groupByFormat = 'YYYY-MM';
    }
    
    const query = `
      SELECT 
        TO_CHAR(o.created_at, '${groupByFormat}') as time_period,
        COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.seller_id = $1 ${intervalQuery}
      GROUP BY time_period
      ORDER BY time_period
    `;
    
    const result = await db.query(query, [sellerId]);
    
    return res.json({
      success: true,
      analytics: {
        period,
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics',
      error: error.message
    });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const sellerId = req.session.user.id;
    
    // Get order details
    const orderResult = await db.query(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get order items for seller's products only
    const orderItemsResult = await db.query(
      `SELECT oi.*, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1 AND p.seller_id = $2`,
      [orderId, sellerId]
    );
    
    // If no items belong to this seller, don't show the order
    if (orderItemsResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No items in this order belong to you'
      });
    }
    
    return res.json({
      success: true,
      order: orderResult.rows[0],
      items: orderItemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardSummary,
  getSellerOrders,
  getRevenueAnalytics,
  getOrderDetails
}; 