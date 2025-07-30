import { useAuth } from '../contexts/AuthContext';
import GoogleAuth from './GoogleAuth';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Sign In Required</h1>
          <p className="text-gray-300 mb-8">You need to sign in to access this feature.</p>
          <GoogleAuth />
        </div>
      </div>
    );
  }

  return children;
}
