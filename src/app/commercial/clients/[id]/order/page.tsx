import QuickOrderClient from './QuickOrderClient';

export function generateStaticParams() {
  return [
    { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' },
    { id: 'client-1' }, { id: 'client-2' }, { id: 'client-3' },
  ];
}

export default function QuickOrderPage() {
  return <QuickOrderClient />;
}
