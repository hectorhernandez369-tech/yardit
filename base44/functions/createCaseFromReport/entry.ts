import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function buildAccountNumber(listing) {
  if (listing?.listingNumber) return listing.listingNumber;
  const st = (listing?.state || 'XX').toUpperCase().slice(0, 2);
  const zp = String(listing?.zip || '0000').slice(-4).padStart(4, '0');
  const idSuffix = String(listing?.id || '00000').slice(-5).toLowerCase();
  return `${st}${zp}-${idSuffix}`;
}

function normalizeReportRecord(report) {
  if (!report) return null;
  return report.data ? { id: report.id, ...report.data } : report;
}

async function ensureCaseForReport(base44, rawReport) {
  const report = normalizeReportRecord(rawReport);
  const listingId = report?.listingId || report?.listing_id;

  if (!listingId) {
    return { created: false, skipped: 'missing_listing_id' };
  }

  const existingCases = await base44.asServiceRole.entities.Case.filter({ listing_id: listingId });
  const activeCase = existingCases.find((item) => item.status !== 'closed');

  if (activeCase) {
    return { created: false, skipped: 'active_case_exists', caseId: activeCase.id, listingId };
  }

  const listings = await base44.asServiceRole.entities.Listing.filter({ id: listingId });
  const listing = listings[0];

  if (!listing) {
    return { created: false, skipped: 'listing_not_found', listingId };
  }

  const reasonCode = String(report?.reason_code || '');
  const safetyFlag = reasonCode.startsWith('SAFETY_');

  const createdCase = await base44.asServiceRole.entities.Case.create({
    listing_id: listingId,
    account_number: buildAccountNumber(listing),
    status: 'in_queue',
    case_priority: safetyFlag ? 'high' : 'medium',
    safety_flag: safetyFlag,
  });

  return { created: true, caseId: createdCase.id, listingId };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let payload = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    let reportsToProcess = [];

    if (payload?.event?.entity_name === 'Report' && payload?.event?.type === 'create') {
      let report = payload?.data;

      if ((!report || payload?.payload_too_large) && payload?.event?.entity_id) {
        const reports = await base44.asServiceRole.entities.Report.filter({ id: payload.event.entity_id });
        report = reports[0];
      }

      if (report) {
        reportsToProcess = [report];
      }
    } else {
      const reports = await base44.asServiceRole.entities.Report.list('-created_date', 100);
      const unresolvedReports = reports
        .map(normalizeReportRecord)
        .filter((report) => report && report.resolved !== true);

      const latestUnqueuedByListing = new Map();
      unresolvedReports.forEach((report) => {
        const listingId = report?.listingId || report?.listing_id;
        if (listingId && !latestUnqueuedByListing.has(listingId)) {
          latestUnqueuedByListing.set(listingId, report);
        }
      });

      reportsToProcess = [...latestUnqueuedByListing.values()];
    }

    const results = [];
    for (const report of reportsToProcess) {
      results.push(await ensureCaseForReport(base44, report));
    }

    return Response.json({ success: true, processed: reportsToProcess.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});