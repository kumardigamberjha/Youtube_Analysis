import { auth } from '../lib/firebase';

export default function FirebaseDebug() {
  const handleTest = () => {
    console.log('Firebase Auth instance:', auth);
    console.log('Firebase config:', auth.app.options);
  };

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-2">Firebase Debug</h3>
      <button 
        onClick={handleTest}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Test Firebase Config
      </button>
      <div className="mt-2 text-sm">
        <p>Check the browser console for Firebase config details</p>
        <p>Project ID: {auth.app.options.projectId}</p>
        <p>API Key: {auth.app.options.apiKey?.substring(0, 10)}...</p>
      </div>
    </div>
  );
}
