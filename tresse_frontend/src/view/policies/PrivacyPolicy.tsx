import "../../../styles/Policy.css";

export default function PrivacyPolicy() {
  return (
    <section className="policy" aria-labelledby="privacyTitle">
      <div className="policy__content">
        <header className="policy__header">
          <h1 id="privacyTitle" className="policy__title">
            Privacy Policy
          </h1>
        </header>

        <section className="policy__section" aria-labelledby="privacyOverview">
          <h2 id="privacyOverview" className="policy__h2">
            Overview
          </h2>
          <p className="policy__text">
            At TRESSE, we respect your privacy and are committed to protecting your personal data. This Privacy Policy
            explains how we collect, use, and safeguard your information when you use our website.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="privacyCollect">
          <h2 id="privacyCollect" className="policy__h2">
            Information we collect
          </h2>
          <p className="policy__text">We may collect the following information when you use our website:</p>
          <ul className="policy__list">
            <li className="policy__li">Email address (for account creation, login, and order notifications)</li>
            <li className="policy__li">Order information (products purchased, sizes, prices)</li>
            <li className="policy__li">Authentication data stored locally in your browser</li>
          </ul>
        </section>

        <section className="policy__section" aria-labelledby="privacyUse">
          <h2 id="privacyUse" className="policy__h2">
            How we use your information
          </h2>
          <p className="policy__text">Your information is used solely to:</p>
          <ul className="policy__list">
            <li className="policy__li">Process orders and payments</li>
            <li className="policy__li">Manage user accounts and authentication</li>
            <li className="policy__li">Provide customer support</li>
            <li className="policy__li">Improve the functionality of our website</li>
          </ul>
        </section>

        <section className="policy__section" aria-labelledby="privacyStorage">
          <h2 id="privacyStorage" className="policy__h2">
            Cookies and local storage
          </h2>
          <p className="policy__text">
            TRESSE does not use tracking or marketing cookies. We use local storage and session storage in your browser
            strictly for authentication purposes and to improve your user experience.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="privacyPayments">
          <h2 id="privacyPayments" className="policy__h2">
            Payments
          </h2>
          <p className="policy__text">
            Payments on our website are securely processed by third-party payment providers such as Stripe. We do not
            store or have access to your full payment details.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="privacySharing">
          <h2 id="privacySharing" className="policy__h2">
            Data sharing
          </h2>
          <p className="policy__text">
            We do not sell, trade, or rent your personal data to third parties. Your data is shared only when necessary
            to process payments or fulfill your orders.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="privacyRights">
          <h2 id="privacyRights" className="policy__h2">
            Your rights
          </h2>
          <p className="policy__text">
            You have the right to request access to, correction of, or deletion of your personal data.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="privacyContact">
          <h2 id="privacyContact" className="policy__h2">
            Contact
          </h2>
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