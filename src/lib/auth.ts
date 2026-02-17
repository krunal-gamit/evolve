import NextAuth, { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import Log from '@/models/Log';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          await dbConnect();

          const user = await User.findOne({ email: credentials.email });
          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          await Log.create({
            action: 'LOGIN',
            entity: 'User',
            entityId: user._id.toString(),
            details: `User ${user.email} logged in successfully.`,
            performedBy: user.email,
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            qrCode: user.qrCode || undefined,
            locations: user.locations?.map((loc: any) => loc.toString()) || [],
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.qrCode = user.qrCode;
        token.locations = user.locations || [];
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token.sub) {
        await dbConnect();
        const user = await User.findById(token.sub).select('name email role qrCode locations');
        if (user && session.user) {
          session.user.id = user._id.toString();
          session.user.name = user.name;
          session.user.email = user.email;
          session.user.role = user.role;
          session.user.qrCode = user.qrCode || undefined;
          session.user.locations = user.locations?.map((loc: any) => loc.toString()) || [];
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

export const auth = () => getServerSession(authOptions);

export default NextAuth(authOptions);