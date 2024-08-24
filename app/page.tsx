// pages/index.tsx
'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/sign-in');
  }, [router]);

  return null; // You can also display a loading spinner or message here
}
