"use client";

import { use } from "react";
import { MemberDetail } from "@/components/shared/member-detail";

export default function DealerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MemberDetail id={id} apiBase="/api/dealers" backHref="/customers" label="Dealer" />;
}
