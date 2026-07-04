import { useEffect, useState } from "react";
import { Users, Mail, UserPlus } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useNativeRBAC } from "../auth/NativeRBACProvider";
import { createClerkSupabaseClient } from "../../lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Role } from "../../types/permissions";

interface TeamMember {
  user_id: string;
  role: Role;
  users: {
    email: string;
    full_name: string;
  };
}

interface PendingInvite {
  id: number;
  email: string;
  role: Role;
  created_at: string;
}

export default function TeamManagement() {
  const { getToken } = useAuth();
  const { activeOrganization, role: currentUserRole } = useNativeRBAC();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("analyst");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [activeOrganization]);

  const fetchMembers = async () => {
    if (!activeOrganization) return;
    try {
      setIsLoading(true);
      const token = await getToken({ template: "supabase" });
      if (!token) return;
      
      const supabase = createClerkSupabaseClient(token);
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, users(email, full_name)")
        .eq("org_id", activeOrganization.id);
        
      if (error) throw error;
      setMembers((data as any) || []);

      const { data: inviteData, error: inviteErr } = await supabase
        .from("pending_invitations")
        .select("*")
        .eq("org_id", activeOrganization.id);
      
      if (!inviteErr) setPendingInvites(inviteData || []);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    if (currentUserRole !== "admin") return;
    try {
      const token = await getToken({ template: "supabase" });
      if (!token) return;
      const supabase = createClerkSupabaseClient(token);
      
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId)
        .eq("org_id", activeOrganization?.id);
        
      if (error) throw error;
      toast.success("Role updated");
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || currentUserRole !== "admin") return;
    
    try {
      setIsInviting(true);
      const token = await getToken({ template: "supabase" });
      if (!token) return;
      const supabase = createClerkSupabaseClient(token);
      
      // Look up user by email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("clerk_id")
        .eq("email", inviteEmail.trim())
        .single();
        
      if (userError || !userData) {
        // User not in system, create pending invite
        const { error: pendingError } = await supabase
          .from("pending_invitations")
          .insert([{
            email: inviteEmail.trim(),
            org_id: activeOrganization?.id,
            role: inviteRole
          }]);
          
        if (pendingError) throw pendingError;
        toast.success("Invitation sent! They will join the team when they sign up.");
      } else {
        // User exists, add them directly
        const { error: inviteError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: userData.clerk_id,
            org_id: activeOrganization?.id,
            role: inviteRole
          }]);
          
        if (inviteError) throw inviteError;
        toast.success("User added to team");
      }
      
      setInviteEmail("");
      fetchMembers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add user");
    } finally {
      setIsInviting(false);
    }
  };

  if (!activeOrganization) return null;

  const isAdmin = currentUserRole === "admin";

  return (
    <div className="p-8 h-full flex flex-col gap-8 bg-background overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="size-8 text-primary" />
          Team Management - {activeOrganization.name}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Manage your organization's team members and configure roles securely.
        </p>
      </div>
      
      {isAdmin && (
        <div className="border bg-card rounded-xl p-6 shadow-sm max-w-4xl">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <UserPlus className="size-5 text-muted-foreground" />
            Add Team Member
          </h3>
          <form onSubmit={handleInvite} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email" 
                placeholder="colleague@example.com" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-[200px] space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? "Adding..." : "Add Member"}
            </Button>
          </form>
        </div>
      )}

      <div className="border bg-card rounded-xl shadow-sm max-w-4xl overflow-hidden">
        <div className="bg-muted px-6 py-4 font-semibold border-b">
          Active Members ({members.length})
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">Loading members...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map(member => (
                <tr key={member.user_id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {member.users.full_name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4" />
                      {member.users.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      member.role === 'admin' ? 'bg-primary/20 text-primary' :
                      member.role === 'analyst' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-zinc-500/20 text-zinc-500'
                    }`}>
                      {member.role.toUpperCase()}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <Select 
                        value={member.role} 
                        onValueChange={(val) => handleUpdateRole(member.user_id, val as Role)}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <div className="border bg-card rounded-xl shadow-sm max-w-4xl overflow-hidden mt-2 opacity-80">
          <div className="bg-muted px-6 py-4 font-semibold border-b">
            Pending Invitations ({pendingInvites.length})
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Invited On</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingInvites.map(invite => (
                <tr key={invite.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4" />
                      {invite.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-zinc-500/20 text-zinc-500">
                      {invite.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(invite.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
