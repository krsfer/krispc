'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        action: isSignUp ? 'signup' : 'signin',
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setFormError(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card shadow-lg border-0 overflow-hidden" style={{ maxWidth: '450px', width: '100%', borderRadius: '1rem' }}>
      <div className="card-header bg-primary text-white text-center py-4 border-0">
        <div className="display-4 mb-2">🎨</div>
        <h1 className="h3 mb-0 fw-bold">Emoty</h1>
        <p className="mb-0 opacity-75">Emoji Pattern Creator</p>
      </div>
      
      <div className="card-body p-4 p-md-5">
        <h2 className="h4 text-center mb-4 fw-bold">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>

        {(formError || error) && (
          <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <div>{formError || (error === 'CredentialsSignin' ? 'Invalid email or password' : error)}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">Email address</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="fas fa-envelope text-muted"></i>
              </span>
              <input
                type="email"
                id="email"
                className="form-control bg-light border-start-0"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-semibold">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="fas fa-lock text-muted"></i>
              </span>
              <input
                type="password"
                id="password"
                className="form-control bg-light border-start-0"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-bold mb-3 shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Please wait...
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="mb-0 text-muted">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              className="btn btn-link fw-bold text-decoration-none"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up Now'}
            </button>
          </p>
        </div>
      </div>

      <div className="card-footer bg-light text-center py-3 border-0">
        <Link href="/" className="text-decoration-none text-muted small">
          <i className="fas fa-arrow-left me-1"></i> Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="container min-vh-100 d-flex align-items-center justify-content-center py-5">
      <Suspense fallback={
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
