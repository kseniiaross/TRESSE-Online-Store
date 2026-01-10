import "../../../styles/Policy.css";

export default function ReturnPolicy() {
  return (
    <section className="policy" aria-labelledby="policyTitle">
      <header className="policy__header">
        <h1 id="policyTitle" className="policy__title">
          Return Policy
        </h1>
      </header>

      <section className="policy__section" aria-labelledby="overview">
        <h2 id="overview" className="policy__h2">Overview</h2>
        <p className="policy__text">
          TRESSE is a handmade brand. Each item is carefully crafted, often made to order, and requires significant time
          and materials to produce.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="made-to-order">
        <h2 id="made-to-order" className="policy__h2">Made-to-order items</h2>
        <p className="policy__text">
          Due to the made-to-order nature of our products, we do not accept returns or refunds for items once production
          has begun or the order has been completed.
        </p>
        <p className="policy__text">
          This policy exists because handmade items cannot be resold or restocked once returned.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="nonreturnable">
        <h2 id="nonreturnable" className="policy__h2">Non-returnable items</h2>
        <p className="policy__text">The following items are not eligible for return or exchange:</p>
        <ul className="policy__text">
          <li>Made-to-order or personalized items</li>
          <li>Swimwear and intimate apparel, for hygiene reasons</li>
          <li>Items purchased during final sale</li>
        </ul>
      </section>

      <section className="policy__section" aria-labelledby="damaged">
        <h2 id="damaged" className="policy__h2">Incorrect or damaged items</h2>
        <p className="policy__text">
          If you receive an incorrect or damaged item, please contact us within 48 hours of delivery. We will review the
          issue and offer a replacement or solution where appropriate.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="shipping-customs">
        <h2 id="shipping-customs" className="policy__h2">Shipping &amp; customs</h2>
        <p className="policy__text">
          Customers are responsible for providing a correct shipping address and for any customs duties or import taxes.
          Shipping costs are non-refundable.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="lost">
        <h2 id="lost" className="policy__h2">Lost parcels</h2>
        <p className="policy__text">
          If a parcel is confirmed lost by the courier, we will work with the shipping provider to resolve the issue and
          may offer a replacement.
        </p>
      </section>

      <section className="policy__section" aria-labelledby="questions">
        <h2 id="questions" className="policy__h2">Questions</h2>
        <p className="policy__text">
          If you have any questions before placing an order, we strongly encourage you to contact us. We are always happy
          to help.
        </p>
        <p className="policy__text">
          Email:{" "}
          <a href="mailto:support@tresseknitting.com">support@tresseknitting.com</a>
        </p>
      </section>
    </section>
  );
}