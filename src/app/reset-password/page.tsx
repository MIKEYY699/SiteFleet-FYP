import React from 'react';
import type { Metadata } from 'next';
import ResetPasswordClient from './components/ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password — SKBEquip',
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
