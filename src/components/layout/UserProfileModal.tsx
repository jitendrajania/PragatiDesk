import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SystemRoleBadge } from '../common/Badge';
import {
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Building,
  Briefcase,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Save,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gmailId, setGmailId] = useState('');
  const [designation, setDesignation] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setGmailId(user.gmailId || '');
      setDesignation(user.designation || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Please enter a valid official email address format.');
      return;
    }

    if (phone && !PHONE_REGEX.test(phone.trim().replace(/[\s\-]/g, ''))) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (gmailId && !EMAIL_REGEX.test(gmailId.trim())) {
      setErrorMessage('Please enter a valid Gmail address format.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim().replace(/[\s\-]/g, '') : null,
        gmailId: gmailId ? gmailId.toLowerCase().trim() : null,
        designation: designation.trim() || user.designation,
      });

      setSuccessMessage('Your profile details have been successfully updated. An automated notification was sent to your registered email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your existing password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('New password cannot be the same as your current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Your password has been changed successfully. A security confirmation has been dispatched to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to change password. Please check your existing password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">My Account Profile & Security</h2>
              <p className="text-xs text-slate-500">Manage your official contact details, credentials, and password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Profile & Contact Information
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Change Password & Security
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: PROFILE DETAILS FORM */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* System Info Context Badge Card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Government SSO ID:</span>
                <span className="font-mono text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  {user.ssoId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Assigned Office:</span>
                <span className="font-semibold text-slate-800">{user.officeName || 'DoIT&C Secretariat HQ'}</span>
              </div>
              {user.sectionName && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Section/Group Head:</span>
                  <span className="font-semibold text-slate-800">{user.sectionName}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500">System Role:</span>
                <SystemRoleBadge role={user.systemRole} />
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 9414012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Personal Gmail ID (For 1-Click Google Sign-In)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500" />
                <input
                  type="email"
                  placeholder="e.g. yourname.doitc@gmail.com"
                  value={gmailId}
                  onChange={(e) => setGmailId(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSubmitting ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CHANGE PASSWORD FORM */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Ensure your password is at least 6 characters long and combines letters, numbers, or symbols. You can use this password to sign in with your Official Email or SSO ID.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Existing Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {isSubmitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
