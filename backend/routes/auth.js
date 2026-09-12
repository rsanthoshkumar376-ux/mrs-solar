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
    const input = String(usernameOrCustomerId).trim();
    const cleanInputMobile = input.replace(/^0+/, '').replace(/\s+/g, '');

    // 1. Check if user exists by exact username or customerId
    let user = await db.findOne('users', { username: input });
    if (!user) {
      user = await db.findOne('users', { customerId: input });
    }

    // 2. Case-insensitive username match
    if (!user) {
      const allUsers = await db.find('users');
      user = allUsers.find(u => u.username && u.username.toLowerCase() === input.toLowerCase());
    }

    // 3. Lookup by Customer Name, Customer ID, or Mobile Number in customers collection
    if (!user) {
      const allCustomers = await db.find('customers');
      const matchedCustomer = allCustomers.find(c => {
        const cName = String(c.fullName || '').trim().toLowerCase();
        const cId = String(c.customerId || '').trim().toLowerCase();
        const cMob = String(c.mobileNumber || '').trim().replace(/^0+/, '').replace(/\s+/g, '');

        return cName === input.toLowerCase() ||
               cId === input.toLowerCase() ||
               (cleanInputMobile.length >= 8 && cMob === cleanInputMobile);
      });

      if (matchedCustomer) {
        user = await db.findOne('users', { customerId: matchedCustomer.customerId });
        // If user record is missing in users collection, auto-create it on the fly
        if (!user && matchedCustomer.mobileNumber) {
          const salt = await bcrypt.genSalt(10);
          const defaultPass = String(matchedCustomer.mobileNumber).trim().replace(/^0+/, '');
          const hashedPassword = await bcrypt.hash(defaultPass, salt);
          user = await db.create('users', {
            username: matchedCustomer.fullName ? matchedCustomer.fullName.trim() : matchedCustomer.customerId,
            customerId: matchedCustomer.customerId,
            password: hashedPassword,
            role: 'customer'
          });
          console.log(`[Auth] Auto-created user account for customer ${matchedCustomer.fullName} (${matchedCustomer.customerId})`);
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'No account found with that Name, Customer ID, or Mobile number.' });
    }

    // Verify password: Check bcrypt password hash, or match customer's 10-digit mobile number
    const cleanPassword = String(password).trim();
    let isMatch = false;

    if (user.password) {
      isMatch = await bcrypt.compare(cleanPassword, user.password);
    }

    // If bcrypt compare failed, check if password matches customer mobile number directly
    if (!isMatch && user.role === 'customer' && user.customerId) {
      const cust = await db.findOne('customers', { customerId: user.customerId });
      if (cust && cust.mobileNumber) {
        const cleanCustMobile = String(cust.mobileNumber).trim().replace(/^0+/, '').replace(/\s+/g, '');
        const cleanPass = cleanPassword.replace(/^0+/, '').replace(/\s+/g, '');
        if (cleanPass === cleanCustMobile) {
          isMatch = true;
          // Re-sync and save valid bcrypt hash
          const salt = await bcrypt.genSalt(10);
          const newHash = await bcrypt.hash(cleanCustMobile, salt);
          await db.updateOne('users', { _id: user._id }, { password: newHash });
          console.log(`[Auth] Password verified & re-hashed for customer ${user.username} (${user.customerId})`);
        }
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. (For customers, your default password is your 10-digit mobile number)' });
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
