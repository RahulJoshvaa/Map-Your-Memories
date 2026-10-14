import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { loginUser } from '../services/authService';
import { useTheme } from '../context/ThemeContext';

export const LoginForm = ({ onNavigateRegister, onLoginSuccess }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

  // Email format validator
  const isValidEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setServerMessage('');

    try {
      const response = await loginUser({
        email,
        password,
        rememberMe,
      });

      if (response.success) {
        setLoginSuccess(true);
        setServerMessage(response.message || 'Login successful!');
        
        // Navigate to dashboard after brief success animation
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(response.user);
          else setLoginSuccess(false);
        }, 1000);
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        password: err?.message || 'Authentication failed. Please check your credentials.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert('Password reset link has been dispatched to your email (Demo mode).');
  };

  return (
    <div className="w-full">
      {/* 3D Success Banner */}
      {loginSuccess && (
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
              🎉 Login Successful!
            </h4>
            <p className="text-xs sm:text-sm mt-0.5 font-medium opacity-90">
              {serverMessage} Welcome back to your memory vault!
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field */}
        <Input
          id="email-input"
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
          id="password-input"
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          icon={<Lock className="w-5 h-5 text-[#1a2c35] dark:text-neutral-400" />}
          autoComplete="current-password"
          disabled={isLoading}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="p-1.5 text-[#1a2c35]/70 hover:text-[#1a2c35] dark:text-neutral-400 dark:hover:text-[#ffb72b] rounded-lg transition-colors focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          }
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1 select-none">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="peer sr-only"
              />
              {/* 3D chunky checkbox */}
              <div className={`w-6 h-6 rounded-xl border-3 border-[#1a2c35] transition-all flex items-center justify-center
                ${
                  isDark
                    ? 'bg-[#0a2327] shadow-[0_3px_0_0_#041a1d] peer-checked:bg-[#ffb72b] peer-checked:shadow-[0_1px_0_0_#a35d10]'
                    : 'bg-white shadow-[0_3px_0_0_#cbd5e1] peer-checked:bg-[#02a896] peer-checked:shadow-[0_1px_0_0_#076159]'
                }
              `}>
                {rememberMe && (
                  <svg className="w-4 h-4 text-white dark:text-[#1a2c35] stroke-current stroke-3 fill-none" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`text-xs sm:text-sm font-bold font-chunky transition-colors ${isDark ? 'text-neutral-200' : 'text-[#1a2c35]'}`}>
              Remember me
            </span>
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            className={`text-xs sm:text-sm font-chunky font-bold hover:underline transition-colors focus:outline-none
              ${isDark ? 'text-[#ffb72b] hover:text-[#ffd65c]' : 'text-[#02a896] hover:text-[#028577]'}
            `}
          >
            Forgot password?
          </button>
        </div>

        {/* 3D Tactile Sign In Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full text-base py-4"
            isLoading={isLoading}
          >
            <span className="flex items-center justify-center gap-2">
              <span>Sign In to Vault</span>
              <ArrowRight className="w-5 h-5 stroke-3" />
            </span>
          </Button>
        </div>
      </form>

      {/* Registration Navigation Link */}
      <div className={`mt-5 pt-4 border-t-3 border-dashed text-center
        ${isDark ? 'border-[#1a2c35]' : 'border-[#e2d7c5]'}
      `}>
        <p className={`text-sm font-bold ${isDark ? 'text-neutral-300' : 'text-[#1a2c35]/80'}`}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateRegister}
            className={`font-chunky font-black hover:underline transition-colors cursor-pointer text-base
              ${isDark ? 'text-[#ffb72b]' : 'text-[#02a896]'}
            `}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};
