import "../../../styles/Policy.css";

export default function PrivacyPolicy() {
  return (
    <section className="policy" aria-labelledby="policyTitle">
      <header className="policy__header">
        <h1 id="policyTitle" className="policy__title">
          Privacy Policy
        </h1>
      </header>

      <section className="policy__section" aria-labelledby="intro">
        <h2 id="intro" className="policy__h2">Overview</h2>
        <p className="policy__text">
          At TRESSE, we respect your privacy and are committed to protecting your personal data. This Privacy Policy
          explains how we collect, use, and safeguard your information when you use our website.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="collect">
        <h2 id="collect" className="policy__h2">Information we collect</h2>
        <p className="policy__text">We may collect the following information when you use our website:</p>
        <ul className="policy__text">
          <li>Email address (for account creation, login, and order notifications)</li>
          <li>Order information (products purchased, sizes, prices)</li>
          <li>Authentication data stored locally in your browser</li>
        </ul>
      </section>

      <section className="policy__section" aria-labelledby="use">
        <h2 id="use" className="policy__h2">How we use your information</h2>
        <p className="policy__text">Your information is used solely to:</p>
        <ul className="policy__text">
          <li>Process orders and payments</li>
          <li>Manage user accounts and authentication</li>
          <li>Provide customer support</li>
          <li>Improve the functionality of our website</li>
        </ul>
      </section>

      <section className="policy__section" aria-labelledby="storage">
        <h2 id="storage" className="policy__h2">Cookies and local storage</h2>
        <p className="policy__text">
          TRESSE does not use tracking or marketing cookies. We use local storage and session storage in your browser
          strictly for authentication purposes and to improve your user experience.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="payments">
        <h2 id="payments" className="policy__h2">Payments</h2>
        <p className="policy__text">
          Payments on our website are securely processed by third-party payment providers such as Stripe. We do not store
          or have access to your full payment details.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="sharing">
        <h2 id="sharing" className="policy__h2">Data sharing</h2>
        <p className="policy__text">
          We do not sell, trade, or rent your personal data to third parties. Your data is shared only when necessary to
          process payments or fulfill your orders.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="rights">
        <h2 id="rights" className="policy__h2">Your rights</h2>
        <p className="policy__text">
          You have the right to request access to, correction of, or deletion of your personal data.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="contact">
        <h2 id="contact" className="policy__h2">Contact</h2>
        <p className="policy__text">
          Email:{" "}
          <a href="mailto:support@tresseknitting.com">support@tresseknitting.com</a>
        </p>
      </section>
    </section>
  );
}