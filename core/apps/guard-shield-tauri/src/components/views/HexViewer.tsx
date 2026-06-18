import { useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface HexViewerProps {
  payloadHex: string;
}

export function HexViewer({ payloadHex }: HexViewerProps) {
  const lines = useMemo(() => {
    const result = [];
    // remove any spaces if they exist
    const cleanHex = payloadHex.replace(/\s+/g, '');
    
    for (let i = 0; i < cleanHex.length; i += 32) {
      // 16 bytes per line = 32 hex chars
      const chunk = cleanHex.substring(i, i + 32);
      
      const offset = (i / 2).toString(16).padStart(4, '0');
      
      const hexBytes = [];
      const asciiChars = [];
      
      for (let j = 0; j < chunk.length; j += 2) {
        const byteHex = chunk.substring(j, j + 2);
        hexBytes.push(byteHex);
        
        const byteVal = parseInt(byteHex, 16);
        // Printable ASCII is 32 to 126
        if (byteVal >= 32 && byteVal <= 126) {
          asciiChars.push(String.fromCharCode(byteVal));
        } else {
          asciiChars.push('.');
        }
      }
      
      // Pad out the rest of the line if it's less than 16 bytes
      while (hexBytes.length < 16) {
        hexBytes.push('  ');
      }
      
      result.push({
        offset,
        hexBytes,
        ascii: asciiChars.join(''),
      });
    }
    return result;
  }, [payloadHex]);

  if (!payloadHex) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground border rounded-md">
        No payload data available.
      </div>
    );
  }

  return (
    <div className="font-mono text-xs rounded-md border bg-muted/30 p-4">
      <ScrollArea className="h-[400px] pr-4">
        {lines.map((line, idx) => (
          <div key={idx} className="flex gap-4 hover:bg-muted/50 px-2 py-0.5 rounded transition-colors">
            {/* Offset column */}
            <div className="text-muted-foreground select-none w-12 shrink-0">
              {line.offset}
            </div>
            
            {/* Hex bytes column (8 bytes, space, 8 bytes) */}
            <div className="flex gap-2 w-[340px] shrink-0 text-foreground">
              <div className="flex gap-1.5 w-1/2">
                {line.hexBytes.slice(0, 8).map((h, i) => (
                  <span key={i} className="w-4 text-center inline-block">{h}</span>
                ))}
              </div>
              <div className="flex gap-1.5 w-1/2">
                {line.hexBytes.slice(8, 16).map((h, i) => (
                  <span key={i} className="w-4 text-center inline-block">{h}</span>
                ))}
              </div>
            </div>
            
            {/* ASCII column */}
            <div className="text-foreground tracking-widest break-all">
              {line.ascii}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
