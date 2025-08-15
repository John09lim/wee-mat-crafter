const LearnMore = () => {
  return <main className="min-h-[calc(100vh-160px)] py-12 bg-gradient-to-b from-accent/20 via-secondary/10 to-transparent">
      <section className="container space-y-10">
        <header className="text-center space-y-3 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-secondary to-accent">
            UTILIZATION OF THE WEEKLY LEARNING MATRIX (WeeLMat)
          </h1>
          <p className="text-muted-foreground">Implementing Guidelines</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 shadow-sm animate-fade-in">
            <h2 className="font-semibold">Purpose</h2>
            <p className="text-sm text-muted-foreground">Make weekly activities clear and accessible for learners.</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm animate-fade-in">
            <h2 className="font-semibold">Benefits</h2>
            <p className="text-sm text-muted-foreground">Structured planning and continuity during class suspensions.</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm animate-fade-in">
            <h2 className="font-semibold">Format</h2>
            <p className="text-sm text-muted-foreground">Clear, concise, learner‑friendly matrix for each week.</p>
          </div>
        </div>

        <article className="max-w-none space-y-8">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Preparation</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                Subject teachers for each learning area and grade level shall prepare the Weekly Learning Matrix (WeeLMat),
                based on their respective Daily Lesson Plan (DLP) or Daily Lesson Log (DLL), covering the targeted
                competencies for the week.
              </p>
              <p>
                The prescribed format must be accomplished clearly and concisely, ensuring it is easy for learners to
                understand. The primary purpose of the matrix is to make learners aware of the learning activities planned
                for the week.
              </p>
              <p>
                Competencies may be written briefly, using keywords or simplified terms easily understood by learners.
              </p>
              <p>
                Learning materials (e.g., learning modules, activity sheets) to be used—especially in case of class
                suspension—should also be indicated. Teachers must ensure that these materials are accessible to all learners.
              </p>
              <p>
                Teachers should indicate achievable and manageable learning activities/tasks, avoiding excessive outputs that
                may overwhelm learners.
              </p>
              <p>
                Teachers have the autonomy to decide how the WeeLMat will be presented to the learners: it may be written on
                the chalkboard or whiteboard, projected on a LED TV or LCD projector, or printed in minimal copies. The most
                cost-efficient and sustainable options are encouraged.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Presentation</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                The WeeLMat must be presented to the learners every Monday (or on the first class day of the week). Learners
                are encouraged to copy the matrix into their class notebooks. This practice should not incur additional
                expenses for learners.
              </p>
              <p>
                Teachers shall briefly explain the entries in the matrix, emphasizing the scheduled learning activities,
                tasks, and expected outputs for the week. This explanation should not exceed 15 minutes so as not to unduly
                reduce instructional time.
              </p>
              <p>
                Clear instructions should be provided on how learners are expected to accomplish the tasks in case of
                suspension of face-to-face classes.
              </p>
              <p>
                The matrix may also serve as a daily checklist for learners to monitor their progress and ensure completion
                of the intended activities or outputs for each day of the week.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Mandate & Rationale</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p><strong>To:</strong> Schools Division Superintendents<br />All Others Concerned</p>
              <p>
                In support of DepEd Order No. 22, s. 2024 titled “Revised Guidelines on Class and Work Suspension in Schools
                During Disasters and Emergencies” and in consonance with the Department’s effort to constantly ensure
                learning continuity, this Office hereby mandates the utilization of the Weekly Learning Matrix (WeeLMat) in all
                public schools across the Negros Island Region (NIR) starting August 4, 2025.
              </p>
              <p>The WeeLMat is designed to:</p>
              <ol className="list-decimal pl-6">
                <li>strengthen weekly instructional planning;</li>
                <li>foster learners’ awareness of their weekly learning activities, thereby providing instructional direction and promoting self-directed learning; and</li>
                <li>provide structured, adaptable instruction that supports learning continuity during class disruptions.</li>
              </ol>
              <p>
                Enclosed are the specific guidelines for its effective implementation along with the suggested format.
              </p>
              <p>
                The Schools Division Superintendents are directed to ensure full compliance with the utilization of the WeeLMat
                by designating division and district monitors to regularly oversee and evaluate its use in schools.
              </p>
              <p><strong>Immediate dissemination of and compliance with this Memorandum are desired.</strong></p>
              <p className="mx-0 my-[22px]"><strong>RAMIR B. UYTICO</strong> EdD, CESO III<br />Regional Director</p>
            </div>
          </section>
        </article>
      </section>
    </main>;
};
export default LearnMore;