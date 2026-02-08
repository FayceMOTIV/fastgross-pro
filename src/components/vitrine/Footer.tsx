'use client';

import Link from 'next/link';
import { MapPin, Phone, Mail, Linkedin, Twitter } from 'lucide-react';
import { DISTRAM_COLORS, DISTRAM_INFO, FACE_MEDIA_INFO } from '@/lib/theme-distram';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
                style={{ background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)` }}
              >
                D
              </div>
              <div>
                <span className="text-2xl font-bold text-white">{DISTRAM_INFO.name}</span>
                <div className="text-sm text-gray-400">{DISTRAM_INFO.slogan}</div>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Le partenaire de confiance de +{DISTRAM_INFO.clients} restaurants en France.
              Distribution halal certifiée, qualité irréprochable, technologie de pointe.
            </p>
            <div className="flex gap-3 mb-4">
              {DISTRAM_INFO.certifications.map((cert, i) => (
                <span key={i} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                  {cert}
                </span>
              ))}
            </div>
            <div className="flex gap-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#F5A623] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#F5A623] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li>
                <a href="#expertise" className="hover:text-[#F5A623] transition-colors">
                  Notre expertise
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-[#F5A623] transition-colors">
                  Solutions
                </a>
              </li>
              <li>
                <a href="#ia" className="hover:text-[#F5A623] transition-colors">
                  IA DISTRAM
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-[#F5A623] transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/app" className="hover:text-[#F5A623] transition-colors">
                  Plateforme
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
                <span>
                  Zone Industrielle<br />
                  69000 Lyon
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#F5A623]" />
                <a href={`tel:${DISTRAM_INFO.phone.replace(/\s/g, '')}`} className="hover:text-[#F5A623] transition-colors">
                  {DISTRAM_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#F5A623]" />
                <a href={`mailto:${DISTRAM_INFO.email}`} className="hover:text-[#F5A623] transition-colors">
                  {DISTRAM_INFO.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Dépôts */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <h4 className="text-white font-semibold mb-4">Nos dépôts</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {DISTRAM_INFO.depots.map((depot, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)` }}
                >
                  {depot[0]}
                </div>
                <div>
                  <div className="text-white font-medium">{depot}</div>
                  <div className="text-gray-400 text-sm">
                    {i === 0 ? 'Siège social' : i === 1 ? 'Dépôt Sud' : 'Dépôt Ouest'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {DISTRAM_INFO.name}. Tous droits réservés.
          </p>
          <p className="text-gray-600 text-xs">
            {FACE_MEDIA_INFO.role} <span className="text-gray-500">{FACE_MEDIA_INFO.name}</span>
          </p>
          <div className="flex gap-6 text-sm">
            <span className="text-gray-500 cursor-default">
              Mentions légales
            </span>
            <span className="text-gray-500 cursor-default">
              CGV
            </span>
            <span className="text-gray-500 cursor-default">
              Politique de confidentialité
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
