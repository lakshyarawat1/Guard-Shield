import { useState } from "react";
import { ShieldCheck, Plus } from "lucide-react";
import { useUser, useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { useNativeRBAC } from "../../components/auth/NativeRBACProvider";
import { createClerkSupabaseClient } from "../../lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function OrgSelectPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { organizations, setActiveOrganization, refresh } = useNativeRBAC();
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setIsCreating(true);
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("No token");
      
      const supabase = createClerkSupabaseClient(token);
      
      // Insert the organization (RLS automatically sets owner_id via trigger or default policy)
      // Since our RLS policy requires owner_id = auth.jwt()->>'sub', we must provide it.
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert([{ name: newOrgName, owner_id: user?.id }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Insert the user_role as 'admin'
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: user?.id, org_id: orgData.id, role: "admin" }]);

      if (roleError) throw roleError;

      toast.success("Organization created successfully");
      await refresh();
      setActiveOrganization(orgData.id);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create organization");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectOrg = (orgId: string) => {
    setActiveOrganization(orgId);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex items-center justify-between px-8 py-4 border-b">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Guard Shield</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Signed in as <span className="font-semibold text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-16 px-4">
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Guard Shield</h1>
          <p className="text-muted-foreground">
            Select your organization or create a new one to start monitoring your infrastructure.
          </p>
        </div>

        <div className="w-full max-w-md space-y-6">
          {organizations.length > 0 && (
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="bg-muted px-4 py-3 font-semibold text-sm">Your Organizations</div>
              <div className="divide-y">
                {organizations.map(org => (
                  <div key={org.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{org.pricing_tier} Tier</div>
                    </div>
                    <Button onClick={() => handleSelectOrg(org.id)} variant="secondary" size="sm">
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border rounded-xl bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-4 text-lg">Create New Organization</h3>
            <form onSubmit={handleCreateOrg} className="flex gap-2">
              <Input
                placeholder="Organization Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={isCreating}
              />
              <Button type="submit" disabled={isCreating || !newOrgName.trim()}>
                {isCreating ? "Creating..." : <><Plus className="size-4 mr-1" /> Create</>}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
