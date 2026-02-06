import LandingPageClient from './LandingPageClient';

export function generateStaticParams() {
  return [
    { slug: 'offre-decouverte' },
    { slug: 'special-kebab' },
    { slug: 'parrainage' },
    { slug: 'salon-restauration' },
  ];
}

export default function LandingPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <LandingPageClient params={params} />;
}
