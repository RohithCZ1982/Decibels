"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberManager } from "@/components/shared/member-manager";
import { Users, Handshake } from "lucide-react";

export default function MembersPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage customers and dealers</p>
      </div>

      <Tabs defaultValue="customers">
        <TabsList className="grid grid-cols-2 w-[280px]">
          <TabsTrigger value="customers" className="w-full"><Users className="w-4 h-4 mr-1.5" /> Customers</TabsTrigger>
          <TabsTrigger value="dealer" className="w-full"><Handshake className="w-4 h-4 mr-1.5" /> Dealer</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          <MemberManager apiBase="/api/customers" listKey="customers" detailBase="/customers" label="Customer" icon={Users} />
        </TabsContent>

        <TabsContent value="dealer" className="mt-4">
          <MemberManager apiBase="/api/dealers" listKey="dealers" detailBase="/dealers" label="Dealer" icon={Handshake} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
