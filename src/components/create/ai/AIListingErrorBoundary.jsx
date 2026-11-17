import React from 'react';
import { Link } from 'react-router-dom';

// Isolated to Ask Yardit: a rendering problem must never strand a saved draft
// behind a completely blank screen. The draft itself remains on the server.
export default class AIListingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="space-y-4 rounded-xl border border-amber-300 bg-card p-5 text-card-foreground">
        <h2 className="text-lg font-semibold">We couldn't open this AI draft</h2>
        <p className="text-sm">Your previously saved draft is still stored in Yardit. Try reopening it, or go to your saved AI drafts.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => window.location.reload()}>Reload AI draft</button>
          <Link className="rounded-md border px-4 py-2" to="/CreateListingAI">My saved AI drafts</Link>
          <Link className="rounded-md border px-4 py-2" to="/CreateListing">Normal posting</Link>
        </div>
      </section>
    );
  }
}
