'use client';

import Link from 'next/link';
import { MapPin, Phone, Mail, Linkedin, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-white">FastGross Pro</span>
              <span className="text-gray-500">× DISTRAM</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              La plateforme B2B intelligente pour grossistes alimentaires.
              6 IAs spécialisées pour optimiser votre activité.
            </p>
            <div className="flex gap-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold mb-4">Navigation</h4>
            <ul className="space-y-3">
              <li>
                <a href="#fonctionnalites" className="hover:text-white transition-colors">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#tarifs" className="hover:text-white transition-colors">
                  Tarifs
                </a>
              </li>
              <li>
                <a href="#roi" className="hover:text-white transition-colors">
                  Calculateur ROI
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-white transition-colors">
                  Demander une démo
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>
                  Zone Industrielle<br />
                  69000 Lyon
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange-500" />
                <span>04 XX XX XX XX</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-500" />
                <span>contact@distram.fr</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Dépôts */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <h4 className="text-white font-semibold mb-4">Nos dépôts</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-4">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                L
              </div>
              <div>
                <div className="text-white font-medium">Lyon</div>
                <div className="text-gray-400 text-sm">Siège social</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                M
              </div>
              <div>
                <div className="text-white font-medium">Montpellier</div>
                <div className="text-gray-400 text-sm">Dépôt Sud</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-4">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                B
              </div>
              <div>
                <div className="text-white font-medium">Bordeaux</div>
                <div className="text-gray-400 text-sm">Dépôt Ouest</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Face Media × DISTRAM. Tous droits réservés.
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
