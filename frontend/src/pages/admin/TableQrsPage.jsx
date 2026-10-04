import React, { useState } from 'react';
import { Copy, ExternalLink, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const TableQrsPage = () => {
  const [copied, setCopied] = useState(null);
  const origin = window.location.origin;
  const tables = Array.from({ length: 50 }, (_, index) => index + 1);
  const copyLink = async (table) => {
    await navigator.clipboard.writeText(`${origin}/menu?table=${table}`);
    setCopied(table);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">Table QR codes</h1><p className="mt-1 text-sm text-gray-400">All 50 table ordering links in one place. Print or share the QR cards.</p></div><button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white print:hidden"><Printer size={16} /> Print QR cards</button></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5">
        {tables.map((table) => {
          const url = `${origin}/menu?table=${table}`;
          return <article key={table} className="rounded-xl border border-gray-800 bg-brand-card p-4 text-center print:border-gray-300 print:bg-white print:text-black"><p className="font-bold text-brand-accent print:text-black">TABLE {table}</p><div className="mx-auto my-3 h-32 w-32 bg-white p-1.5 flex items-center justify-center"><QRCodeCanvas value={url} size={116} level="M" aria-label={`QR code for table ${table}`} /></div><p className="break-all text-[10px] text-gray-500 print:text-gray-700">{url}</p><div className="mt-3 flex justify-center gap-2 print:hidden"><button onClick={() => copyLink(table)} className="rounded-md border border-gray-700 p-2 text-gray-300 hover:bg-gray-800" title="Copy link"><Copy size={15} /></button><a href={url} target="_blank" rel="noreferrer" className="rounded-md border border-gray-700 p-2 text-gray-300 hover:bg-gray-800" title="Open menu"><ExternalLink size={15} /></a></div>{copied === table && <p className="mt-2 text-xs text-green-400 print:hidden">Link copied</p>}</article>;
        })}
      </div>
    </div>
  );
};

export default TableQrsPage;
