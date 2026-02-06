import DeliveryDetailClient from './DeliveryDetailClient';

export function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];
}

export default function DeliveryDetailPage() {
  return <DeliveryDetailClient />;
}
