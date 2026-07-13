export enum Permission {
  // Dashboard & Monitoring (read)
  DASHBOARD_VIEW = "dashboard:view",
  LIVE_TRAFFIC_VIEW = "live_traffic:view",
  SUSPICIOUS_VIEW = "suspicious:view",
  GLOBAL_MAP_VIEW = "global_map:view",
  EVENT_TIMELINE_VIEW = "event_timeline:view",
  SYSTEM_HEALTH_VIEW = "system_health:view",
  AUDIT_LOGS_VIEW = "audit_logs:view",
  THREAT_FEED_VIEW = "threat_feed:view",

  // Capture & Analysis (write)
  CAPTURE_START = "capture:start",
  CAPTURE_STOP = "capture:stop",

  // Rule & Policy Management
  RULES_VIEW = "rules:view",
  RULES_CREATE = "rules:create",
  RULES_EDIT = "rules:edit",
  RULES_DELETE = "rules:delete",

  // IP Management
  IP_BLOCK = "ip:block",
  IP_UNBLOCK = "ip:unblock",
  IP_WHITELIST = "ip:whitelist",

  // Alert Coordination
  ALERT_ASSIGN = "alert:assign",
  ALERT_COMMENT = "alert:comment",
  ALERT_RESOLVE = "alert:resolve",

  // Settings
  SETTINGS_VIEW = "settings:view",
  SETTINGS_MODIFY = "settings:modify",
  DATABASE_CLEAR = "database:clear",
  SNAPSHOT_MANAGE = "snapshot:manage",

  // Team & User Management
  USERS_VIEW = "users:view",
  USERS_INVITE = "users:invite",
  USERS_REMOVE = "users:remove",
  ROLES_ASSIGN = "roles:assign",
  TEAMS_MANAGE = "teams:manage",

  // Reports
  REPORTS_GENERATE = "reports:generate",
  REPORTS_EXPORT = "reports:export",
}

export type Role = "owner" | "admin" | "analyst" | "viewer";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: Object.values(Permission), // Owner gets everything
  admin: [
    Permission.DASHBOARD_VIEW,
    Permission.LIVE_TRAFFIC_VIEW,
    Permission.SUSPICIOUS_VIEW,
    Permission.GLOBAL_MAP_VIEW,
    Permission.EVENT_TIMELINE_VIEW,
    Permission.SYSTEM_HEALTH_VIEW,
    Permission.AUDIT_LOGS_VIEW,
    Permission.THREAT_FEED_VIEW,
    Permission.CAPTURE_START,
    Permission.CAPTURE_STOP,
    Permission.RULES_VIEW,
    Permission.RULES_CREATE,
    Permission.RULES_EDIT,
    Permission.RULES_DELETE,
    Permission.IP_BLOCK,
    Permission.IP_UNBLOCK,
    Permission.IP_WHITELIST,
    Permission.ALERT_ASSIGN,
    Permission.ALERT_COMMENT,
    Permission.ALERT_RESOLVE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_MODIFY,
    Permission.DATABASE_CLEAR,
    Permission.SNAPSHOT_MANAGE,
    Permission.USERS_VIEW,
    Permission.USERS_INVITE,
    Permission.ROLES_ASSIGN,
    Permission.TEAMS_MANAGE,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_EXPORT,
  ],
  analyst: [
    Permission.DASHBOARD_VIEW,
    Permission.LIVE_TRAFFIC_VIEW,
    Permission.SUSPICIOUS_VIEW,
    Permission.GLOBAL_MAP_VIEW,
    Permission.EVENT_TIMELINE_VIEW,
    Permission.SYSTEM_HEALTH_VIEW,
    Permission.AUDIT_LOGS_VIEW,
    Permission.THREAT_FEED_VIEW,
    Permission.CAPTURE_START,
    Permission.CAPTURE_STOP,
    Permission.RULES_VIEW,
    Permission.RULES_CREATE,
    Permission.RULES_EDIT,
    Permission.IP_BLOCK,
    Permission.IP_WHITELIST,
    Permission.ALERT_ASSIGN,
    Permission.ALERT_COMMENT,
    Permission.ALERT_RESOLVE,
    Permission.SETTINGS_VIEW,
    Permission.REPORTS_GENERATE,
    Permission.REPORTS_EXPORT,
  ],
  viewer: [
    Permission.DASHBOARD_VIEW,
    Permission.LIVE_TRAFFIC_VIEW,
    Permission.SUSPICIOUS_VIEW,
    Permission.GLOBAL_MAP_VIEW,
    Permission.EVENT_TIMELINE_VIEW,
    Permission.SYSTEM_HEALTH_VIEW,
    Permission.AUDIT_LOGS_VIEW,
    Permission.THREAT_FEED_VIEW,
    Permission.RULES_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
};
