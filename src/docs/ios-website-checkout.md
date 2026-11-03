# iOS website checkout

Implemented November 3, 2026 in Yardit app 690f554506edf795e5d84121.

## Status
Web/backend implementation is present. Activation is deliberately OFF. No native binary was built, no App Store distribution setting was changed, and no physical iPhone/iPad or live Stripe payment was tested.

The Base44 source does not expose a native external-browser/return-link API. This code defines a **Yardit-owned native adapter contract**, not an existing Base44 API. Installing JavaScript alone cannot implement it. Confirm support with Base44 or maintain a native wrapper/build capable of implementing it.

## Payment paths covered
- Residential featured/premium listing creation and upgrades.
- Community event creation and paid packages.
- Event add-on purchases.
- Neighborhood sale card setup (later authorized automatic charges retain their existing backend lifecycle).
- Vendor subscriptions and tier purchases.
- Vendor event promotion extensions.
- Upgrade retry screens.

Free/demo actions use existing backend authorization. Web and Android retain their existing checkout destinations and completion flows. The promotion backend now checks purchaser ownership and calculates its existing $5/day price from saved upgrade days rather than caller-provided pricing.

## Activation requirements
1. Confirm App Store distribution is U.S.-only before setting IOS_US_ONLY_DISTRIBUTION_CONFIRMED=true. Do not infer App Store storefront from GPS, IP, language, SIM, or browser locale. A global launch needs a separate verified storefront/native eligibility design.
2. Implement the native adapter below in a new signed iOS binary.
3. Register and test an app-return link in that binary. Set IOS_CHECKOUT_RETURN_URL only to a working registered link: yardit://checkout-return or https://yardit.app/IosCheckoutPending. For the HTTPS option, the domain association and native associated-domain capability must both be configured and verified, including Safari's same-domain behavior.
4. Test every paid flow on physical supported devices using a test payment environment; keep STRIPE_SECRET_KEY on the backend.
5. Only after the above, set IOS_WEBSITE_CHECKOUT_ENABLED=true and publish the frontend. Existing backend functions/entities auto-sync from Base44 source. No CLI deploy is required.

Apple's U.S. storefront external-purchase-link exception is not a guarantee of review approval. Explain the U.S. scope and browser checkout clearly in App Review notes.
Reference: https://developer.apple.com/app-store/review/guidelines/#in-app-purchase

## Native adapter contract
Inject before the React application starts, only inside the installed iOS app:

```js
window.YarditNativeCheckout = {
  version: 1,
  platform: "ios",
  async openExternalBrowser(url) {
    // Native implementation, not JavaScript window.open:
    // validate https://yardit.app/IosWebsiteCheckout and ask iOS to open
    // the external default browser; resolve true only after the OS accepts it.
  }
};
```

The adapter must not open a WKWebView or embedded checkout. Handle the registered return link by navigating the existing authenticated app webview to /IosCheckoutPending. Preserve its cookies/storage. The link contains no login token and must never mark a payment successful.

Safari and PWA users remain website users. An unconfigured embedded iOS context is blocked from falling back to in-app Stripe. User-agent detection is only a defensive heuristic; it does not prove native capabilities or storefront eligibility.

## Flow and security
The authenticated app creates a private IosCheckoutHandoff record and its existing Stripe session. A hashed random token identifies the external website handoff, with a short lifetime and an allowlisted Stripe destination. The browser does not receive the app's login credentials or listing draft.

Before leaving, the app saves its original checkout context to the private handoff record. That snapshot becomes immutable. The browser completes Stripe checkout and returns to the configured app link, with a visible Return to Yardit fallback.

The app queries the backend using the original account and handoff id. The backend retrieves the exact Stripe session; URL flags and browser messages cannot grant benefits. Card setup requires a succeeded SetupIntent; vendor subscriptions/promotions also wait for the existing webhook. Existing listing fulfillment runs after verification.

Cancel first expires an open Stripe session. A payment that has already completed continues verification. Reopen uses the same session. Failed/late verification does not initiate another iOS upgrade payment. The existing fulfillment functions remain responsible for granting benefits and their transaction history.

A pending checkout survives ordinary app relaunches in local storage. Reinstallation/storage deletion and multi-device recovery are not end-to-end certified; the server retains the snapshot and existing listing payment recovery remains available. Do not promise cross-device automatic continuation.

## Verification
Run:
```sh
node --test src/lib/__tests__/iosWebsiteCheckout.test.js
npm run build
```

Tests use mocks; they do not prove native-browser opening, deep links, live Stripe behavior, or Apple review acceptance.

Physical-device release checks:
- Installed iPhone and iPad open the external browser; Safari/Android behavior stays unchanged.
- Successful payment, free benefits, subscriptions, card setup, upgrade/add-on, promotion, cancellation.
- Browser/app closed before and after payment; manual reopen and Return to Yardit fallback.
- Delayed webhook or lost connection cannot unlock benefits or charge again.
- Account switching cannot access another user's handoff.
- Draft, listing, event and vendor account match the original purchase.
- Stripe test-mode verification and webhook fulfillment for each product family.
