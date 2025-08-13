const LearnMore = () => {
  return (
    <main className="min-h-[calc(100vh-160px)] py-12">
      <section className="container space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Learn More</h1>
          <p className="text-muted-foreground mt-2">Explore how WeeLMat crafts grounded, classroom‑ready matrices.</p>
        </header>
        <div className="grid md:grid-cols-2 gap-6">
          <figure className="rounded-2xl border bg-card p-2 overflow-hidden">
            <img src="/images/learn-1.png" alt="WeeLMat workflow overview" className="w-full h-auto" loading="lazy" />
            <figcaption className="p-3 text-sm text-muted-foreground">Overview: sources → AI → DOCX/PDF</figcaption>
          </figure>
          <figure className="rounded-2xl border bg-card p-2 overflow-hidden">
            <img src="/images/learn-2.png" alt="WeeLMat table sample result" className="w-full h-auto" loading="lazy" />
            <figcaption className="p-3 text-sm text-muted-foreground">Sample WeeLMat table output</figcaption>
          </figure>
        </div>
        <p className="text-sm text-muted-foreground">Tip: Replace the placeholder images at /public/images/learn-1.png and /public/images/learn-2.png with your own visuals.</p>
      </section>
    </main>
  );
};

export default LearnMore;
