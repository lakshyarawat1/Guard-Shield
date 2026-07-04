import { Shield, Lock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";

export default function AccessControlPage() {
  const roles = [
    { name: "Owner", description: "Unrestricted access to all features.", badge: "default" },
    { name: "Admin", description: "Full operational access. Can manage settings and users.", badge: "destructive" },
    { name: "Analyst", description: "Can monitor traffic, investigate alerts, and manage rules.", badge: "secondary" },
    { name: "Viewer", description: "Read-only access to dashboards and logs.", badge: "outline" },
  ];

  return (
    <div className="p-8 h-full flex flex-col gap-8 bg-background">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="size-8 text-primary" />
          Access Control (IAM)
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Role-Based Access Control policies governing what users can see and do within the application.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => (
          <div key={role.name} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{role.name}</h3>
              <Badge variant={role.badge as any}>{role.name}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
          <Lock className="size-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Permission Matrix</h2>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">Permission Area</TableHead>
              {roles.map(r => <TableHead key={r.name} className="text-center">{r.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { area: "Dashboard & Analytics (View)", permissions: [true, true, true, true] },
              { area: "Live & Suspicious Traffic (View)", permissions: [true, true, true, true] },
              { area: "Packet Capture (Start/Stop)", permissions: [true, true, true, false] },
              { area: "IPS Rules (Create/Edit)", permissions: [true, true, true, false] },
              { area: "IPS Rules (Delete)", permissions: [true, true, false, false] },
              { area: "Alerts (Assign/Resolve/Comment)", permissions: [true, true, true, false] },
              { area: "IP Blocking (Block/Whitelist)", permissions: [true, true, true, false] },
              { area: "System Settings (Modify)", permissions: [true, true, false, false] },
              { area: "Database & Snapshots (Clear/Manage)", permissions: [true, true, false, false] },
              { area: "Team Management (View)", permissions: [true, true, false, false] },
              { area: "Team Management (Invite/Remove)", permissions: [true, true, false, false] },
              { area: "Access Control (Assign Roles)", permissions: [true, true, false, false] },
              { area: "Reports (Export)", permissions: [true, true, true, true] },
            ].map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-muted-foreground">{row.area}</TableCell>
                {row.permissions.map((hasPerm, j) => (
                  <TableCell key={j} className="text-center">
                    {hasPerm ? (
                      <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-green-500"></div></div>
                    ) : (
                      <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div></div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
