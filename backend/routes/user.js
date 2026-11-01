const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { isAuthenticatedUser } = require('../middlewares/auth');

const profileFields = [
  'id',
  'email',
  'username',
  'firstName',
  'lastName',
  'avatar',
  'role',
  'yearLevel',
  'activeSemester',
  'schoolYear',
  'isVerified',
  'enrolledSubjects',
];

const serializeProfile = (user) => {
  const profile = {
    id: user._id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar || '',
    role: user.role || 'student',
    yearLevel: user.yearLevel,
    activeSemester: user.activeSemester,
    schoolYear: user.schoolYear,
    isVerified: user.isVerified,
    enrolledSubjects: user.enrolledSubjects || [],
  };

  return profileFields.reduce((result, field) => {
    if (profile[field] !== undefined) result[field] = profile[field];
    return result;
  }, {});
};

router.get('/user/profile', isAuthenticatedUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, data: serializeProfile(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
});

router.patch('/user/profile', isAuthenticatedUser, async (req, res) => {
  try {
    const allowedFields = ['email', 'username', 'firstName', 'lastName', 'avatar'];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ success: false, message: `${field} must be a string.` });
        }
        updates[field] = req.body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one profile field to update.' });
    }

    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(updates.email)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email.' });
      }
    }

    if (updates.username) {
      updates.username = updates.username.toLowerCase();
      if (updates.username.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'firstName') && !updates.firstName) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastName') && !updates.lastName) {
      return res.status(400).json({ success: false, message: 'Last name is required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: serializeProfile(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Username'} is already taken.`,
      });
    }
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

module.exports = router;
