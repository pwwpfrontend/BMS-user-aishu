import React, { useState, useRef } from 'react';
import { Camera, User, Mail, Lock, Briefcase, Save, X, Eye, EyeOff, Check } from 'lucide-react';

export default function MyProfile() {
  // User data state
  const [userData, setUserData] = useState({
    username: 'anjali.ks',
    email: 'anjali.ks@powerworkplace.com',
    role: 'Developer',
    profilePhoto: null, // null means using default avatar
    joinedDate: '2024-01-15'
  });

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...userData });
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Success/Error messages
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // File input ref
  const fileInputRef = useRef(null);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Handle password input changes
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  // Handle profile photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage('error', 'File size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, profilePhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove profile photo
  const handleRemovePhoto = () => {
    setEditData(prev => ({ ...prev, profilePhoto: null }));
  };

  // Show message helper
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app: await fetch('/api/user/profile', { method: 'PUT', body: editData })
      
      setUserData(editData);
      setIsEditing(false);
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditData({ ...userData });
    setIsEditing(false);
  };

  // Change password
  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showMessage('error', 'Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showMessage('error', 'New password must be at least 8 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    setSaving(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app: await fetch('/api/user/change-password', { method: 'POST', body: passwordData })
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      showMessage('success', 'Password changed successfully!');
    } catch (error) {
      showMessage('error', 'Failed to change password. Please check your current password.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Page Title */}
        <h1 className="text-3xl font-semibold text-gray-900 mb-8" style={{ fontFamily: 'Inter' }}>
          My Profile
        </h1>

        {/* Success/Error Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <span className="font-medium" style={{ fontFamily: 'Inter' }}>{message.text}</span>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          {/* Header with Edit Button */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
              Profile Information
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'Inter' }}
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'Inter' }}
                >
                  <Save className="w-4 h-4 inline mr-1" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Profile Content */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Photo Section */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {/* Avatar */}
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {(isEditing ? editData.profilePhoto : userData.profilePhoto) ? (
                      <img
                        src={isEditing ? editData.profilePhoto : userData.profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-4xl font-bold" style={{ fontFamily: 'Inter' }}>
                        {(isEditing ? editData.username : userData.username).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Edit Photo Button */}
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors border-4 border-white"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Remove Photo Button */}
                {isEditing && editData.profilePhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                    style={{ fontFamily: 'Inter' }}
                  >
                    Remove Photo
                  </button>
                )}

                {/* Photo Guidelines */}
                {isEditing && (
                  <p className="mt-2 text-xs text-gray-500 text-center" style={{ fontFamily: 'Inter' }}>
                    JPG, PNG or GIF<br />Max size: 5MB
                  </p>
                )}
              </div>

              {/* Form Fields */}
              <div className="flex-1 space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    <User className="w-4 h-4 inline mr-1" />
                    Username
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Inter' }}
                      placeholder="Enter username"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900" style={{ fontFamily: 'Inter' }}>
                      {userData.username}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Inter' }}
                      placeholder="Enter email"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900" style={{ fontFamily: 'Inter' }}>
                      {userData.email}
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Role
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Inter' }}
                      placeholder="Enter role"
                    />
                  ) : (
                    <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-900" style={{ fontFamily: 'Inter' }}>
                      {userData.role}
                    </div>
                  )}
                </div>

                {/* Member Since */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    Member Since
                  </label>
                  <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-600" style={{ fontFamily: 'Inter' }}>
                    {new Date(userData.joinedDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter' }}>
                Password & Security
              </h2>
              <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                Manage your password and account security
              </p>
            </div>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                <Lock className="w-4 h-4 inline mr-1" />
                Change Password
              </button>
            )}
          </div>

          {/* Password Form */}
          {isChangingPassword && (
            <div className="p-6">
              <div className="max-w-md space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Inter' }}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Inter' }}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
                    Password must be at least 8 characters
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontFamily: 'Inter' }}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'Inter' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'Inter' }}
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Not Changing State */}
          {!isChangingPassword && (
            <div className="p-6">
              <div className="flex items-center gap-3 text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                <Lock className="w-5 h-5 text-gray-400" />
                <span>Your password is secure. Last changed 30 days ago.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}