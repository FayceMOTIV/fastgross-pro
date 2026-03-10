/**
 * pappersFinancialMonitor.js — Donnees financieres Pappers API
 */

export async function analyzePappersFinancial(siren) {
  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey || !siren) return null;

  try {
    const resp = await fetch(
      `https://api.pappers.fr/v2/entreprise?api_token=${apiKey}&siren=${siren}&extrait_kbis=false`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!resp.ok) return null;
    const data = await resp.json();

    const finances = data.finances?.[0] || {};
    const previousFinances = data.finances?.[1] || {};

    const ca = finances.chiffre_affaires || null;
    const prevCa = previousFinances.chiffre_affaires || null;
    const revenueGrowthYoY = ca && prevCa ? ((ca - prevCa) / prevCa) : null;

    const dirigeants = data.representants || [];
    const latestDirector = dirigeants.find(d => d.qualite?.toLowerCase().includes('gerant') || d.qualite?.toLowerCase().includes('president'));
    const directorSince = latestDirector?.date_prise_poste || null;

    const now = new Date();
    const isNewDirector = directorSince && ((now - new Date(directorSince)) / (1000 * 60 * 60 * 24) < 365);

    return {
      siren,
      denomination: data.denomination,
      codeNaf: data.code_naf,
      libelleNaf: data.libelle_code_naf,
      formeJuridique: data.forme_juridique,
      dateCreation: data.date_creation,
      effectif: data.effectif,
      chiffreAffaires: ca,
      resultatNet: finances.resultat || null,
      revenueGrowthYoY,
      capitalSocial: data.capital,
      adresse: data.siege?.adresse_ligne_1,
      codePostal: data.siege?.code_postal,
      ville: data.siege?.ville,
      dirigeant: latestDirector ? `${latestDirector.prenom} ${latestDirector.nom}` : null,
      directorSince,
      isNewDirector,
      procedureCollective: data.procedure_collective || false,
    };
  } catch (error) {
    console.warn(`[Pappers] Erreur siren ${siren}:`, error.message);
    return null;
  }
}
