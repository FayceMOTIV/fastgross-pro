import OrderDetailClient from './OrderDetailClient';

export function generateStaticParams() {
  return [
    { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' },
    { id: 'cmd-1' }, { id: 'cmd-2' }, { id: 'CMD-2024-1089' },
  ];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}
