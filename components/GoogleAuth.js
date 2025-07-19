import React, { useEffect, useState } from 'react';
import { initGoogleClient, getUserEmail } from '../lib/sheets';

export default function GoogleAuth() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    initGoogleClient((signed) => {
      setSignedIn(signed);
      setEmail(signed ? getUserEmail() : '');
    });
  }, []);

  const handleSignIn = () => window.gapi.auth2.getAuthInstance().signIn();
  const handleSignOut = () => window.gapi.auth2.getAuthInstance().signOut();

  return (
    <div className="flex items-center gap-2">
      {!signedIn && <button onClick={handleSignIn} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Sign in with Google</button>}
      {signedIn && (
        <div className="flex items-center gap-2">
          <button onClick={handleSignOut} className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800">Sign out</button>
          <span className="text-sm text-gray-200">{email}</span>
        </div>
      )}
    </div>
  );
} 