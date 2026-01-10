import "../../../styles/Policy.css";

export default function TermsOfService() {
  return (
    <section className="policy" aria-labelledby="policyTitle">
      <header className="policy__header">
        <h1 id="policyTitle" className="policy__title">
          Terms of Service
        </h1>

      </header>

      <section className="policy__section" aria-labelledby="intro">
        <h2 id="intro" className="policy__h2">Introduction</h2>
        <p className="policy__text">
          These Terms of Service (“Terms”) govern your access to and use of the website{" "}
          <span className="policy__mono">tressehandmade.com</span> (the “Site”), including browsing,
          creating an account, and purchasing products.
        </p>
        <p className="policy__text">
          By accessing or using the Site, you agree to these Terms. If you do not agree, please do not use the Site.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="changes">
        <h2 id="changes" className="policy__h2">Changes to these Terms</h2>
        <p className="policy__text">
          We may update these Terms from time to time to reflect changes to the Site, our services, or legal requirements.
          Your continued use of the Site after changes means you accept the updated Terms.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="products">
        <h2 id="products" className="policy__h2">Product information</h2>
        <p className="policy__text">
          We aim to provide accurate product descriptions, pricing, and availability. However, errors can happen.
          We reserve the right to correct errors and update information at any time.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="orders">
        <h2 id="orders" className="policy__h2">Orders and payments</h2>
        <p className="policy__text">
          When you place an order, you confirm that the information you provide is accurate and that you are authorized
          to use the selected payment method.
        </p>
        <p className="policy__text">
          We reserve the right to refuse or cancel an order in cases of suspected fraud, incorrect pricing, or other
          legitimate reasons.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="shipping">
        <h2 id="shipping" className="policy__h2">Shipping</h2>
        <p className="policy__text">
          Shipping terms (processing times, delivery estimates, tracking availability, and regional restrictions)
          are published on the Shipping Policy page.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="returns">
        <h2 id="returns" className="policy__h2">Returns</h2>
        <p className="policy__text">
          Return rules are published on the Return Policy page. If you have an issue with an order, contact support and
          we will help.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="ip">
        <h2 id="ip" className="policy__h2">Intellectual property</h2>
        <p className="policy__text">
          All content on the Site (including logos, images, product photos, designs, and text) is owned by TRESSE or used
          with permission and is protected by applicable intellectual property laws.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="user">
        <h2 id="user" className="policy__h2">User obligations</h2>
        <p className="policy__text">
          You agree not to misuse the Site, including attempting unauthorized access, introducing malware, scraping,
          or violating applicable laws.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="liability">
        <h2 id="liability" className="policy__h2">Limitation of liability</h2>
        <p className="policy__text">
          The Site is provided “as is”. To the maximum extent permitted by law, we are not liable for indirect or
          consequential damages arising from the use of the Site or products.
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