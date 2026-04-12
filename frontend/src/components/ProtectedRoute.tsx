import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const ProtectedRoute: React.FC = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
  }, []);

  if (authed === null) return null; // session check in flight — render nothing
  if (!authed) return <Navigate to="/auth" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
