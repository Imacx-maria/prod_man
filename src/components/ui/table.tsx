import * as React from "react"

import { cn } from "@/utils/tailwind"

const Table = React.forwardRef<HTMLTableElement, React.ComponentPropsWithRef<'table'>>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    data-slot="table"
    className={cn(
      "w-full caption-bottom border border-border text-sm bg-background",
      className,
    )}
    {...props}
  />
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.ComponentPropsWithRef<'thead'>>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    data-slot="table-header"
    className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.ComponentPropsWithRef<'tbody'>>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    data-slot="table-body"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.ComponentPropsWithRef<'tfoot'>>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    data-slot="table-footer"
    className={cn(
      "border-t border-border bg-main font-base text-main-foreground last:[&>tr]:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentPropsWithRef<'tr'>>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    data-slot="table-row"
    className={cn(
      "border-b border-border transition-colors text-main-foreground dark:text-white font-base hover:bg-[oklch(84.08%_0.1725_84.2)] hover:!text-black focus:bg-[oklch(84.08%_0.1725_84.2)] focus:!text-black data-[state=selected]:bg-secondary-background data-[state=selected]:text-main-foreground",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ComponentPropsWithRef<'th'>>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    data-slot="table-head"
    className={cn(
      "h-12 px-4 text-left align-middle font-heading text-main-foreground [&:has([role=checkbox])]:pr-0 uppercase",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.ComponentPropsWithRef<'td'>>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    data-slot="table-cell"
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0 uppercase",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.ComponentPropsWithRef<'caption'>>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    data-slot="table-caption"
    className={cn("mt-4 text-sm text-foreground font-base", className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
