import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        setUserRole(data?.role || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-primary text-primary-foreground border-b-2 border-accent">
      <div className="container flex items-center gap-3 py-4 rounded-lg">
        <img
          src="/weelmat-logo.png"
          alt="WeeLMat school logo"
          className="h-12 w-auto max-w-none rounded-md bg-primary-foreground/0 object-contain"
          loading="eager"
        />
        <div className="flex-1">
          <p className="text-lg font-semibold leading-tight">WeeLMat • Weekly Learning Matrix</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/my-account" className="hover:underline underline-offset-4">
            My Files
          </Link>
          
          {!loading && userRole === 'teacher' && (
            <>
              <Link to="/weelmat-history" className="hover:underline underline-offset-4">
                My WeeLMats
              </Link>
              <Link to="/teacher-submission" className="hover:underline underline-offset-4">
                Submit WeeLMat
              </Link>
              <Link to="/dashboard" className="hover:underline underline-offset-4">
                Dashboard
              </Link>
            </>
          )}
          
          {!loading && userRole === 'school_head' && (
            <Link to="/principal-dashboard" className="hover:underline underline-offset-4">
              Principal Dashboard
            </Link>
          )}
          
          {!loading && userRole === 'supervisor' && (
            <Link to="/supervisor-dashboard" className="hover:underline underline-offset-4">
              Supervisor Dashboard
            </Link>
          )}
          
          {location.pathname !== "/auth" && (
            <Link to="/auth" className="hover:underline underline-offset-4">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
