import React from 'react';
import Image from 'next/image';

interface AppLogoProps {
  src?: string;
  size?: number;
  className?: string;
}

export default function AppLogo({ src = '/assets/images/app_logo.png', size = 64, className = '' }: AppLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image src={src} alt="SKBEquip logo" width={size} height={size} className="flex-shrink-0" priority />
    </div>
  );
}
