import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    window.location.href = "/";
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
          {!loading && userRole === 'teacher' && (
            <>
              <Link to="/weelmat-history" className="hover:underline underline-offset-4">
                History
              </Link>
              <Link to="/dashboard" className="hover:underline underline-offset-4">
                Create WeeLMat
              </Link>
              <Link to="/my-account" className="hover:underline underline-offset-4">
                My Account
              </Link>
            </>
          )}
          
          {!loading && userRole === 'school_head' && (
            <>
              <Link to="/principal-dashboard" className="hover:underline underline-offset-4">
                Principal Dashboard
              </Link>
              <Link to="/my-account" className="hover:underline underline-offset-4">
                My Account
              </Link>
            </>
          )}
          
          {!loading && userRole === 'supervisor' && (
            <>
              <Link to="/supervisor-dashboard" className="hover:underline underline-offset-4">
                Supervisor Dashboard
              </Link>
              <Link to="/my-account" className="hover:underline underline-offset-4">
                My Account
              </Link>
            </>
          )}
          
          {!loading && !userRole && location.pathname !== "/auth" && location.pathname !== "/principal-dashboard" && location.pathname !== "/supervisor-dashboard" && (
            <Link to="/auth" className="hover:underline underline-offset-4">
              Login
            </Link>
          )}
          
          {!loading && userRole && (
            <Button 
              onClick={handleLogout} 
              variant="outline"
              size="sm"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
