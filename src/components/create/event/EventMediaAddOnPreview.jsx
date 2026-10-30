import React from "react";
import EventExampleDetail from "@/components/create/event/EventExampleDetail";

export default function EventMediaAddOnPreview({ kind, data = {} }) {
  return <EventExampleDetail kind={kind} data={data} />;
}