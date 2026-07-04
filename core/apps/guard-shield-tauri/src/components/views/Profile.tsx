import { User, Mail, ShieldCheck, Key, Settings, CreditCard } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { useUser, useClerk } from "@clerk/react";
import { usePermission } from "../../hooks/usePermission";

export default function Profile() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const { role } = usePermission();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      
      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <User className="size-8 text-primary" />
              My Profile
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings, credentials, and access keys.
            </p>
          </div>
          <Button onClick={() => openUserProfile()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Manage Account
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* User Info Card */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-24 bg-primary/10"></div>
              <div className="relative z-10 w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4 border-4 border-background shadow-lg overflow-hidden">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <User className="size-12 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-xl font-bold">{user?.fullName || "Guest User"}</h2>
              <p className="text-sm text-muted-foreground mb-4">{user?.primaryEmailAddress?.emailAddress || "No email"}</p>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                {role} Access
              </Badge>
              <Separator className="my-6" />
              <div className="w-full space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="size-4 mr-3" />
                  <span className="truncate">{user?.primaryEmailAddress?.emailAddress || "N/A"}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 mr-3" />
                  <span>2FA {user?.twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="size-5 text-primary" />
                <h3 className="font-semibold text-lg">Security & Authentication</h3>
              </div>
              <Separator className="mb-4" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed 3 months ago</p>
                  </div>
                  <Button variant="outline" size="sm">Change Password</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="size-5 text-primary" />
                <h3 className="font-semibold text-lg">Preferences</h3>
              </div>
              <Separator className="mb-4" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive security alerts and weekly reports</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20">Active</Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="size-5 text-primary" />
                <h3 className="font-semibold text-lg">Subscription</h3>
              </div>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Free Tier</p>
                  <p className="text-sm text-muted-foreground">Basic IDS/IPS features</p>
                </div>
                <Button variant="default" size="sm">Upgrade Plan</Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
