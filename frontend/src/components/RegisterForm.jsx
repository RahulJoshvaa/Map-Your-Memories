import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { authService } from '../services/auth/authService';
import { useTheme } from '../context/ThemeContext';

export const RegisterForm = ({ onNavigateLogin, onRegisterSuccess }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

  const isValidEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setServerMessage('');

    try {
      const response = await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      setRegisterSuccess(true);
      setServerMessage('Account created successfully!');

      setTimeout(() => {
        if (onRegisterSuccess) onRegisterSuccess(response.user);
      }, 1000);
    } catch (err) {
      const detail = err?.message || 'Registration failed. Please try again.';
      if (err?.status === 409 || detail.toLowerCase().includes('already exists')) {
        setErrors((prev) => ({
          ...prev,
          email: 'An account with this email already exists',
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: detail,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* 3D Success Banner */}
      {registerSuccess && (
        <div className={`mb-6 p-4.5 rounded-2xl border-3 border-[#1a2c35] flex items-start gap-3 animate-fadeIn
          ${
            isDark
              ? 'bg-[#0f4347] text-white shadow-[0_6px_0_0_#062b2e,0_6px_0_3px_#1a2c35]'
              : 'bg-[#fffae8] text-[#1a2c35] shadow-[0_6px_0_0_#e2d7c5,0_6px_0_3px_#1a2c35]'
          }
        `}>
          <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-[#02a896] dark:text-[#ffb72b]" />
          <div className="flex-1">
            <h4 className="font-chunky font-black text-sm sm:text-base">
              🎉 Welcome Aboard!
            </h4>
            <p className="text-xs sm:text-sm mt-0.5 font-medium opacity-90">
              {serverMessage} Launching your personal memory vault...
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {/* Name Field */}
        <Input
          id="name-input"
          type="text"
          label="Full Name"
          placeholder="Rahul Verma"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          icon={<User className="w-5 h-5 text-[#1a2c35] dark:text-neutral-400" />}
          autoComplete="name"
          disabled={isLoading}
        />

        {/* Email Field */}
        <Input
          id="email-register-input"
          type="email"
          label="Email Address"
          placeholder="explorer@memories.map"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          icon={<Mail className="w-5 h-5 text-[#1a2c35] dark:text-neutral-400" />}
          autoComplete="email"
          disabled={isLoading}
        />

        {/* Password Field */}
        <Input
          id="password-register-input"
          type={showPassword ? 'text' : 'password'}
          label="Password (min 8 characters)"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          icon={<Lock className="w-5 h-5 text-[#1a2c35] dark:text-neutral-400" />}
          autoComplete="new-password"
          disabled={isLoading}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="p-1.5 text-[#1a2c35]/70 hover:text-[#1a2c35] dark:text-neutral-400 dark:hover:text-[#ffb72b] rounded-lg transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
        />

        {/* Confirm Password Field */}
        <Input
          id="confirm-password-input"
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirm Password"
          placeholder="••••••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
          icon={<Lock className="w-5 h-5 text-[#1a2c35] dark:text-neutral-400" />}
          autoComplete="new-password"
          disabled={isLoading}
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="p-1.5 text-[#1a2c35]/70 hover:text-[#1a2c35] dark:text-neutral-400 dark:hover:text-[#ffb72b] rounded-lg transition-colors focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
        />

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full text-base py-4"
            isLoading={isLoading}
          >
            <span className="flex items-center justify-center gap-2">
              <span>Create Account</span>
              <ArrowRight className="w-5 h-5 stroke-3" />
            </span>
          </Button>
        </div>
      </form>

      {/* Back to Login Link */}
      <div className={`mt-5 pt-4 border-t-3 border-dashed text-center
        ${isDark ? 'border-[#1a2c35]' : 'border-[#e2d7c5]'}
      `}>
        <p className={`text-sm font-bold ${isDark ? 'text-neutral-300' : 'text-[#1a2c35]/80'}`}>
          Already have a memory vault?{' '}
          <button
            type="button"
            onClick={onNavigateLogin}
            className={`font-chunky font-black hover:underline transition-colors cursor-pointer text-base
              ${isDark ? 'text-[#ffb72b]' : 'text-[#02a896]'}
            `}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
