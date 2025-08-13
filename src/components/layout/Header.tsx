import { Link, useLocation } from "react-router-dom";
const Header = () => {
  const location = useLocation();
  return <header className="bg-primary text-primary-foreground border-b-2 border-accent">
      <div className="container flex items-center gap-3 py-4 rounded-lg">
          <img
            src="/weelmat-logo.png"
            alt="WeeLMat school logo"
            className="h-10 w-auto rounded-md bg-primary-foreground/0 object-contain"
            loading="eager"
          />
        <div className="flex-1">
          <p className="text-lg font-semibold leading-tight">WeeLMat • Weekly Learning Matrix</p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/my-account" className="hover:underline underline-offset-4">
            My Files
          </Link>
          {location.pathname !== "/auth" && (
            <Link to="/auth" className="hover:underline underline-offset-4">Login</Link>
          )}
        </nav>
      </div>
    </header>;
};
export default Header;