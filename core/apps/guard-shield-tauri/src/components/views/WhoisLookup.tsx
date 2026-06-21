import { Search, Globe, Server, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

export default function WhoisLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResult(null);

    // Mock network request delay
    setTimeout(() => {
      const mockResult = `Domain Name: ${query.toUpperCase()}
Registry Domain ID: 2138514_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.markmonitor.com
Registrar URL: http://www.markmonitor.com
Updated Date: 2024-08-14T09:12:34Z
Creation Date: 1997-09-15T04:00:00Z
Registry Expiry Date: 2028-09-14T04:00:00Z
Registrar: MarkMonitor Inc.
Registrar IANA ID: 292
Registrar Abuse Contact Email: abusecomplaints@markmonitor.com
Registrar Abuse Contact Phone: +1.2083895740
Domain Status: clientDeleteProhibited https://icann.org/epp#clientDeleteProhibited
Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
Domain Status: clientUpdateProhibited https://icann.org/epp#clientUpdateProhibited
Domain Status: serverDeleteProhibited https://icann.org/epp#serverDeleteProhibited
Domain Status: serverTransferProhibited https://icann.org/epp#serverTransferProhibited
Domain Status: serverUpdateProhibited https://icann.org/epp#serverUpdateProhibited
Name Server: NS1.GOOGLE.COM
Name Server: NS2.GOOGLE.COM
Name Server: NS3.GOOGLE.COM
Name Server: NS4.GOOGLE.COM
DNSSEC: unsigned
URL of the ICANN Whois Inaccuracy Complaint Form: https://www.icann.org/wicf/
>>> Last update of whois database: 2026-06-21T11:15:00Z <<<`;

      setResult(mockResult);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-4rem)]">
        
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Globe className="size-8 text-primary" />
            Whois Lookup
          </h1>
          <p className="text-muted-foreground mt-2">
            Query domain registries and IP allocation blocks for registration and contact details.
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input 
              className="pl-10 h-12 text-lg bg-card"
              placeholder="Enter domain name or IP address (e.g. google.com or 8.8.8.8)" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              autoFocus
            />
          </div>
          <Button 
            className="h-12 px-8 text-md font-semibold" 
            onClick={handleLookup}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? "Querying..." : "Lookup"}
          </Button>
        </div>

        <div className="flex-1 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Server className="size-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Query Results</h3>
            {result && (
              <Badge variant="outline" className="ml-auto font-mono text-xs">
                {query}
              </Badge>
            )}
          </div>
          
          <ScrollArea className="flex-1 p-0">
            {result ? (
              <div className="p-6">
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all text-muted-foreground">
                  {result}
                </pre>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-50 p-8 text-center">
                <FileText className="size-16 mb-4" />
                <p className="text-lg font-medium">No results to display</p>
                <p className="text-sm">Enter a query above to fetch Whois records.</p>
              </div>
            )}
          </ScrollArea>
        </div>

      </div>
    </div>
  );
}

// Needed because Badge was used but not imported
import { Badge } from "../ui/badge";
