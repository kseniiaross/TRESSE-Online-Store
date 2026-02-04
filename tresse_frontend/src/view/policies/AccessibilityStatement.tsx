import "../../../styles/Policy.css";

export default function AccessibilityStatement() {
  return (
    <section className="policy" aria-labelledby="accessibilityTitle">
      <div className="policy__content">
        <header className="policy__header">
          <h1 id="accessibilityTitle" className="policy__title">
            Accessibility Statement
          </h1>
        </header>

        <section className="policy__section" aria-labelledby="accessibilityCommitment">
          <h2 id="accessibilityCommitment" className="policy__h2">
            Our commitment
          </h2>
          <p className="policy__text">
            TRESSE is committed to providing a website that is accessible to the widest possible audience,
            regardless of technology or ability.
          </p>
          <p className="policy__text">
            We are actively working to improve the accessibility and usability of our website and aim to
            follow the Web Content Accessibility Guidelines (WCAG) 2.1 where possible.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="accessibilityFeatures">
          <h2 id="accessibilityFeatures" className="policy__h2">
            Accessibility features
          </h2>

          <ul className="policy__list">
            <li className="policy__li">Keyboard navigable interface</li>
            <li className="policy__li">Semantic HTML structure</li>
            <li className="policy__li">Readable color contrast</li>
            <li className="policy__li">Alternative text for images</li>
            <li className="policy__li">Responsive design for different devices</li>
          </ul>
        </section>

        <section className="policy__section" aria-labelledby="accessibilityFeedback">
          <h2 id="accessibilityFeedback" className="policy__h2">
            Feedback
          </h2>
          <p className="policy__text">
            If you experience any difficulty accessing content on this website, please contact us and we
            will do our best to assist you.
          </p>
          <p className="policy__text">
            Email:{" "}
            <a className="policy__link" href="mailto:support@tresseknitting.com">
              support@tresseknitting.com
            </a>
          </p>
        </section>
      </div>
    </section>
  );
}