
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-[calc(100vh-160px)] flex flex-col bg-background">
      {/* Hero */}
      <section className="container relative grid md:grid-cols-2 gap-10 items-center py-16 rounded-3xl bg-gradient-to-br from-accent/30 via-secondary/30 to-background">
        <div className="space-y-6 animate-fade-in">
          <span className="inline-flex items-center text-xs rounded-full border px-2 py-1 text-muted-foreground">
            Built for Teachers • WeeLMat Generator
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-secondary to-accent">
            WeeLMat Generator — Weekly planning, instantly clear
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-prose">
            WeeLMat turns your weekly competencies into a clear, learner‑friendly plan. Generate polished DOCX/PDF
            output ready for class use or contingency days—fast, consistent, and aligned with DepEd guidance.
          </p>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/auth")}>Get Started</Button>
              <Button variant="secondary" size="lg" onClick={() => navigate("/learn-more")}>Learn More</Button>
            </div>
            <ul className="text-sm text-muted-foreground grid gap-1.5">
              <li>• Purpose: Make weekly activities clear and accessible for learners.</li>
              <li>• Benefits: Structured planning, consistency during suspensions, and easy sharing/printing.</li>
              <li>• Output: A4‑ready DOCX and PDF with neat tables and clean typography.</li>
            </ul>
          </div>
        </div>

        {/* Visual */}
        <div className="rounded-3xl border bg-card text-card-foreground p-3 shadow-sm animate-fade-in">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-muted/30 flex items-center justify-center">
            <img
              src="https://raw.githubusercontent.com/John09lim/wee-mat-crafter/main/public/Screenshot%202025-08-11%20074334.png"
              alt="WeeLMat preview image"
              className="h-full w-full object-cover hover-scale"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/Screenshot%202025-08-11%20074334.png";
              }}
            />
          </div>
          <p className="sr-only">WeeLMat preview provided by the user</p>
        </div>
      </section>

      {/* Benefits */}
      <section className="container grid md:grid-cols-3 gap-6 pb-16">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Grounded & clear</h2>
          <p className="text-sm text-muted-foreground">
            Crafted to be concise and learner‑friendly, aligned to competencies—no clutter, just clarity.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Continuity ready</h2>
          <p className="text-sm text-muted-foreground">
            Supports learning during suspensions—easy to display, copy, or print in minimal copies.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-2">Fast output</h2>
          <p className="text-sm text-muted-foreground">
            Produce neat A4 DOCX/PDF matrices in seconds, with a simple, reliable flow.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="container pb-20">
        <div className="rounded-3xl border bg-card p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-semibold mb-4">How it works</h3>
          <ol className="grid md:grid-cols-3 gap-6 text-sm">
            <li className="rounded-xl border p-4">
              <p className="font-medium mb-1">1. Enter details</p>
              <p className="text-muted-foreground">
                Provide subject, grade, dates, and the week’s competency.
              </p>
            </li>
            <li className="rounded-xl border p-4">
              <p className="font-medium mb-1">2. Generate</p>
              <p className="text-muted-foreground">
                We create a clean, learner‑friendly WeeLMat with tasks and outputs.
              </p>
            </li>
            <li className="rounded-xl border p-4">
              <p className="font-medium mb-1">3. Download & share</p>
              <p className="text-muted-foreground">
                Get A4‑ready DOCX/PDF for display, projection, or printing.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
};

export default Index;
