const Footer = () => {
  return (
    <footer className="border-t bg-secondary text-secondary-foreground">
      <div className="container py-8 grid md:grid-cols-3 gap-6 text-sm">
        <div>
          <p className="font-semibold">WeeLMat</p>
          <p className="text-muted-foreground mt-2">Weekly Learning Matrix generator for teachers.</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Resources</p>
          <ul className="space-y-1 text-muted-foreground">
            <li><a href="/learn-more" className="hover:underline">Learn More</a></li>
            <li><a href="/auth" className="hover:underline">Login</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4 text-xs text-muted-foreground">© {new Date().getFullYear()} WeeLMat</div>
      </div>
    </footer>
  );
};

export default Footer;
