// Entry point → Sign Up / Login Screen
import React from 'react';
import type { Metadata } from 'next';
import LoginPage from './sign-up-login-screen/page';

export const metadata: Metadata = { title: { absolute: 'Sign In — SKBEquip' } };

export default function RootPage() {
  return <LoginPage />;
}