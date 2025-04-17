const bcrypt = require('bcrypt');
const db = require('./db');

// Register a new user
const register = async (req, res) => {
  const { first_name, last_name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      return res.redirect('/register.html?error=User+with+this+email+already+exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new user
    const newUser = await db.query(
      'INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
      [first_name, last_name, email, hashedPassword, role]
    );

    // Create session for the user
    req.session.user = {
      id: newUser.rows[0].id,
      email: newUser.rows[0].email,
      first_name: newUser.rows[0].first_name,
      last_name: newUser.rows[0].last_name,
      role: newUser.rows[0].role
    };

    // Redirect based on role
    if (role === 'seller') {
      return res.redirect('/seller-dashboard.html');
    } else {
      return res.redirect('/index.html');
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.redirect('/register.html?error=Server+error+during+registration');
  }
};

// Login an existing user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      // User doesn't exist
      console.log('Login failed: User not found -', email);
      return res.redirect('/login.html?error=Invalid+email+or+password');
    }

    const user = userResult.rows[0];
    
    // Check if password is correct
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log('Login failed: Invalid password for user -', email);
      return res.redirect('/login.html?error=Invalid+email+or+password');
    }

    // Create session for the user
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    };

    console.log('User logged in successfully:', email);
    
    // Redirect based on role
    if (user.role === 'seller') {
      return res.redirect('/seller-dashboard.html');
    } else {
      return res.redirect('/index.html');
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.redirect('/login.html?error=Server+error+during+login');
  }
};

// Logout user
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/index.html?error=Logout+failed');
    }
    console.log('User logged out successfully');
    return res.redirect('/login.html');
  });
};

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login.html?error=Please+login+to+access+this+page');
};

// Check if user is a seller
const isSeller = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'seller') {
    return next();
  }
  if (req.session && req.session.user) {
    return res.redirect('/index.html?error=Access+denied');
  }
  return res.redirect('/login.html?error=Please+login+to+access+this+page');
};

module.exports = {
  register,
  login,
  logout,
  isAuthenticated,
  isSeller
}; 