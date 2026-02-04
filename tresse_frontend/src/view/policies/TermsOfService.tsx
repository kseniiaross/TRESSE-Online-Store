import "../../../styles/Policy.css";

export default function TermsOfService() {
  return (
    <section className="policy" aria-labelledby="termsTitle">
      <header className="policy__header">
        <h1 id="termsTitle" className="policy__title">
          Terms of Service
        </h1>
      </header>

      <section className="policy__section" aria-labelledby="termsIntro">
        <h2 id="termsIntro" className="policy__h2">Introduction</h2>
        <p className="policy__text">
          These Terms of Service (“Terms”) govern your access to and use of the website{" "}
          <span className="policy__mono">tressehandmade.com</span> (the “Site”), including browsing,
          creating an account, and purchasing products.
        </p>
        <p className="policy__text">
          By accessing or using the Site, you agree to these Terms. If you do not agree, please do not use the Site.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsChanges">
        <h2 id="termsChanges" className="policy__h2">Changes to these Terms</h2>
        <p className="policy__text">
          We may update these Terms from time to time to reflect changes to the Site, our services, or legal requirements.
          Your continued use of the Site after changes means you accept the updated Terms.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsProducts">
        <h2 id="termsProducts" className="policy__h2">Product information</h2>
        <p className="policy__text">
          We aim to provide accurate product descriptions, pricing, and availability. However, errors can happen.
          We reserve the right to correct errors and update information at any time.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsOrders">
        <h2 id="termsOrders" className="policy__h2">Orders and payments</h2>
        <p className="policy__text">
          When you place an order, you confirm that the information you provide is accurate and that you are authorized
          to use the selected payment method.
        </p>
        <p className="policy__text">
          We reserve the right to refuse or cancel an order in cases of suspected fraud, incorrect pricing, or other
          legitimate reasons.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsShipping">
        <h2 id="termsShipping" className="policy__h2">Shipping</h2>
        <p className="policy__text">
          Shipping terms (processing times, delivery estimates, tracking availability, and regional restrictions)
          are published on the Shipping Policy page.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsReturns">
        <h2 id="termsReturns" className="policy__h2">Returns</h2>
        <p className="policy__text">
          Return rules are published on the Return Policy page. If you have an issue with an order, contact support and
          we will help.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsIP">
        <h2 id="termsIP" className="policy__h2">Intellectual property</h2>
        <p className="policy__text">
          All content on the Site (including logos, images, product photos, designs, and text) is owned by TRESSE or used
          with permission and is protected by applicable intellectual property laws.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsUser">
        <h2 id="termsUser" className="policy__h2">User obligations</h2>
        <p className="policy__text">
          You agree not to misuse the Site, including attempting unauthorized access, introducing malware, scraping,
          or violating applicable laws.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsLiability">
        <h2 id="termsLiability" className="policy__h2">Limitation of liability</h2>
        <p className="policy__text">
          The Site is provided “as is”. To the maximum extent permitted by law, we are not liable for indirect or
          consequential damages arising from the use of the Site or products.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="termsContact">
        <h2 id="termsContact" className="policy__h2">Contact</h2>
        <p className="policy__text">
          Email:{" "}
          <a href="mailto:support@tresseknitting.com">support@tresseknitting.com</a>
        </p>
      </section>
    </section>
  );
}