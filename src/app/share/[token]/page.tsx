'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOTP } from '@/actions/verify-otp';

interface SharePageProps {
    params: Promise<{ token: string }>;
}

type VerificationState = 'idle' | 'loading' | 'success' | 'error';

export default function SharePage({ params }: SharePageProps) {
    const router = useRouter();
    const [token, setToken] = useState<string>('');
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [state, setState] = useState<VerificationState>('idle');
    const [error, setError] = useState<string>('');
    const [remainingAttempts, setRemainingAttempts] = useState(3);
    const [countdown, setCountdown] = useState(300); // 5 minutes
    const [shake, setShake] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resolve params
    useEffect(() => {
        params.then((p) => setToken(p.token));
    }, [params]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    // Auto-focus first input
    useEffect(() => {
        if (token && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [token]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerClass = (): string => {
        if (countdown <= 30) return 'timer-danger';
        if (countdown <= 60) return 'timer-warning';
        return 'timer-safe';
    };

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            inputRefs.current[5]?.focus();
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = useCallback(async () => {
        const otpString = otp.join('');

        if (otpString.length !== 6) {
            setError('Please enter all 6 digits');
            triggerShake();
            return;
        }

        if (countdown <= 0) {
            setError('OTP has expired. Please request a new link.');
            return;
        }

        setState('loading');
        setError('');

        try {
            const result = await verifyOTP({ token, otp: otpString });

            if (result.success) {
                setState('success');
                // Smooth transition to view page
                setTimeout(() => {
                    router.push(`/view/${token}`);
                }, 1200);
            } else {
                setState('error');
                setError(result.error || 'Verification failed');
                triggerShake();

                if (result.errorType === 'INVALID_OTP') {
                    setRemainingAttempts((prev) => Math.max(0, prev - 1));
                }

                // Reset OTP inputs
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();

                setTimeout(() => setState('idle'), 2000);
            }
        } catch {
            setState('error');
            setError('Connection error. Please try again.');
            triggerShake();
            setTimeout(() => setState('idle'), 2000);
        }
    }, [otp, token, countdown, router]);

    // Auto-submit when all 6 digits entered
    useEffect(() => {
        if (otp.every((digit) => digit !== '') && state === 'idle') {
            handleSubmit();
        }
    }, [otp, state, handleSubmit]);

    if (!token) {
        return (
            <main className="otp-wrapper">
                <div className="otp-card">
                    <div className="loading-spinner" />
                    <p className="loading-text">Loading secure verification...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="otp-wrapper">
            {/* Decorative Background Elements */}
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />
            <div className="bg-grid" />

            <div className="otp-card">
                {/* Header */}
                <div className="otp-header">
                    <div className={`lock-icon ${state === 'success' ? 'unlocked' : ''}`}>
                        {state === 'success' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4" />
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        )}
                    </div>
                    <h1 className="otp-title">
                        {state === 'success' ? 'Access Granted' : 'Secure Verification'}
                    </h1>
                    <p className="otp-subtitle">
                        {state === 'success'
                            ? 'Redirecting to protected data...'
                            : 'Enter the 6-digit code to access protected information'
                        }
                    </p>
                </div>

                {/* Timer */}
                {state !== 'success' && (
                    <div className={`otp-timer ${getTimerClass()}`}>
                        <svg className="timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>
                            {countdown > 0
                                ? `OTP expires in ${formatTime(countdown)}`
                                : 'OTP has expired'
                            }
                        </span>
                    </div>
                )}

                {/* OTP Input */}
                {state !== 'success' && (
                    <div className={`otp-input-container ${shake ? 'shake' : ''}`}>
                        <label className="otp-label">Enter OTP</label>
                        <div className="otp-boxes">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className={`otp-box ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
                                    disabled={state === 'loading' || countdown <= 0}
                                    autoComplete="one-time-code"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="otp-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{error}</span>
                        {remainingAttempts > 0 && remainingAttempts < 3 && (
                            <span className="attempts-left">
                                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                            </span>
                        )}
                    </div>
                )}

                {/* Success Animation */}
                {state === 'success' && (
                    <div className="success-animation">
                        <div className="success-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 13l4 4L19 7" className="checkmark" />
                            </svg>
                        </div>
                        <p className="success-text">Verification Successful</p>
                    </div>
                )}

                {/* Submit Button */}
                {state !== 'success' && (
                    <button
                        onClick={handleSubmit}
                        disabled={state === 'loading' || countdown <= 0 || otp.some((d) => !d)}
                        className={`otp-button ${state}`}
                    >
                        {state === 'loading' ? (
                            <>
                                <span className="button-spinner" />
                                Verifying...
                            </>
                        ) : state === 'error' ? (
                            'Try Again'
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4" />
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                                Verify Access
                            </>
                        )}
                    </button>
                )}

                {/* Trust Indicators */}
                <div className="trust-indicators">
                    <div className="trust-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Single-use access</span>
                    </div>
                    <div className="trust-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Auto-expires after viewing</span>
                    </div>
                    <div className="trust-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>No data stored after expiry</span>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="security-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Protected by AES-256 encryption</span>
                </div>
            </div>
        </main>
    );
}
