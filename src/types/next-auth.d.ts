import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      qrCode?: string;
      locations?: string[];
    };
  }

  interface User {
    role: string;
    qrCode?: string;
    locations?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    qrCode?: string;
    locations?: string[];
  }
}