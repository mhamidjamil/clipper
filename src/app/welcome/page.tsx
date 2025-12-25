
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomePage() {
  const [showAuthButtons, setShowAuthButtons] = useState(false);
  const router = useRouter();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          Welcome to Clipper Scheduler
        </h1>
      </motion.div>

      <div className="mt-8" style={{ minHeight: '40px' }}>
        <AnimatePresence>
          {!showAuthButtons ? (
            <motion.div
              key="get-started"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Button onClick={() => setShowAuthButtons(true)} size="lg">
                Get Started
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="auth-buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex gap-4"
            >
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/login')}
              >
                Login
              </Button>
              <Button size="lg" onClick={() => router.push('/signup')}>
                Sign Up
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
