import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <main className="min-h-[calc(100vh-160px)] flex items-center bg-background">
      <section className="container grid md:grid-cols-2 gap-10 items-center py-16">
        <div className="space-y-5 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            WeeLMat • Weekly Learning Matrix
          </h1>
          <p className="text-lg text-muted-foreground max-w-prose">
            Generate polished DOCX/PDF Weekly Learning Matrices powered by AI and real sources.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Get Started</Button>
            <Button variant="secondary" size="lg">Download Sample</Button>
            <Button variant="tertiary" size="lg">Learn More</Button>
          </div>
        </div>
        <div className="rounded-3xl border bg-card text-card-foreground p-6 shadow-sm">
          <div className="aspect-[4/3] w-full rounded-2xl border bg-muted/30 flex items-center justify-center text-muted-foreground">
            Your logo appears in the header. Replace /images/logo.png to use your own.
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
