import React from "react";
import "../../styles/SizeGuide.css";

type SizeRow = {
  label: string;
  small: string;
  medium: string;
};

const SIZE_ROWS: SizeRow[] = [
  { label: "Bust", small: "70–80 cm / 27.6–31.5 in", medium: "81–95 cm / 31.9–37.4 in" },
  { label: "Waist", small: "65–80 cm / 25.6–31.5 in", medium: "81–95 cm / 31.9–37.4 in" },
  { label: "Hips", small: "70–80 cm / 27.6–31.5 in", medium: "81–90 cm / 31.9–35.4 in" },
];

export default function SizeGuide() {
  return (
    <section className="sizeGuide">
      <header className="sizeGuide__header">
        <h1 className="sizeGuide__title">Size Guide</h1>
        <p className="sizeGuide__subtitle">
          Use the guide below to measure your body and choose the best fit.
        </p>
      </header>

      <div className="sizeGuide__block">
        <h2 className="sizeGuide__heading">Basic Measuring Areas</h2>

        <div className="sizeGuide__measure">
          <h3 className="sizeGuide__measureTitle">A. Bust / Chest</h3>
          <p className="sizeGuide__text">
            Measure under your arms, around the fullest part of your bust. Take the
            measurement directly on your body, without wearing a bra or clothing.
          </p>
        </div>

        <div className="sizeGuide__measure">
          <h3 className="sizeGuide__measureTitle">B. Waist</h3>
          <p className="sizeGuide__text">
            Measure around your natural waistline, approximately{" "}
            <strong>4 cm / 1.6 in</strong> above your belly button. To locate your
            natural waist, gently bend to the side — the crease that forms is your
            waistline.
          </p>
        </div>

        <div className="sizeGuide__measure">
          <h3 className="sizeGuide__measureTitle">C. Hips (Above Hips)</h3>
          <p className="sizeGuide__text">
            Measure around the area where your bikini bottom naturally sits,
            approximately <strong>6 cm / 2.4 in</strong> below your belly button.
          </p>
        </div>
      </div>

      <div className="sizeGuide__block">
        <h2 className="sizeGuide__heading">Swimwear Measuring Tips</h2>
        <ul className="sizeGuide__list">
          <li>Use a measuring tape directly on your body.</li>
          <li>For the most accurate results, we recommend having someone assist you.</li>
          <li>Hold the tape snug, but not tight.</li>
          <li>Ensure the tape remains straight and is not twisted.</li>
        </ul>
      </div>

      <div className="sizeGuide__block">
        <h2 className="sizeGuide__heading">One Size Swimwear</h2>
        <p className="sizeGuide__text">
          Our swimwear is designed as <strong>One Size</strong> and is highly stretchable,
          fitting comfortably <strong>Small to Medium</strong> body types.
        </p>
        <p className="sizeGuide__text">
          Please refer to the size chart below to ensure the best fit.
        </p>

        <div className="sizeGuide__notice">
          <p className="sizeGuide__text">
            <strong>Notice:</strong> Swimwear is considered intimate apparel. For hygiene
            reasons and optimal comfort, we strongly recommend providing your measurements
            before placing an order.
          </p>
          <p className="sizeGuide__text">
            If you are unsure, feel free to contact us — we will be happy to assist you
            in finding your ideal fit.
          </p>
        </div>
      </div>

      <div className="sizeGuide__block">
        <h2 className="sizeGuide__heading">Size Chart</h2>

        <div className="sizeGuide__tableWrap">
          <table className="sizeGuide__table">
            <thead>
              <tr>
                <th scope="col">Measurement</th>
                <th scope="col">Small</th>
                <th scope="col">Medium</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.small}</td>
                  <td>{row.medium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="sizeGuide__footnote">
          All measurements are shown in centimeters (cm) and inches (in). If your
          measurements fall between sizes, we recommend choosing the larger size or
          contacting us for personalized assistance.
        </p>
      </div>
    </section>
  );
}