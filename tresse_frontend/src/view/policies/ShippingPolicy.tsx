import "../../../styles/Policy.css";

export default function ShippingPolicy() {
  return (
    <section className="policy" aria-labelledby="policyTitle">
      {/* 
        Content wrapper exists for consistent max-width + left alignment.
        Avoid styling h1/p globally — policy pages are intentionally scoped.
      */}
      <div className="policy__content">
        <header className="policy__header">
          <h1 id="policyTitle" className="policy__title">
            Shipping Policy
          </h1>
        </header>

        <section className="policy__section" aria-labelledby="worldwide">
          <h2 id="worldwide" className="policy__h2">
            Worldwide shipping
          </h2>
          <p className="policy__text">
            We offer worldwide shipping. Shipping is not free and is calculated
            based on your destination and order details.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="production">
          <h2 id="production" className="policy__h2">
            Production time
          </h2>
          <p className="policy__text">
            All items are handmade and made to order. Production begins after
            you place an order. Shipping time does not include production time.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="tracking">
          <h2 id="tracking" className="policy__h2">
            Tracking
          </h2>
          <p className="policy__text">
            When your order is dispatched, you will receive tracking information
            by email (when available).
          </p>
        </section>

        <section className="policy__section" aria-labelledby="customs">
          <h2 id="customs" className="policy__h2">
            Customs &amp; import fees
          </h2>
          <p className="policy__text">
            International orders may be subject to customs duties and taxes.
            These charges are the responsibility of the customer.
          </p>
        </section>

        <section className="policy__section" aria-labelledby="address">
          <h2 id="address" className="policy__h2">
            Address responsibility
          </h2>
          <p className="policy__text">
            Please make sure your shipping address is correct. We are not
            responsible for delays, returns, or losses caused by incorrect
            address information or refused/unclaimed deliveries.
          </p>
        </section>
      </div>
    </section>
  );
}