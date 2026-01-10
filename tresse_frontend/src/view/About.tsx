// src/view/About.tsx
import "../../styles/About.css";

export default function About() {
  return (
    <main className="about" role="main" aria-label="About Tresse">
      <section className="about__hero">
        <p className="about__kicker">ABOUT TRESSE</p>
        <h1 className="about__title">
          MADE BY HAND.
          <br />
          BUILT WITH TIME.
        </h1>
      </section>

      <section className="about__content">
        <p>
          TRESSE began quietly — as a personal hobby, not a business plan.
          It started with yarn, needles, and long evenings spent learning how
          patience turns into form.
        </p>

        <p>
          What began as simple handmade pieces for friends slowly grew into
          something more intentional. Each garment carried time, attention,
          and the unmistakable character of human hands.
        </p>

        <p>
          We believe knitwear should feel personal. Not rushed. Not mass-produced.
          Every piece is created in small quantities, designed to last beyond
          seasons and trends.
        </p>

        <p>
          TRESSE is not about fast fashion. It’s about choosing quality,
          slowing down, and wearing something made with care — from the first
          stitch to the final detail.
        </p>

        <p className="about__signature">
          — TRESSE
        </p>
      </section>
    </main>
  );
}