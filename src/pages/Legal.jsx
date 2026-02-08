import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText, Shield, Building2, Zap, ArrowLeft, ChevronRight } from 'lucide-react'

const tabs = [
  { id: 'cgv', label: 'CGV', icon: FileText },
  { id: 'privacy', label: 'Confidentialité', icon: Shield },
  { id: 'mentions', label: 'Mentions légales', icon: Building2 },
]

export default function Legal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'cgv')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tabs.find((t) => t.id === tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  // Date fixe de dernière mise à jour (ne pas utiliser new Date() qui change à chaque visite)
  const lastUpdate = '5 février 2026'

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <span className="font-display font-bold text-white">Face Media</span>
            </Link>

            <Link to="/" className="btn-ghost text-sm flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="glass-card p-8 lg:p-12">
            {/* CGV */}
            {activeTab === 'cgv' && (
              <article className="prose prose-invert prose-sm max-w-none">
                <h1 className="text-3xl font-display font-bold text-white mb-2">
                  Conditions Générales de Vente
                </h1>
                <p className="text-dark-500 text-sm mb-8">Dernière mise à jour : {lastUpdate}</p>

                <h2>1. Objet</h2>
                <p>
                  Les présentes conditions générales de vente régissent l'utilisation du service
                  Face Media Factory, plateforme SaaS de prospection commerciale assistée par
                  intelligence artificielle.
                </p>

                <h2>2. Définitions</h2>
                <ul>
                  <li>
                    <strong>"Service"</strong> : la plateforme Face Media Factory accessible via
                    facemediafactory.com
                  </li>
                  <li>
                    <strong>"Utilisateur"</strong> : toute personne physique ou morale utilisant le
                    Service
                  </li>
                  <li>
                    <strong>"Abonnement"</strong> : formule d'accès au Service (Solo, Pro, Agency)
                  </li>
                </ul>

                <h2>3. Accès au Service</h2>
                <p>
                  L'accès au Service nécessite la création d'un compte et la souscription à un
                  Abonnement payant. Un essai gratuit de 14 jours est proposé pour le plan Pro.
                </p>

                <h2>4. Tarifs et paiement</h2>
                <p>
                  Les tarifs sont indiqués en euros TTC. Le paiement est effectué mensuellement par
                  carte bancaire via Stripe. Les factures sont disponibles dans l'espace client.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-2 text-dark-300">Plan</th>
                      <th className="text-right py-2 text-dark-300">Prix mensuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dark-800">
                      <td className="py-2">Solo</td>
                      <td className="text-right">79€ TTC</td>
                    </tr>
                    <tr className="border-b border-dark-800">
                      <td className="py-2">Pro</td>
                      <td className="text-right">199€ TTC</td>
                    </tr>
                    <tr>
                      <td className="py-2">Agency</td>
                      <td className="text-right">499€ TTC</td>
                    </tr>
                  </tbody>
                </table>

                <h2>5. Durée et résiliation</h2>
                <p>
                  Les Abonnements sont sans engagement. L'Utilisateur peut résilier à tout moment
                  depuis les paramètres de son compte. La résiliation prend effet à la fin de la
                  période en cours.
                </p>

                <h2>6. Utilisation acceptable</h2>
                <p>L'Utilisateur s'engage à :</p>
                <ul>
                  <li>Ne pas utiliser le Service pour envoyer des emails non sollicités (spam)</li>
                  <li>Respecter la réglementation applicable (RGPD, LCEN)</li>
                  <li>Ne pas tenter de contourner les limitations de son Abonnement</li>
                  <li>Ne pas utiliser le Service à des fins illégales ou frauduleuses</li>
                </ul>

                <h2>7. Propriété intellectuelle</h2>
                <p>
                  Le Service, son code, son design et son contenu sont la propriété exclusive de
                  Face Media Factory. L'Utilisateur conserve la propriété de ses données.
                </p>

                <h2>8. Limitation de responsabilité</h2>
                <p>
                  Face Media Factory ne saurait être tenu responsable des dommages indirects
                  résultant de l'utilisation du Service. La responsabilité totale est limitée au
                  montant des sommes versées au cours des 12 derniers mois.
                </p>

                <h2>9. Données personnelles</h2>
                <p>
                  Le traitement des données personnelles est décrit dans notre{' '}
                  <button
                    onClick={() => handleTabChange('privacy')}
                    className="text-brand-400 hover:underline"
                  >
                    Politique de Confidentialité
                  </button>
                  .
                </p>

                <h2>10. Droit applicable</h2>
                <p>
                  Les présentes CGV sont soumises au droit français. Tout litige sera porté devant
                  les tribunaux de Paris.
                </p>

                <h2>11. Contact</h2>
                <p>
                  Pour toute question :{' '}
                  <a
                    href="mailto:contact@facemediafactory.com"
                    className="text-brand-400 hover:underline"
                  >
                    contact@facemediafactory.com
                  </a>
                </p>
              </article>
            )}

            {/* Privacy Policy */}
            {activeTab === 'privacy' && (
              <article className="prose prose-invert prose-sm max-w-none">
                <h1 className="text-3xl font-display font-bold text-white mb-2">
                  Politique de Confidentialité
                </h1>
                <p className="text-dark-500 text-sm mb-8">Dernière mise à jour : {lastUpdate}</p>

                <h2>1. Responsable du traitement</h2>
                <p>
                  Face Media Factory
                  <br />
                  Email :{' '}
                  <a
                    href="mailto:contact@facemediafactory.com"
                    className="text-brand-400 hover:underline"
                  >
                    contact@facemediafactory.com
                  </a>
                </p>

                <h2>2. Données collectées</h2>

                <h3>Données de compte</h3>
                <ul>
                  <li>Nom, prénom, email</li>
                  <li>Nom de l'organisation</li>
                  <li>Informations de paiement (traitées par Stripe)</li>
                </ul>

                <h3>Données d'utilisation</h3>
                <ul>
                  <li>Logs de connexion</li>
                  <li>Actions effectuées dans l'application</li>
                  <li>Données de performance des campagnes</li>
                </ul>

                <h3>Données de prospection</h3>
                <ul>
                  <li>Informations sur vos clients (URL, analyses)</li>
                  <li>Leads importés</li>
                  <li>Emails générés et envoyés</li>
                </ul>

                <h2>3. Finalités du traitement</h2>
                <ul>
                  <li>Fourniture du Service</li>
                  <li>Amélioration du Service</li>
                  <li>Support client</li>
                  <li>Facturation</li>
                  <li>Communications relatives au Service</li>
                </ul>

                <h2>4. Base légale</h2>
                <ul>
                  <li>
                    <strong>Exécution du contrat</strong> : fourniture du Service
                  </li>
                  <li>
                    <strong>Intérêt légitime</strong> : amélioration, sécurité
                  </li>
                  <li>
                    <strong>Consentement</strong> : communications marketing
                  </li>
                </ul>

                <h2>5. Destinataires</h2>
                <p>Vos données peuvent être partagées avec :</p>
                <ul>
                  <li>
                    <strong>Firebase/Google</strong> : hebergement
                  </li>
                  <li>
                    <strong>Stripe</strong> : paiements
                  </li>
                  <li>
                    <strong>Amazon SES</strong> : envoi d'emails transactionnels
                  </li>
                  <li>
                    <strong>Saleshandy</strong> : prospection email
                  </li>
                  <li>
                    <strong>Anthropic</strong> : IA, pour l'analyse et la generation
                  </li>
                </ul>
                <p>Ces prestataires sont conformes au RGPD.</p>

                <h2>6. Transferts hors UE</h2>
                <p>
                  Certains prestataires sont basés aux États-Unis. Les transferts sont encadrés par
                  les Clauses Contractuelles Types de la Commission Européenne.
                </p>

                <h2>7. Durée de conservation</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-2 text-dark-300">Type de données</th>
                      <th className="text-right py-2 text-dark-300">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dark-800">
                      <td className="py-2">Données de compte</td>
                      <td className="text-right">Durée de l'abonnement + 3 ans</td>
                    </tr>
                    <tr className="border-b border-dark-800">
                      <td className="py-2">Données d'utilisation</td>
                      <td className="text-right">1 an</td>
                    </tr>
                    <tr>
                      <td className="py-2">Données de facturation</td>
                      <td className="text-right">10 ans (obligation légale)</td>
                    </tr>
                  </tbody>
                </table>

                <h2>8. Vos droits</h2>
                <p>Vous disposez des droits suivants :</p>
                <ul>
                  <li>Accès à vos données</li>
                  <li>Rectification</li>
                  <li>Effacement</li>
                  <li>Portabilité</li>
                  <li>Opposition</li>
                  <li>Limitation du traitement</li>
                </ul>
                <p>
                  Pour exercer ces droits :{' '}
                  <a
                    href="mailto:privacy@facemediafactory.com"
                    className="text-brand-400 hover:underline"
                  >
                    privacy@facemediafactory.com
                  </a>
                </p>

                <h2>9. Sécurité</h2>
                <p>Vos données sont :</p>
                <ul>
                  <li>Hébergées en Europe (Firebase EU)</li>
                  <li>Chiffrées au repos et en transit</li>
                  <li>Accessibles uniquement aux personnes autorisées</li>
                  <li>Sauvegardées quotidiennement</li>
                </ul>

                <h2>10. Cookies</h2>
                <p>
                  Nous utilisons des cookies essentiels au fonctionnement du Service. Aucun cookie
                  publicitaire n'est utilisé.
                </p>

                <h2>11. Modifications</h2>
                <p>
                  Cette politique peut être modifiée. Les utilisateurs seront informés par email en
                  cas de changement significatif.
                </p>
              </article>
            )}

            {/* Legal Mentions */}
            {activeTab === 'mentions' && (
              <article className="prose prose-invert prose-sm max-w-none">
                <h1 className="text-3xl font-display font-bold text-white mb-2">
                  Mentions Légales
                </h1>
                <p className="text-dark-500 text-sm mb-8">Dernière mise à jour : {lastUpdate}</p>

                <h2>Editeur</h2>
                <p>
                  <strong>Face Media Factory</strong>
                  <br />
                  Entreprise Individuelle
                  <br />
                  <br />
                  <strong>Editeur responsable :</strong> Faical Kriouar
                  <br />
                  <br />
                  <strong>Siege social :</strong>
                  <br />
                  Septemes-les-Vallons
                  <br />
                  13240 Bouches-du-Rhone
                  <br />
                  France
                  <br />
                  <br />
                  <strong>Contact :</strong>{' '}
                  <a
                    href="mailto:contact@facemediafactory.com"
                    className="text-brand-400 hover:underline"
                  >
                    contact@facemediafactory.com
                  </a>
                </p>

                <h2>Hébergement</h2>
                <p>
                  <strong>Google Firebase</strong>
                  <br />
                  Google Ireland Limited
                  <br />
                  Gordon House, Barrow Street
                  <br />
                  Dublin 4, Irlande
                  <br />
                  <br />
                  Le Service est hébergé sur des serveurs situés dans l'Union Européenne (région
                  europe-west1).
                </p>

                <h2>Propriété intellectuelle</h2>
                <p>
                  L'ensemble du contenu du site (textes, images, vidéos, logos, icônes, code source,
                  design, structure) est protégé par le droit de la propriété intellectuelle.
                </p>
                <p>
                  Toute reproduction, représentation, modification, publication, adaptation ou
                  diffusion, totale ou partielle, du contenu de ce site sans autorisation préalable
                  écrite est interdite.
                </p>

                <h2>Marques</h2>
                <p>
                  "Face Media Factory", le logo et les noms des fonctionnalités (Scanner, Forgeur,
                  Radar, Proof) sont des marques déposées ou en cours de dépôt.
                </p>

                <h2>Crédits</h2>
                <ul>
                  <li>
                    <strong>Design & Développement</strong> : Face Media Factory
                  </li>
                  <li>
                    <strong>Icônes</strong> : Lucide Icons (ISC License)
                  </li>
                  <li>
                    <strong>Polices</strong> : Google Fonts (Outfit, DM Sans, JetBrains Mono)
                  </li>
                  <li>
                    <strong>Framework CSS</strong> : Tailwind CSS
                  </li>
                  <li>
                    <strong>Framework JS</strong> : React
                  </li>
                </ul>

                <h2>Liens hypertextes</h2>
                <p>
                  Le site peut contenir des liens vers des sites tiers. Face Media Factory n'exerce
                  aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
                </p>

                <h2>Signalement</h2>
                <p>
                  Pour signaler un contenu illicite ou une violation de vos droits :{' '}
                  <a
                    href="mailto:legal@facemediafactory.com"
                    className="text-brand-400 hover:underline"
                  >
                    legal@facemediafactory.com
                  </a>
                </p>
              </article>
            )}
          </div>

          {/* Navigation between pages */}
          <div className="mt-8 flex flex-wrap gap-4">
            {tabs.map(
              (tab, index) =>
                tab.id !== activeTab && (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className="flex items-center gap-2 text-sm text-dark-400 hover:text-brand-400 transition-colors"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
