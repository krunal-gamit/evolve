'use client';

import { useEffect, useState } from 'react';

export default function Footer() {
  const [projectName, setProjectName] = useState('Evolve');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setProjectName(data.projectName || 'Evolve');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  return (
    <footer className="mt-auto py-1.5 md:py-2 text-center text-[10px] md:text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
      <p>© {new Date().getFullYear()} {projectName}. Made with <span className="text-red-500 animate-pulse">♥</span> by Krunal Gamit</p>
    </footer>
  );
}