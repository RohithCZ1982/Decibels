"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface HelpTicket {
  id: string;
  description: string;
  status: "NEW" | "FIXED" | "TESTED" | "CLOSED";
  createdBy: { name: string };
  createdAt: string;
}

const STATUS_ORDER: Record<string, number> = {
  NEW: 0,
  FIXED: 1,
  TESTED: 2,
  CLOSED: 3,
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  FIXED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  TESTED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const NEXT_STATUSES: Record<string, string[]> = {
  NEW: ["FIXED"],
  FIXED: ["TESTED"],
  TESTED: ["CLOSED"],
  CLOSED: [],
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HelpPage() {
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/help-tickets");
    if (res.ok) setTickets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = [...tickets].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please describe the issue or feature request");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/help-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description.trim() }),
    });
    if (res.ok) {
      toast.success("Submitted successfully");
      setDescription("");
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to submit");
    }
    setSubmitting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/help-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Marked as ${status}`);
      load();
    } else {
      toast.error("Failed to update status");
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm("Delete this ticket?")) return;
    const res = await fetch(`/api/help-tickets/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      load();
    } else {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Help</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Report issues or request feature changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue or feature change..."
            rows={4}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Requests ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {sorted.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-border bg-muted/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm whitespace-pre-wrap flex-1">
                      {ticket.description}
                    </p>
                    <Badge
                      variant="outline"
                      className={statusColors[ticket.status]}
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {ticket.createdBy.name} &bull;{" "}
                      {formatDate(ticket.createdAt)}
                    </p>
                    <div className="flex items-center gap-2">
                      {NEXT_STATUSES[ticket.status].map((next) => (
                        <Button
                          key={next}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => updateStatus(ticket.id, next)}
                        >
                          Mark {next}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => deleteTicket(ticket.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
