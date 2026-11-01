import React from 'react';
import type { Metadata } from 'next';
import LoginClient from './components/LoginClient';

export const metadata: Metadata = { title: 'Sign In' };

export default function SignUpLoginPage() {
  return <LoginClient />;
}