"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Phone, Mail, Globe, Star,
  Upload, Download, CheckCircle2,
  Building2, Sparkles, ExternalLink,
  ChevronDown, X, Loader2, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PhonePreviewButton } from "@/components/ui/phone-preview";
import {
  searchGoogleMaps,
  searchAnnuaire,
  enrichProspectData,
  importFromCSV,
  RESTAURANT_TYPES,
  MAJOR_CITIES,
  type ScrapedProspect,
} from "@/services/prospecting-service";

// Quality score badge
function QualityBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (score >= 40) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getColor())}>
      {score}%
    </span>
  );
}

// Prospect card for mobile view
function ProspectCard({
  prospect,
  onEnrich,
  onSelect,
  isSelected,
  isEnriching,
}: {
  prospect: ScrapedProspect;
  onEnrich: () => void;
  onSelect: () => void;
  isSelected: boolean;
  isEnriching: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 border rounded-xl transition-all",
        isSelected ? "border-primary-500 bg-primary-50" : "border-border hover:border-primary-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{prospect.name}</h3>
            <QualityBadge score={prospect.qualityScore || 0} />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Badge variant="secondary" className="text-xs">
              {prospect.type}
            </Badge>
            <span className="text-xs">{prospect.source}</span>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{prospect.address}</span>
            </div>

            {prospect.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-green-600" />
                <span>{prospect.phone}</span>
              </div>
            )}

            {prospect.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                <span className="truncate">{prospect.email}</span>
              </div>
            )}

            {prospect.googleRating && (
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span>
                  {prospect.googleRating}/5 ({prospect.googleReviews} avis)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onSelect}
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              isSelected
                ? "bg-primary-600 border-primary-600"
                : "border-muted-foreground/30 hover:border-primary-400"
            )}
          >
            {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
          </button>

          {!prospect.enriched && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEnrich}
              disabled={isEnriching}
              className="text-xs"
            >
              {isEnriching ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function SourcingPage() {
  const [searchType, setSearchType] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ScrapedProspect[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    hasEmail: false,
    hasPhone: false,
    minRating: 0,
    minScore: 0,
  });

  // Search prospects
  const handleSearch = async () => {
    if (!searchType || !searchLocation) return;

    setIsSearching(true);
    setResults([]);

    try {
      const [googleResults, annuaireResults] = await Promise.all([
        searchGoogleMaps(searchType, searchLocation),
        searchAnnuaire(searchType, searchLocation),
      ]);

      // Combine and deduplicate results
      const combined = [...googleResults, ...annuaireResults];
      const unique = combined.reduce((acc, prospect) => {
        const key = prospect.name.toLowerCase().replace(/\s/g, "");
        if (!acc.find((p) => p.name.toLowerCase().replace(/\s/g, "") === key)) {
          acc.push({ ...prospect, id: `temp-${Date.now()}-${Math.random()}` });
        }
        return acc;
      }, [] as ScrapedProspect[]);

      setResults(unique.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0)));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Enrich a single prospect
  const handleEnrich = async (prospectId: string) => {
    setEnrichingIds((prev) => new Set(prev).add(prospectId));

    try {
      const prospect = results.find((p) => p.id === prospectId);
      if (!prospect) return;

      const enriched = await enrichProspectData(prospect);
      setResults((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...enriched, id: prospectId } : p))
      );
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(prospectId);
        return next;
      });
    }
  };

  // Enrich selected prospects
  const handleEnrichSelected = async () => {
    for (const id of selectedIds) {
      await handleEnrich(id);
    }
  };

  // Import CSV
  const handleCSVImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importFromCSV(file);
      const withIds = imported.map((p, i) => ({
        ...p,
        id: `import-${Date.now()}-${i}`,
      }));
      setResults((prev) => [...withIds, ...prev]);
    } catch (error) {
      console.error("Import error:", error);
    }

    e.target.value = "";
  }, []);

  // Export to CSV
  const handleExport = () => {
    const headers = ["Nom", "Type", "Adresse", "Ville", "Téléphone", "Email", "Site", "Note Google", "Score"];
    const rows = results
      .filter((p) => selectedIds.size === 0 || selectedIds.has(p.id!))
      .map((p) => [
        p.name,
        p.type,
        p.address,
        p.city || "",
        p.phone || "",
        p.email || "",
        p.website || "",
        p.googleRating?.toString() || "",
        p.qualityScore?.toString() || "",
      ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `prospects_${searchType}_${searchLocation}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((p) => p.id!)));
    }
  };

  // Filter results
  const filteredResults = results.filter((p) => {
    if (filters.hasEmail && !p.email) return false;
    if (filters.hasPhone && !p.phone) return false;
    if (filters.minRating && (!p.googleRating || p.googleRating < filters.minRating)) return false;
    if (filters.minScore && (!p.qualityScore || p.qualityScore < filters.minScore)) return false;
    return true;
  });

  // Stats
  const stats = {
    total: results.length,
    withEmail: results.filter((p) => p.email).length,
    withPhone: results.filter((p) => p.phone).length,
    avgScore: results.length
      ? Math.round(results.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / results.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Sourcing Prospects</h1>
              <p className="text-muted-foreground">
                Recherchez et importez des prospects automatiquement
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </span>
                </Button>
              </label>

              {results.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              )}
            </div>
          </div>

          {/* Search Form */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                <option value="">Type d&apos;établissement</option>
                {RESTAURANT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                <option value="">Ville / Zone</option>
                {MAJOR_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            <Button
              onClick={handleSearch}
              disabled={!searchType || !searchLocation || isSearching}
              className="min-w-[140px]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Prospects trouvés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.withEmail}</p>
                <p className="text-sm text-muted-foreground">Avec email</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.withPhone}</p>
                <p className="text-sm text-muted-foreground">Avec téléphone</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{stats.avgScore}%</p>
                <p className="text-sm text-muted-foreground">Score moyen</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters & Actions Bar */}
        {results.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {(filters.hasEmail || filters.hasPhone || filters.minRating > 0 || filters.minScore > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {[filters.hasEmail, filters.hasPhone, filters.minRating > 0, filters.minScore > 0].filter(Boolean).length}
                  </Badge>
                )}
              </Button>

              {selectedIds.size > 0 && (
                <>
                  <Badge variant="secondary">{selectedIds.size} sélectionnés</Badge>
                  <Button variant="outline" size="sm" onClick={handleEnrichSelected}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enrichir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredResults.length} / {results.length} affichés
            </div>
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasEmail}
                        onChange={(e) => setFilters((f) => ({ ...f, hasEmail: e.target.checked }))}
                        className="rounded border-input"
                      />
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Avec email</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasPhone}
                        onChange={(e) => setFilters((f) => ({ ...f, hasPhone: e.target.checked }))}
                        className="rounded border-input"
                      />
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Avec téléphone</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Note min:</span>
                      <select
                        value={filters.minRating}
                        onChange={(e) => setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value={0}>Toutes</option>
                        <option value={3}>3+</option>
                        <option value={3.5}>3.5+</option>
                        <option value={4}>4+</option>
                        <option value={4.5}>4.5+</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm">Score min:</span>
                      <select
                        value={filters.minScore}
                        onChange={(e) => setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value={0}>Tous</option>
                        <option value={40}>40%+</option>
                        <option value={60}>60%+</option>
                        <option value={80}>80%+</option>
                      </select>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({ hasEmail: false, hasPhone: false, minRating: 0, minScore: 0 })}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mb-4" />
            <p className="text-lg font-medium">Recherche en cours...</p>
            <p className="text-muted-foreground">
              Analyse de Google Maps et des annuaires
            </p>
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">
                Trouvez vos prochains clients
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Sélectionnez un type d&apos;établissement et une ville pour lancer
                une recherche automatique de prospects.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["kebab", "pizza", "fast-food"].map((type) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary-100"
                    onClick={() => setSearchType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                          onChange={selectAll}
                          className="rounded border-input"
                        />
                      </TableHead>
                      <TableHead>Établissement</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Google</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((prospect) => (
                      <TableRow key={prospect.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(prospect.id!)}
                            onChange={() => toggleSelect(prospect.id!)}
                            className="rounded border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{prospect.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {prospect.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {prospect.phone && (
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3 text-green-600" />
                                {prospect.phone}
                              </p>
                            )}
                            {prospect.email && (
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3 text-blue-600" />
                                {prospect.email}
                              </p>
                            )}
                            {prospect.website && (
                              <a
                                href={prospect.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm flex items-center gap-1 text-primary-600 hover:underline"
                              >
                                <Globe className="h-3 w-3" />
                                Site web
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {!prospect.phone && !prospect.email && !prospect.website && (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {prospect.googleRating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span>{prospect.googleRating}</span>
                              <span className="text-muted-foreground text-sm">
                                ({prospect.googleReviews})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <QualityBadge score={prospect.qualityScore || 0} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {prospect.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!prospect.enriched && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnrich(prospect.id!)}
                              disabled={enrichingIds.has(prospect.id!)}
                            >
                              {enrichingIds.has(prospect.id!) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {prospect.enriched && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredResults.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  onEnrich={() => handleEnrich(prospect.id!)}
                  onSelect={() => toggleSelect(prospect.id!)}
                  isSelected={selectedIds.has(prospect.id!)}
                  isEnriching={enrichingIds.has(prospect.id!)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <PhonePreviewButton />
    </div>
  );
}
