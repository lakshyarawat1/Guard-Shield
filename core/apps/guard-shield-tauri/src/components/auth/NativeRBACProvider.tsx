import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { createClerkSupabaseClient } from "../../lib/supabaseClient";
import { Role } from "../../types/permissions";

interface Organization {
  id: string;
  name: string;
  pricing_tier: string;
}

interface NativeRBACContextType {
  activeOrganization: Organization | null;
  role: Role;
  isLoading: boolean;
  setActiveOrganization: (orgId: string) => void;
  organizations: Organization[];
  refresh: () => Promise<void>;
}

const NativeRBACContext = createContext<NativeRBACContextType>({
  activeOrganization: null,
  role: "viewer",
  isLoading: true,
  setActiveOrganization: () => {},
  organizations: [],
  refresh: async () => {},
});

export function NativeRBACProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded: authLoaded, userId } = useAuth();
  const { user } = useUser();
  const [activeOrganization, setActiveOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [role, setRole] = useState<Role>("viewer");
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("No token");
      
      const supabase = createClerkSupabaseClient(token);
      
      // Sync user to Supabase
      if (user) {
        const userEmail = user.primaryEmailAddress?.emailAddress;
        
        await supabase.from("users").upsert({
          clerk_id: user.id,
          email: userEmail,
          full_name: user.fullName
        }).select();

        // Process any pending invitations for this email
        if (userEmail) {
          const { data: invites } = await supabase
            .from("pending_invitations")
            .select("id, org_id, role")
            .eq("email", userEmail);

          if (invites && invites.length > 0) {
            for (const invite of invites) {
              // Add user to the org
              await supabase.from("user_roles").insert({
                user_id: user.id,
                org_id: invite.org_id,
                role: invite.role
              });
              // Delete the invite
              await supabase.from("pending_invitations").delete().eq("id", invite.id);
            }
          }
        }
      }

      // Fetch organizations the user belongs to
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role, org_id, organizations(id, name, pricing_tier)")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      const orgs = (rolesData || []).map((r: any) => r.organizations).filter(Boolean);
      setOrganizations(orgs);

      // Restore active organization from localStorage or pick the first one
      const savedOrgId = localStorage.getItem("active_org_id");
      let currentActive = orgs.find((o: Organization) => o.id === savedOrgId) || orgs[0] || null;
      setActiveOrgState(currentActive);

      if (currentActive) {
        localStorage.setItem("active_org_id", currentActive.id);
        const currentRole = rolesData?.find((r) => r.org_id === currentActive.id)?.role as Role;
        setRole(currentRole || "viewer");
      } else {
        localStorage.removeItem("active_org_id");
        setRole("viewer");
      }
    } catch (err) {
      console.error("Failed to fetch RBAC data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoaded) {
      fetchOrganizations();
    }
  }, [authLoaded, userId, user]);

  const setActiveOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setActiveOrgState(org);
      localStorage.setItem("active_org_id", orgId);
      // We would normally refetch or recalculate role here
      fetchOrganizations();
    }
  };

  return (
    <NativeRBACContext.Provider value={{
      activeOrganization,
      role,
      isLoading: !authLoaded || isLoading,
      setActiveOrganization,
      organizations,
      refresh: fetchOrganizations
    }}>
      {children}
    </NativeRBACContext.Provider>
  );
}

export const useNativeRBAC = () => useContext(NativeRBACContext);
