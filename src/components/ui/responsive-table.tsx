import { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
  mobileView?: 'card' | 'scroll';
}

export function ResponsiveTable({ 
  headers, 
  rows, 
  className,
  mobileView = 'card' 
}: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table className={className}>
          <TableHeader>
            <TableRow>
              {headers.map((header, i) => (
                <TableHead key={i}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className={cn("md:hidden space-y-3", mobileView === 'scroll' && "overflow-x-auto")}>
        {rows.map((row, rowIndex) => (
          <Card key={rowIndex} className="hover-lift">
            <CardContent className="p-4 space-y-2">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="flex justify-between items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                    {headers[cellIndex]}:
                  </span>
                  <span className="text-sm text-foreground text-right flex-1">
                    {cell}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

