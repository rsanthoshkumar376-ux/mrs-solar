import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mrs_solari_secret_key_13579';

// Login route for both Customers and Owners/Admins
router.post('/login', async (req, res) => {
  const { usernameOrCustomerId, password } = req.body;

  if (!usernameOrCustomerId || !password) {
    return res.status(400).json({ message: 'Username/Customer ID and password are required' });
  }

  try {
    // Check if user exists by username (for admins) or customerId (for customers)
    let user = await db.findOne('users', { username: usernameOrCustomerId });
    if (!user) {
      user = await db.findOne('users', { customerId: usernameOrCustomerId });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role, customerId: user.customerId || null, username: user.username },
      JWT_SECRET,
      { expiresIn: '2h' } // Token expires in 2 hours
    );

    // If customer, fetch their details to send along
    let customerDetails = null;
    if (user.role === 'customer' && user.customerId) {
      customerDetails = await db.findOne('customers', { customerId: user.customerId });
    }

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        customerId: user.customerId || null,
        fullName: customerDetails ? customerDetails.fullName : (user.role === 'admin' ? 'Owner / Admin' : '')
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Profile route
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.findOne('users', { _id: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Omit password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

export default router;
