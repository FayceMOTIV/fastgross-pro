import InvoiceDetailClient from './InvoiceDetailClient';

export function generateStaticParams() {
  return [
    { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' },
    { id: 'fac-1' }, { id: 'F-2024-0892' },
  ];
}

export default function InvoiceDetailPage() {
  return <InvoiceDetailClient />;
}
