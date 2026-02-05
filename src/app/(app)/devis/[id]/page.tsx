import DevisEditorClient from './DevisEditorClient';

// generateStaticParams for static export - pre-render the "nouveau" path
export function generateStaticParams() {
  return [
    { id: 'nouveau' },
  ];
}

export default async function DevisEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DevisEditorClient devisId={id} />;
}
