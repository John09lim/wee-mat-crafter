import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground border-b-2 border-accent">
      <div className="container flex items-center gap-3 py-4">
        <img
          src="/images/logo.png"
          alt="WeeLMat logo"
          className="h-10 w-10 rounded-md bg-primary-foreground/0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
          loading="eager"
        />
        <div className="flex-1">
          <p className="text-lg font-semibold leading-tight">WeeLMat • Weekly Learning Matrix</p>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/auth" className="hover:underline underline-offset-4">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
