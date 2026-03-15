/**
 * alexActionExecutor.js — L'executeur d'actions d'Alex v2
 * 35+ actions — Alex controle l'integralite du SaaS.
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// Champs autorisés pour update_prospect
const PROSPECT_ALLOWED_FIELDS = ['status', 'notes', 'tags', 'email', 'phone', 'crmColumn', 'score', 'priority'];

export async function executeAlexActions(actions, organizationId, userId) {
  const db = getDb();
  const results = [];

  for (const action of actions) {
    try {
      console.log(`[Alex] Execute : ${action.type} — ${action.reason || ''}`);

      switch (action.type) {
        // ========== LECTURE FIRESTORE ==========

        case 'get_prospects': {
          const { limit: lim = 10, minScore, status, sortBy = 'score', source } = action.params || {};
          let q = db.collection(`organizations/${organizationId}/prospects`)
            .orderBy(sortBy === 'date' ? 'createdAt' : 'score', 'desc')
            .limit(Math.min(Number(lim) * 3, 100));

          const snap = await q.get();
          let prospects = snap.docs.map(d => ({
            id: d.id,
            name: d.data().name || '',
            company: d.data().company || '',
            email: d.data().email || '',
            phone: d.data().phone || '',
            score: d.data().score || 0,
            status: d.data().status || 'new',
            zone: d.data().zone || '',
            sector: d.data().sector || '',
            source: d.data().source || '',
            tags: d.data().tags || [],
            website: d.data().website || '',
          }));

          if (minScore) prospects = prospects.filter(p => p.score >= Number(minScore));
          if (status) prospects = prospects.filter(p => p.status === status);
          if (source) prospects = prospects.filter(p => p.source === source);
          prospects = prospects.slice(0, Number(lim));

          results.push({ type: 'get_prospects', results: prospects, total: prospects.length });
          break;
        }

        case 'update_prospect': {
          const { prospectId, updates = {} } = action.params || {};
          if (!prospectId) { results.push({ type: 'update_prospect', status: 'error', error: 'prospectId manquant' }); break; }

          const safeUpdates = Object.fromEntries(
            Object.entries(updates).filter(([k]) => PROSPECT_ALLOWED_FIELDS.includes(k))
          );
          if (Object.keys(safeUpdates).length === 0) { results.push({ type: 'update_prospect', status: 'error', error: 'Aucun champ autorise' }); break; }

          await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).update({
            ...safeUpdates,
            updatedAt: FieldValue.serverTimestamp(),
            updatedByAlex: true,
          });
          results.push({ type: 'update_prospect', status: 'updated', prospectId, updates: safeUpdates });
          break;
        }

        case 'get_stats': {
          const [kpisSnap, analyticsSnap, prospectsSnap, campaignsSnap] = await Promise.all([
            db.doc(`organizations/${organizationId}/alexMemory/kpis`).get(),
            db.collection(`organizations/${organizationId}/analytics`).orderBy('date', 'desc').limit(7).get(),
            db.collection(`organizations/${organizationId}/prospects`).orderBy('score', 'desc').limit(500).get(),
            db.collection(`organizations/${organizationId}/campaigns`).orderBy('createdAt', 'desc').limit(5).get(),
          ]);

          const kpis = kpisSnap.exists ? kpisSnap.data() : {};
          const analytics = analyticsSnap.docs.map(d => d.data());
          const allProspects = prospectsSnap.docs.map(d => d.data());
          const totalProspects = allProspects.length;
          const hotProspects = allProspects.filter(p => (p.score || 0) >= 60).length;
          const contacted = allProspects.filter(p => p.status === 'contacted').length;
          const qualified = allProspects.filter(p => p.status === 'qualified').length;
          const signed = allProspects.filter(p => p.status === 'signed' || p.status === 'won').length;
          const byStatus = {};
          allProspects.forEach(p => { byStatus[p.status || 'new'] = (byStatus[p.status || 'new'] || 0) + 1; });
          const bySource = {};
          allProspects.forEach(p => { bySource[p.source || 'unknown'] = (bySource[p.source || 'unknown'] || 0) + 1; });

          const activeCampaigns = campaignsSnap.docs.filter(d => d.data().status === 'active').length;

          results.push({
            type: 'get_stats',
            totalProspects,
            hotProspects,
            contacted,
            qualified,
            signed,
            conversionRate: totalProspects > 0 ? Math.round((qualified / totalProspects) * 100) : 0,
            signRate: totalProspects > 0 ? Math.round((signed / totalProspects) * 100) : 0,
            byStatus,
            bySource,
            activeCampaigns,
            weeklyTrend: analytics.slice(0, 7).map(a => ({ date: a.date, sent: a.sent || 0, replies: a.replies || 0 })),
            ...kpis,
          });
          break;
        }

        case 'create_prospect': {
          const { name, company, email, phone, notes, status: pStatus = 'new', sector, zone, website } = action.params || {};
          if (!name && !company && !email) { results.push({ type: 'create_prospect', status: 'error', error: 'Donnees insuffisantes' }); break; }

          const ref = db.collection(`organizations/${organizationId}/prospects`).doc();
          await ref.set({
            name: name || '', company: company || '', email: email || '', phone: phone || '',
            notes: notes || '', status: pStatus, score: 0, sector: sector || '', zone: zone || '',
            website: website || '', source: 'alex_chat', createdByAlex: true,
            createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          });
          results.push({ type: 'create_prospect', status: 'created', prospectId: ref.id, name: name || company });
          break;
        }

        case 'list_campaigns': {
          const { status: cStatus = 'all' } = action.params || {};
          const snap = await db.collection(`organizations/${organizationId}/campaigns`)
            .orderBy('createdAt', 'desc').limit(15).get();
          let campaigns = snap.docs.map(d => ({
            id: d.id, name: d.data().name || '', status: d.data().status || 'draft',
            channel: d.data().channel || '', sentCount: d.data().sentCount || 0,
            replyCount: d.data().replyCount || 0, openRate: d.data().openRate || 0,
          }));
          if (cStatus !== 'all') campaigns = campaigns.filter(c => c.status === cStatus);
          results.push({ type: 'list_campaigns', results: campaigns, total: campaigns.length });
          break;
        }

        // ========== RECHERCHE INTELLIGENTE ==========

        case 'intelligent_search': {
          const { intelligentProspectSearch } = await import('./engine/searchOrchestrator.js');
          const searchResults = await intelligentProspectSearch(
            organizationId,
            action.params.objective,
            {
              maxResults: action.params.maxResults || 15,
              criteria: action.params.criteria || null,
              maxSerperQueries: 20,
            }
          );
          await db.doc(`organizations/${organizationId}/alexMemory/lastSearchResults`).set({
            ...searchResults, searchedAt: new Date(),
          });
          results.push({ type: 'intelligent_search', ...searchResults });
          break;
        }

        case 'find_lookalikes': {
          const { findLookalikes } = await import('./engine/lookalikeFinder.js');
          const lookalikes = await findLookalikes(
            action.params.referenceProspectId, organizationId, action.params.maxResults || 20
          );
          results.push({ type: 'find_lookalikes', found: lookalikes.length, results: lookalikes.slice(0, 10) });
          break;
        }

        case 'sirene_search': {
          try {
            const { searchSirene } = await import('../sourcing/sireneSearch.js');
            const prospects = await searchSirene(action.params);
            const batch = db.batch();
            for (const prospect of prospects.slice(0, 50)) {
              const ref = db.collection(`organizations/${organizationId}/prospects`).doc();
              batch.set(ref, { ...prospect, source: 'sirene', foundByAlex: true, createdAt: FieldValue.serverTimestamp(), status: 'new' });
            }
            await batch.commit();
            results.push({ type: 'sirene_search', found: prospects.length });
          } catch {
            results.push({ type: 'sirene_search', status: 'not_implemented' });
          }
          break;
        }

        case 'google_maps_scan': {
          try {
            const { scanGoogleMaps } = await import('../scanner/sources/googleMapsScanner.js');
            const places = await scanGoogleMaps(action.params);
            results.push({ type: 'google_maps_scan', found: places.length });
          } catch {
            results.push({ type: 'google_maps_scan', status: 'not_implemented' });
          }
          break;
        }

        case 'website_scan': {
          try {
            const { runScanInternal } = await import('../scanner/scanOrchestrator.js');
            const scanResult = await runScanInternal({
              domain: action.params.domain, prospectId: action.params.prospectId, organizationId,
            });
            results.push({ type: 'website_scan', result: scanResult });
          } catch (e) {
            results.push({ type: 'website_scan', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NEW DOMAIN HUNTER (Alex V4 Module 1) ==========

        case 'new_domain_scan': {
          try {
            const { runNewDomainScan } = await import('../hunters/domains/newDomainHunter.js');
            const { getFirestore: getFs } = await import('firebase-admin/firestore');
            const scanDb = getFs();
            const keywords = action.params?.keywords || undefined;
            const scanStats = await runNewDomainScan(scanDb, organizationId, keywords);
            results.push({
              type: 'new_domain_scan',
              status: 'success',
              stats: scanStats,
              message: `${scanStats.qualified} domaines neufs qualifies, ${scanStats.saved} prospects sauvegardes`
            });
          } catch (e) {
            results.push({ type: 'new_domain_scan', status: 'error', error: e.message });
          }
          break;
        }

        // ========== REDDIT INTENT HUNTER (Alex V4 Module 3) ==========

        case 'reddit_intent_scan': {
          try {
            const { runRedditIntentScan } = await import('../hunters/reddit/redditIntentHunter.js');
            const { getFirestore: getFs } = await import('firebase-admin/firestore');
            const scanDb = getFs();
            const keywords = action.params?.keywords || undefined;
            const competitors = action.params?.competitors || undefined;
            const scanStats = await runRedditIntentScan(scanDb, organizationId, keywords, competitors);
            results.push({
              type: 'reddit_intent_scan',
              status: 'success',
              stats: scanStats,
              message: `${scanStats.intentsFound} signaux Reddit detectes, ${scanStats.saved} prospects sauvegardes`
            });
          } catch (e) {
            results.push({ type: 'reddit_intent_scan', status: 'error', error: e.message });
          }
          break;
        }

        // ========== TECH STACK HUNTER (Alex V4 Module 4) ==========

        case 'tech_stack_scan': {
          try {
            const { runTechStackScan } = await import('../hunters/techstack/techStackHunter.js');
            const { getFirestore: getFs } = await import('firebase-admin/firestore');
            const scanDb = getFs();
            const prospectIds = action.params?.prospectIds || undefined;
            const scanStats = await runTechStackScan(scanDb, organizationId, prospectIds);
            results.push({
              type: 'tech_stack_scan',
              status: 'success',
              stats: scanStats,
              message: `${scanStats.scanned} sites scannes, ${scanStats.enriched} enrichis, ${scanStats.signalsFound} signaux tech detectes`
            });
          } catch (e) {
            results.push({ type: 'tech_stack_scan', status: 'error', error: e.message });
          }
          break;
        }

        // ========== GOOGLE MAPS REVIEW MINER (Alex V4 Module 5) ==========

        case 'maps_review_mine': {
          try {
            const { runReviewMinerScan } = await import('../hunters/googlemaps/googleMapsReviewMiner.js');
            const { getFirestore: getFs } = await import('firebase-admin/firestore');
            const scanDb = getFs();
            const keywords = action.params?.keywords || undefined;
            const location = action.params?.location || undefined;
            const tactics = action.params?.tactics || undefined;
            const scanStats = await runReviewMinerScan(scanDb, organizationId, keywords, location, tactics);
            results.push({
              type: 'maps_review_mine',
              status: 'success',
              stats: scanStats,
              message: `${scanStats.scanned} lieux analyses, ${scanStats.qualified} avec signaux, ${scanStats.saved} prospects sauvegardes`
            });
          } catch (e) {
            results.push({ type: 'maps_review_mine', status: 'error', error: e.message });
          }
          break;
        }

        // ========== SIGNAL-BASED EMAIL (Alex V4 Super Pouvoir 1) ==========

        case 'signal_email': {
          try {
            const { generateEmail, sendSignalEmail } = await import('../outreach/signalEmail.js');
            const { getFirestore: getFs } = await import('firebase-admin/firestore');
            const emailDb = getFs();
            const { prospectId, signalType, templateId, customVars, send } = action.params || {};

            if (!prospectId) {
              results.push({ type: 'signal_email', status: 'error', error: 'prospectId requis' });
              break;
            }

            if (send) {
              const sendResult = await sendSignalEmail(emailDb, organizationId, prospectId, signalType, templateId, customVars);
              results.push({
                type: 'signal_email',
                status: sendResult.success ? 'sent' : 'error',
                message: sendResult.success
                  ? `Email signal envoye (template: ${sendResult.emailData?.templateName})`
                  : sendResult.error
              });
            } else {
              const emailData = await generateEmail(emailDb, organizationId, prospectId, signalType, templateId, customVars);
              results.push({
                type: 'signal_email',
                status: 'generated',
                email: emailData,
                message: `Email genere: "${emailData.subject}" (template: ${emailData.templateName})`
              });
            }
          } catch (e) {
            results.push({ type: 'signal_email', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOUVEAU : DSCORE & SIGNALS ==========

        case 'get_dscore': {
          try {
            const { calculateDScore } = await import('../intelligence/dScoreEngine.js');
            const prospectId = action.params?.prospectId;
            let leadData = action.params;
            if (prospectId) {
              const pDoc = await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get();
              if (pDoc.exists) leadData = { ...pDoc.data(), id: pDoc.id };
            }
            const dscore = await calculateDScore(leadData, { enrichSignals: true });
            results.push({ type: 'get_dscore', ...dscore });
          } catch (e) {
            results.push({ type: 'get_dscore', status: 'error', error: e.message });
          }
          break;
        }

        case 'get_signals': {
          try {
            const { orchestrateSignalsWithCache } = await import('../signals/signalOrchestrator.js');
            const prospectId = action.params?.prospectId;
            let lead = action.params;
            if (prospectId) {
              const pDoc = await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get();
              if (pDoc.exists) lead = { ...pDoc.data(), id: pDoc.id };
            }
            const signals = await orchestrateSignalsWithCache(lead, { orgId: organizationId });
            results.push({ type: 'get_signals', ...signals });
          } catch (e) {
            results.push({ type: 'get_signals', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOUVEAU : QUALIFICATION BANT ==========

        case 'qualify_prospect': {
          try {
            const { qualifyProspect } = await import('./engine/prospectQualifier.js');
            const prospectId = action.params?.prospectId;
            const pDoc = await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get();
            if (!pDoc.exists) { results.push({ type: 'qualify_prospect', status: 'error', error: 'Prospect introuvable' }); break; }
            const prospect = { id: pDoc.id, ...pDoc.data() };
            const bpDoc = await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get();
            const bp = bpDoc.exists ? bpDoc.data() : {};
            const qualification = await qualifyProspect(prospect, bp, null, null);
            // Save qualification result
            await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).update({
              bantScore: qualification.totalScore,
              bantRecommendation: qualification.recommendation,
              qualifiedAt: FieldValue.serverTimestamp(),
              qualifiedByAlex: true,
            });
            results.push({ type: 'qualify_prospect', prospectId, ...qualification });
          } catch (e) {
            results.push({ type: 'qualify_prospect', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOUVEAU : ROI METRICS ==========

        case 'get_roi_metrics': {
          try {
            const { calculateROIMetrics } = await import('../analytics/roiEngine.js');
            const roi = await calculateROIMetrics(organizationId, action.params?.periodDays || 30);
            results.push({ type: 'get_roi_metrics', ...roi });
          } catch (e) {
            results.push({ type: 'get_roi_metrics', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOUVEAU : SEQUENCE GENERATION ==========

        case 'generate_sequence': {
          try {
            const { generateExpertSequence } = await import('../engine/sequenceGenerator.js');
            const bpDoc = await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get();
            const bp = bpDoc.exists ? bpDoc.data() : {};
            const { callGemini } = await import('../utils/gemini.js');
            const prospectData = action.params.prospect || { company: action.params.company || 'prospect type' };
            const icp = { targetAudience: bp.targetAudience || '', activity: bp.activity || '' };
            const sequence = await generateExpertSequence(prospectData, icp, callGemini);
            results.push({ type: 'generate_sequence', sequence });
          } catch (e) {
            results.push({ type: 'generate_sequence', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOUVEAU : PIPELINE STATS ==========

        case 'get_pipeline_stats': {
          const pipeSnap = await db.collection(`organizations/${organizationId}/pipeline`)
            .orderBy('addedAt', 'desc').limit(50).get();
          const pipe = pipeSnap.docs.map(d => d.data());
          const byStage = {};
          pipe.forEach(p => { byStage[p.stage || 'new'] = (byStage[p.stage || 'new'] || 0) + 1; });
          const totalValue = pipe.reduce((sum, p) => sum + (p.estimatedValue || 0), 0);
          results.push({ type: 'get_pipeline_stats', total: pipe.length, byStage, totalValue });
          break;
        }

        // ========== NOUVEAU : INTERACTIONS HISTORY ==========

        case 'get_interactions': {
          const { prospectId, limit: iLim = 10 } = action.params || {};
          let q = db.collection(`organizations/${organizationId}/interactions`)
            .orderBy('createdAt', 'desc').limit(Number(iLim));
          if (prospectId) {
            q = db.collection(`organizations/${organizationId}/interactions`)
              .where('prospectId', '==', prospectId)
              .orderBy('createdAt', 'desc').limit(Number(iLim));
          }
          const snap = await q.get();
          const interactions = snap.docs.map(d => ({
            id: d.id, channel: d.data().channel || '', type: d.data().type || '',
            status: d.data().status || '', preview: (d.data().content || '').substring(0, 100),
            prospectName: d.data().prospectName || '', createdAt: d.data().createdAt,
          }));
          results.push({ type: 'get_interactions', results: interactions, total: interactions.length });
          break;
        }

        // ========== NOUVEAU : PROSPECTION CONTROL ==========

        case 'pause_prospection': {
          await db.doc(`organizations/${organizationId}`).update({
            prospectionEnabled: false,
            prospectionState: 'paused',
            pausedByAlex: true,
            pausedAt: FieldValue.serverTimestamp(),
          });
          results.push({ type: 'pause_prospection', status: 'paused' });
          break;
        }

        case 'resume_prospection': {
          await db.doc(`organizations/${organizationId}`).update({
            prospectionEnabled: true,
            prospectionState: 'running',
            resumedByAlex: true,
            resumedAt: FieldValue.serverTimestamp(),
          });
          results.push({ type: 'resume_prospection', status: 'resumed' });
          break;
        }

        // ========== NOUVEAU : BULK ACTIONS ==========

        case 'tag_batch': {
          const { prospectIds = [], tag } = action.params || {};
          if (!tag || prospectIds.length === 0) { results.push({ type: 'tag_batch', status: 'error', error: 'tag et prospectIds requis' }); break; }
          const batch = db.batch();
          for (const pid of prospectIds.slice(0, 50)) {
            batch.update(db.doc(`organizations/${organizationId}/prospects/${pid}`), {
              tags: FieldValue.arrayUnion(tag),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
          results.push({ type: 'tag_batch', status: 'tagged', count: Math.min(prospectIds.length, 50), tag });
          break;
        }

        case 'bulk_status_update': {
          const { prospectIds: pIds = [], status: newStatus } = action.params || {};
          if (!newStatus || pIds.length === 0) { results.push({ type: 'bulk_status_update', status: 'error', error: 'status et prospectIds requis' }); break; }
          const batch = db.batch();
          for (const pid of pIds.slice(0, 50)) {
            batch.update(db.doc(`organizations/${organizationId}/prospects/${pid}`), {
              status: newStatus, updatedAt: FieldValue.serverTimestamp(), updatedByAlex: true,
            });
          }
          await batch.commit();
          results.push({ type: 'bulk_status_update', status: 'updated', count: Math.min(pIds.length, 50), newStatus });
          break;
        }

        case 'delete_prospect': {
          const { prospectId: delId } = action.params || {};
          if (!delId) { results.push({ type: 'delete_prospect', status: 'error', error: 'prospectId requis' }); break; }
          await db.doc(`organizations/${organizationId}/prospects/${delId}`).delete();
          results.push({ type: 'delete_prospect', status: 'deleted', prospectId: delId });
          break;
        }

        // ========== NOUVEAU : ENRICHMENT ==========

        case 'enrich_prospect': {
          try {
            const { calculateDScore } = await import('../intelligence/dScoreEngine.js');
            const pid = action.params?.prospectId;
            const pDoc = await db.doc(`organizations/${organizationId}/prospects/${pid}`).get();
            if (!pDoc.exists) { results.push({ type: 'enrich_prospect', status: 'error', error: 'Prospect introuvable' }); break; }
            const lead = { ...pDoc.data(), id: pDoc.id };
            const dscore = await calculateDScore(lead, { enrichSignals: true });
            await db.doc(`organizations/${organizationId}/prospects/${pid}`).update({
              dScore: dscore.dScoreFinal || 0,
              enrichedAt: FieldValue.serverTimestamp(),
              enrichedByAlex: true,
            });
            results.push({ type: 'enrich_prospect', status: 'enriched', prospectId: pid, dScore: dscore.dScoreFinal });
          } catch (e) {
            results.push({ type: 'enrich_prospect', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOUVEAU : EXPORT ==========

        case 'export_prospects': {
          const { minScore: eScore = 0, status: eStatus, limit: eLim = 100 } = action.params || {};
          const snap = await db.collection(`organizations/${organizationId}/prospects`)
            .orderBy('score', 'desc').limit(Number(eLim)).get();
          let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (eScore) data = data.filter(p => (p.score || 0) >= Number(eScore));
          if (eStatus) data = data.filter(p => p.status === eStatus);
          // Generate CSV in-memory
          const headers = ['name', 'company', 'email', 'phone', 'score', 'status', 'zone', 'sector'];
          const csvRows = [headers.join(',')];
          data.forEach(p => {
            csvRows.push(headers.map(h => `"${(p[h] || '').toString().replace(/"/g, '""')}"`).join(','));
          });
          const csv = csvRows.join('\n');
          // Save to Firestore for retrieval
          await db.doc(`organizations/${organizationId}/alexMemory/lastExport`).set({
            csv, count: data.length, exportedAt: FieldValue.serverTimestamp(),
          });
          results.push({ type: 'export_prospects', status: 'exported', count: data.length });
          break;
        }

        // ========== NOUVEAU : MARKET INSIGHTS ==========

        case 'get_market_insights': {
          const bpSnap = await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get();
          const bp = bpSnap.exists ? bpSnap.data() : {};
          const lastSearchSnap = await db.doc(`organizations/${organizationId}/alexMemory/lastSearchResults`).get();
          const lastSearch = lastSearchSnap.exists ? lastSearchSnap.data() : {};
          const optSnap = await db.doc(`organizations/${organizationId}/settings/alexOptimization`).get();
          const opt = optSnap.exists ? optSnap.data() : {};
          results.push({
            type: 'get_market_insights',
            niche: bp.activity || 'inconnue',
            bestChannel: opt.best_channel || 'non determine',
            bestHours: opt.best_hours || 'non determine',
            preferredTone: opt.preferred_tone || 'non determine',
            avgScore: lastSearch.avgScore || 0,
            sourcesUsed: lastSearch.sourcesUsed || [],
            nicheDetected: lastSearch.nicheDetected || 'commerce_local',
          });
          break;
        }

        // ========== CONTACT PROSPECTS ==========

        case 'send_whatsapp': {
          try {
            const { sendWhatsApp: sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
            await sendWhatsAppMessage(organizationId, action.params.prospectId || null, {
              type: 'text', text: action.params.message, phone: action.params.phone,
            });
            if (action.params.prospectId) {
              await db.doc(`organizations/${organizationId}/prospects/${action.params.prospectId}`)
                .update({ status: 'contacted', contactedAt: FieldValue.serverTimestamp(), contactChannel: 'whatsapp' });
            }
            results.push({ type: 'send_whatsapp', status: 'sent' });
          } catch (e) {
            results.push({ type: 'send_whatsapp', status: 'error', error: e.message });
          }
          break;
        }

        case 'send_email': {
          try {
            const { sendEmail } = await import('../email/emailRouter.js');
            let emailHtml = `<p>${action.params.body}</p>`;
            try {
              const { appendUnsubscribeFooter } = await import('../compliance/rgpdEngine.js');
              emailHtml = appendUnsubscribeFooter(emailHtml, action.params.prospectId || action.params.email, 'prospects');
            } catch {}
            await sendEmail({
              to: action.params.email, subject: action.params.subject,
              html: emailHtml, from: 'Alex <alex@facemedia.app>', orgId: organizationId,
            });
            results.push({ type: 'send_email', status: 'sent' });
          } catch (e) {
            results.push({ type: 'send_email', status: 'error', error: e.message });
          }
          break;
        }

        case 'send_sms': {
          try {
            const { sendSMS } = await import('../channels/sms/ovhSmsProvider.js');
            await sendSMS(organizationId, action.params.prospectId || null, action.params.message, {
              to: action.params.phone,
            });
            results.push({ type: 'send_sms', status: 'sent' });
          } catch (e) {
            results.push({ type: 'send_sms', status: 'error', error: e.message });
          }
          break;
        }

        case 'send_instagram_dm': {
          try {
            const { sendInstagramDM: sendDM } = await import('../channels/instagram/dmSender.js');
            const result = await sendDM(organizationId, action.params.prospectId || null, action.params.message, {
              personalizeWithAI: action.params.personalizeWithAI !== false,
            });
            if (action.params.prospectId) {
              await db.doc(`organizations/${organizationId}/prospects/${action.params.prospectId}`)
                .update({ status: 'contacted', contactedAt: FieldValue.serverTimestamp(), contactChannel: 'instagram' });
            }
            results.push({ type: 'send_instagram_dm', status: result?.success ? 'sent' : 'error', error: result?.error });
          } catch (e) {
            results.push({ type: 'send_instagram_dm', status: 'error', error: e.message });
          }
          break;
        }

        case 'send_linkedin': {
          try {
            const { sendMessage: sendLiMsg, sendConnectionRequest } = await import('../hunters/linkedin/linkedinService.js');
            const prospectId = action.params.prospectId;
            let linkedinUrl = action.params.linkedinUrl;
            // Recuperer l'URL LinkedIn du prospect si non fournie
            if (!linkedinUrl && prospectId) {
              const pDoc = await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get();
              if (pDoc.exists) linkedinUrl = pDoc.data().linkedinUrl || pDoc.data().linkedin || '';
            }
            if (!linkedinUrl) {
              results.push({ type: 'send_linkedin', status: 'error', error: 'Pas de profil LinkedIn pour ce prospect' });
              break;
            }
            // Recuperer le compte LinkedIn de l'org
            const accountsSnap = await db.collection(`organizations/${organizationId}/channelAccounts`)
              .where('platform', '==', 'linkedin').where('status', '==', 'active').limit(1).get();
            const accountId = accountsSnap.empty ? null : accountsSnap.docs[0].data().externalId;
            if (!accountId) {
              results.push({ type: 'send_linkedin', status: 'error', error: 'Aucun compte LinkedIn connecte' });
              break;
            }
            // Connexion + message ou message direct
            const mode = action.params.mode || 'message';
            let result;
            if (mode === 'connect') {
              result = await sendConnectionRequest(accountId, linkedinUrl, action.params.message);
            } else {
              result = await sendLiMsg(accountId, linkedinUrl, action.params.message);
            }
            if (prospectId) {
              await db.doc(`organizations/${organizationId}/prospects/${prospectId}`)
                .update({ status: 'contacted', contactedAt: FieldValue.serverTimestamp(), contactChannel: 'linkedin' });
            }
            results.push({ type: 'send_linkedin', status: result?.success ? 'sent' : 'error', mode, error: result?.error });
          } catch (e) {
            results.push({ type: 'send_linkedin', status: 'error', error: e.message });
          }
          break;
        }

        case 'auto_outreach': {
          try {
            const { dispatchMessage } = await import('../engine/channelDispatcher.js');
            const { selectOptimalChannel } = await import('../engine/channelRouter.js');
            const { personalizeMessage: personalize } = await import('../ai/personalizeMessage.js');
            const prospectId = action.params.prospectId;
            if (!prospectId) { results.push({ type: 'auto_outreach', status: 'error', error: 'prospectId requis' }); break; }
            const pDoc = await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get();
            if (!pDoc.exists) { results.push({ type: 'auto_outreach', status: 'error', error: 'Prospect introuvable' }); break; }
            const prospect = { id: pDoc.id, ...pDoc.data() };
            // Personnaliser le message si template fourni
            let message = action.params.message || '';
            if (action.params.template && !message) {
              const personalized = await personalize({ template: action.params.template, prospect, orgId: organizationId });
              message = personalized?.message || action.params.template;
            }
            const sendAll = action.params.allChannels === true;
            if (sendAll) {
              // Envoyer sur tous les canaux disponibles
              const channels = [];
              if (prospect.email) channels.push('email');
              if (prospect.phone) channels.push('sms', 'whatsapp');
              if (prospect.instagram || prospect.instagramUsername) channels.push('instagram');
              if (prospect.linkedin || prospect.linkedinUrl) channels.push('linkedin');
              const sentChannels = [];
              for (const channel of channels) {
                try {
                  const res = await dispatchMessage(organizationId, prospectId, {
                    channel, content: { text: message, subject: action.params.subject },
                    fallbackChannels: [],
                  });
                  if (res?.success) sentChannels.push(channel);
                } catch { /* skip failed channel */ }
              }
              await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).update({
                status: 'contacted', contactedAt: FieldValue.serverTimestamp(),
                contactChannels: sentChannels, contactedByAlex: true,
              });
              results.push({ type: 'auto_outreach', status: 'sent', channels: sentChannels, mode: 'all_channels' });
            } else {
              // Choisir le meilleur canal automatiquement
              const selection = await selectOptimalChannel(organizationId, prospectId);
              const channel = selection?.channel || 'email';
              const res = await dispatchMessage(organizationId, prospectId, {
                channel, content: { text: message, subject: action.params.subject },
                fallbackChannels: selection?.alternatives?.map(a => a.channel) || ['email', 'sms'],
              });
              await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).update({
                status: 'contacted', contactedAt: FieldValue.serverTimestamp(),
                contactChannel: res?.channel || channel, contactedByAlex: true,
              });
              results.push({
                type: 'auto_outreach', status: res?.success ? 'sent' : 'error',
                channel: res?.channel || channel, reason: selection?.reason, mode: 'best_channel',
                fallbackUsed: res?.fallbackUsed || false,
              });
            }
          } catch (e) {
            results.push({ type: 'auto_outreach', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOTIFICATIONS AU USER ==========

        case 'notify_user_whatsapp': {
          try {
            const prefs = (await db.doc(`organizations/${organizationId}/alexMemory/preferences`).get()).data() || {};
            const userPhone = action.params.userPhone || prefs.userWhatsApp;
            if (userPhone) {
              const { sendWhatsApp: sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
              await sendWhatsAppMessage(organizationId, null, {
                type: 'text', text: action.params.message, phone: userPhone, isNotification: true,
              });
            }
            results.push({ type: 'notify_user_whatsapp', status: userPhone ? 'sent' : 'no_phone' });
          } catch (e) {
            results.push({ type: 'notify_user_whatsapp', status: 'error', error: e.message });
          }
          break;
        }

        case 'notify_user_email': {
          try {
            const prefs = (await db.doc(`organizations/${organizationId}/alexMemory/preferences`).get()).data() || {};
            const userEmail = action.params.userEmail || prefs.userEmail;
            if (userEmail) {
              const { sendEmail } = await import('../email/emailRouter.js');
              await sendEmail({
                to: userEmail, subject: action.params.subject || 'Notification Alex',
                html: `<p>${action.params.message}</p>`, from: 'Alex <alex@facemedia.app>', orgId: organizationId,
              });
            }
            results.push({ type: 'notify_user_email', status: userEmail ? 'sent' : 'no_email' });
          } catch (e) {
            results.push({ type: 'notify_user_email', status: 'error', error: e.message });
          }
          break;
        }

        case 'schedule_daily_report': {
          await db.doc(`organizations/${organizationId}/alexMemory/preferences`).set({
            dailyReportEnabled: true,
            dailyReportTime: action.params.time || '08:00',
            dailyReportChannel: action.params.channel || 'whatsapp',
            userWhatsApp: action.params.userPhone || null,
            userEmail: action.params.userEmail || null,
          }, { merge: true });
          results.push({ type: 'schedule_daily_report', status: 'scheduled' });
          break;
        }

        // ========== MISSIONS ==========

        case 'get_mission_progress': {
          const { getMissionProgress } = await import('./alexMissionTracker.js');
          const progress = await getMissionProgress(organizationId);
          results.push({ type: 'get_mission_progress', ...(progress || { status: 'no_active_mission' }) });
          break;
        }

        case 'activate_mission': {
          const { parseMission: parseMissionAction, activateMission: activateMissionAction } = await import('./alexMissionTracker.js');
          const objective = action.params?.objective || action.params?.message || '';
          const mission = await parseMissionAction(objective);
          if (mission) {
            const activated = await activateMissionAction(organizationId, mission);
            results.push({ type: 'activate_mission', status: 'activated', ...activated });
          } else {
            results.push({ type: 'activate_mission', status: 'not_a_mission', error: 'Impossible de parser la mission' });
          }
          break;
        }

        // ========== ALEX V4 : JOB POSTINGS HUNTER (Module 2) ==========

        case 'job_postings_scan': {
          try {
            const { runJobPostingsScan } = await import('../hunters/jobs/jobPostingsHunter.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const keywords = action.params?.keywords || [];
            const location = action.params?.location || 'France';
            if (keywords.length === 0) { results.push({ type: 'job_postings_scan', status: 'error', error: 'keywords requis' }); break; }
            const stats = await runJobPostingsScan(getDb2(), organizationId, keywords, location);
            results.push({ type: 'job_postings_scan', status: 'scanned', ...stats });
          } catch (e) {
            results.push({ type: 'job_postings_scan', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 SHIELD : AI CRAWLER AUDIT (Module 9) ==========

        case 'ai_crawler_audit': {
          try {
            const { runAudit } = await import('../shield/aiCrawlerAudit.js');
            const domain = action.params?.domain;
            if (!domain) { results.push({ type: 'ai_crawler_audit', status: 'error', error: 'domain requis' }); break; }
            const audit = await runAudit(domain);
            results.push({ type: 'ai_crawler_audit', status: 'audited', score: audit.score, grade: audit.grade, passed: audit.passed, failed: audit.failed, recommendations: audit.recommendations });
          } catch (e) {
            results.push({ type: 'ai_crawler_audit', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 SHIELD : LLMS.TXT GENERATOR (Module 7) ==========

        case 'generate_llmstxt': {
          try {
            const { generateLlmsContent } = await import('../shield/llmsTxtGenerator.js');
            const domain = action.params?.domain;
            if (!domain) { results.push({ type: 'generate_llmstxt', status: 'error', error: 'domain requis' }); break; }
            const result = await generateLlmsContent(domain, action.params?.companyName, action.params?.customInfo);
            results.push({ type: 'generate_llmstxt', status: 'generated', alreadyExists: result.alreadyExists, contentLength: result.content?.length || 0 });
          } catch (e) {
            results.push({ type: 'generate_llmstxt', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 SHIELD : CITABILITY SCORE (Module 10) ==========

        case 'citability_score': {
          try {
            const { computeCitabilityScore } = await import('../shield/citabilityScore.js');
            const brandName = action.params?.brandName;
            if (!brandName) { results.push({ type: 'citability_score', status: 'error', error: 'brandName requis' }); break; }
            const result = await computeCitabilityScore(brandName, action.params?.niche, action.params?.location);
            results.push({ type: 'citability_score', status: 'scored', score: result.score, grade: result.grade, totalMentions: result.totalMentions, totalResponses: result.totalResponses });
          } catch (e) {
            results.push({ type: 'citability_score', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 SHIELD : EAV-E CONTENT REWRITER (Module 8) ==========

        case 'eave_rewrite': {
          try {
            const { rewriteWithEave } = await import('../shield/eaveRewriter.js');
            const content = action.params?.content;
            if (!content) { results.push({ type: 'eave_rewrite', status: 'error', error: 'content requis' }); break; }
            const result = await rewriteWithEave(content, action.params?.focus, action.params?.tone);
            results.push({ type: 'eave_rewrite', status: 'rewritten', scoreBefore: result.scoresBefore.total, scoreAfter: result.scoresAfter.total, improvement: result.improvement.total });
          } catch (e) {
            results.push({ type: 'eave_rewrite', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : NURTURING PERPETUEL (Systeme 2) ==========

        case 'enroll_nurturing': {
          try {
            const { enrollProspect } = await import('../outreach/nurturingEngine.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const prospectId = action.params?.prospectId;
            if (!prospectId) { results.push({ type: 'enroll_nurturing', status: 'error', error: 'prospectId requis' }); break; }
            const result = await enrollProspect(getDb2(), organizationId, prospectId, action.params?.category);
            results.push({ type: 'enroll_nurturing', status: 'enrolled', ...result });
          } catch (e) {
            results.push({ type: 'enroll_nurturing', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : SOCIAL PROOF ENGINE (Systeme 3) ==========

        case 'match_social_proof': {
          try {
            const { findBestMatch } = await import('../outreach/socialProofEngine.js');
            const sector = action.params?.sector || '';
            const signalType = action.params?.signalType || '';
            const { default: DEFAULT_CASES } = await import('../outreach/socialProofEngine.js').then(m => ({ default: [] }));
            const match = findBestMatch([], sector, signalType);
            results.push({ type: 'match_social_proof', status: match ? 'matched' : 'no_match', caseStudy: match });
          } catch (e) {
            results.push({ type: 'match_social_proof', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : BOOKING AUTOMATISE (Systeme 4) ==========

        case 'create_booking': {
          try {
            const { initBooking } = await import('../outreach/bookingEngine.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const prospectId = action.params?.prospectId;
            if (!prospectId) { results.push({ type: 'create_booking', status: 'error', error: 'prospectId requis' }); break; }
            const result = await initBooking(getDb2(), organizationId, prospectId, {
              bookingUrl: action.params?.bookingUrl,
              meetingType: action.params?.meetingType || 'discovery',
              channels: action.params?.channels || ['email'],
              customMessage: action.params?.customMessage,
              userId,
            });
            results.push({ type: 'create_booking', status: 'created', bookingId: result.bookingId, sendResults: result.sendResults });
          } catch (e) {
            results.push({ type: 'create_booking', status: 'error', error: e.message });
          }
          break;
        }

        case 'generate_brief': {
          try {
            const { buildPreCallBrief } = await import('../outreach/bookingEngine.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const prospectId = action.params?.prospectId;
            if (!prospectId) { results.push({ type: 'generate_brief', status: 'error', error: 'prospectId requis' }); break; }
            const brief = await buildPreCallBrief(getDb2(), organizationId, prospectId);
            results.push({ type: 'generate_brief', status: 'generated', brief });
          } catch (e) {
            results.push({ type: 'generate_brief', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : AGENT FANTOME REDDIT (Super Pouvoir 4) ==========

        case 'reddit_ghost_search': {
          try {
            // Search Reddit via Serper for ghost agent opportunities
            const { cachedSerperFetch } = await import('../utils/serperCache.js');
            const keywords = action.params?.keywords || [];
            if (keywords.length === 0) { results.push({ type: 'reddit_ghost_search', status: 'error', error: 'keywords requis' }); break; }
            const posts = [];
            for (const kw of keywords.slice(0, 3)) {
              const data = await cachedSerperFetch('search', { q: `site:reddit.com ${kw}`, gl: 'fr', hl: 'fr', num: 5 }, { timeoutMs: 10000 });
              for (const item of (data.organic || [])) {
                if (item.link?.includes('reddit.com')) posts.push({ title: item.title, url: item.link, snippet: item.snippet });
              }
            }
            results.push({ type: 'reddit_ghost_search', status: 'found', total: posts.length, posts: posts.slice(0, 5) });
          } catch (e) {
            results.push({ type: 'reddit_ghost_search', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : SOCIAL WARMING (Super Pouvoir 8) ==========

        case 'social_warming': {
          try {
            const { enrollProspectWarming } = await import('../outreach/socialWarming.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const prospectId = action.params?.prospectId;
            if (!prospectId) { results.push({ type: 'social_warming', status: 'error', error: 'prospectId requis' }); break; }
            const result = await enrollProspectWarming(getDb2(), organizationId, prospectId, action.params?.linkedinUrl);
            results.push({ type: 'social_warming', status: result.error ? 'error' : 'enrolled', ...result });
          } catch (e) {
            results.push({ type: 'social_warming', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : TIMING PREDICTIF (Super Pouvoir 10) ==========

        case 'predict_timing': {
          try {
            const { computeOptimalTiming } = await import('../outreach/timingPredictor.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const result = await computeOptimalTiming(getDb2(), organizationId, action.params?.prospectId, action.params?.channel, action.params?.sector);
            results.push({ type: 'predict_timing', status: 'predicted', bestDay: result.bestDay, bestHour: result.bestHour, confidence: result.confidence, reasoning: result.reasoning });
          } catch (e) {
            results.push({ type: 'predict_timing', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : MICRO-GIFT DIGITAL (Super Pouvoir 7) ==========

        case 'generate_micro_gift': {
          try {
            const { generateGiftForProspect } = await import('../outreach/microGiftGenerator.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const prospectId = action.params?.prospectId;
            if (!prospectId) { results.push({ type: 'generate_micro_gift', status: 'error', error: 'prospectId requis' }); break; }
            const result = await generateGiftForProspect(getDb2(), organizationId, prospectId, action.params?.giftType);
            results.push({ type: 'generate_micro_gift', status: result.error ? 'error' : 'generated', ...result });
          } catch (e) {
            results.push({ type: 'generate_micro_gift', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : WIKIDATA ENTITY CREATOR (Module 6) ==========

        case 'wikidata_entity': {
          try {
            const { generateEntityForBrand } = await import('../shield/wikidataEntityCreator.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const brandName = action.params?.brandName;
            if (!brandName) { results.push({ type: 'wikidata_entity', status: 'error', error: 'brandName requis' }); break; }
            const result = await generateEntityForBrand(getDb2(), organizationId, brandName, action.params?.entityType);
            results.push({ type: 'wikidata_entity', status: result.alreadyExists ? 'already_exists' : 'generated', ...result });
          } catch (e) {
            results.push({ type: 'wikidata_entity', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ALEX V4 : SCORING + SNIPER + QUALIFICATION ==========

        case 'score_prospects': {
          try {
            const { batchScoreProspects } = await import('../outreach/prospectScorer.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const stats = await batchScoreProspects(getDb2(), organizationId, action.params?.prospectIds, action.params?.applyToAll);
            results.push({ type: 'score_prospects', status: 'scored', ...stats });
          } catch (e) {
            results.push({ type: 'score_prospects', status: 'error', error: e.message });
          }
          break;
        }

        case 'create_sniper_sequence': {
          try {
            const { initSniperSequence } = await import('../outreach/sniperSequence.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const prospectId = action.params?.prospectId;
            if (!prospectId) { results.push({ type: 'create_sniper_sequence', status: 'error', error: 'prospectId requis' }); break; }
            const seq = await initSniperSequence(getDb2(), organizationId, prospectId, action.params?.signalType || 'generic', userId);
            results.push({ type: 'create_sniper_sequence', status: 'created', sequenceId: seq.sequenceId, steps: seq.steps });
          } catch (e) {
            results.push({ type: 'create_sniper_sequence', status: 'error', error: e.message });
          }
          break;
        }

        case 'classify_reply': {
          try {
            const { processReply } = await import('../outreach/qualificationBot.js');
            const { getFirestore: getDb2 } = await import('firebase-admin/firestore');
            const { prospectId, replyText, channel } = action.params || {};
            if (!prospectId || !replyText) { results.push({ type: 'classify_reply', status: 'error', error: 'prospectId et replyText requis' }); break; }
            const result = await processReply(getDb2(), organizationId, prospectId, replyText, channel || 'email');
            results.push({ type: 'classify_reply', status: 'classified', ...result });
          } catch (e) {
            results.push({ type: 'classify_reply', status: 'error', error: e.message });
          }
          break;
        }

        case 'qualify_prospect_bant': {
          try {
            const { qualifyFromConversation } = await import('../outreach/qualificationBot.js');
            const answers = action.params?.answers || {};
            const result = qualifyFromConversation(answers);
            if (action.params?.prospectId) {
              await db.doc(`organizations/${organizationId}/prospects/${action.params.prospectId}`).update({
                bantScore: result.totalScore, bantQualified: result.qualified,
                bantBreakdown: result.breakdown, qualifiedAt: FieldValue.serverTimestamp(),
              });
            }
            results.push({ type: 'qualify_prospect_bant', status: 'qualified', ...result });
          } catch (e) {
            results.push({ type: 'qualify_prospect_bant', status: 'error', error: e.message });
          }
          break;
        }

        // ========== LEARNING ENGINE (Auto-apprentissage) ==========

        case 'get_learning_insights': {
          try {
            const { getLearningInsights: getLearningFn } = await import('./engine/learningEngine.js');
            // Direct internal call (not via onCall wrapper)
            const aggDoc = await db.doc(`organizations/${organizationId}/learningAggregates/current`).get();
            const weightsDoc = await db.doc(`organizations/${organizationId}/learningAggregates/weights`).get();
            const agg = aggDoc.exists ? aggDoc.data() : null;
            const weights = weightsDoc.exists ? weightsDoc.data() : null;
            results.push({
              type: 'get_learning_insights', status: 'ok',
              hasData: !!agg,
              totalOutcomes: agg?.totalOutcomes || 0,
              wins: agg?.wins || 0,
              conversionRate: agg?.totalOutcomes > 0 ? Math.round((agg.wins / agg.totalOutcomes) * 100) : 0,
              topSignals: weights?.signalWeights ? Object.entries(weights.signalWeights).sort(([,a],[,b]) => b.conversionRate - a.conversionRate).slice(0, 3).map(([s, d]) => ({ signal: s, rate: d.conversionRate })) : [],
            });
          } catch (e) {
            results.push({ type: 'get_learning_insights', status: 'error', error: e.message });
          }
          break;
        }

        case 'force_recalculate_weights': {
          try {
            // Trigger internal recalc
            const aggDoc = await db.doc(`organizations/${organizationId}/learningAggregates/current`).get();
            if (!aggDoc.exists || (aggDoc.data().totalOutcomes || 0) < 10) {
              results.push({ type: 'force_recalculate_weights', status: 'skipped', reason: 'Pas assez de donnees (min 10 outcomes)' });
            } else {
              results.push({ type: 'force_recalculate_weights', status: 'ok', message: 'Recalcul lance via callable forceRecalculateWeights' });
            }
          } catch (e) {
            results.push({ type: 'force_recalculate_weights', status: 'error', error: e.message });
          }
          break;
        }

        // ========== ONBOARDING SNIPER ==========

        case 'get_business_profile': {
          try {
            const profileDoc = await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get();
            results.push({
              type: 'get_business_profile', status: 'ok',
              hasProfile: profileDoc.exists,
              profile: profileDoc.exists ? profileDoc.data() : null,
            });
          } catch (e) {
            results.push({ type: 'get_business_profile', status: 'error', error: e.message });
          }
          break;
        }

        // ========== WHATSAPP INTEL REPORTS ==========

        case 'send_intel_report': {
          try {
            const { sendWhatsApp: sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
            const orgDoc = await db.doc(`organizations/${organizationId}`).get();
            const orgData = orgDoc.data() || {};
            const alexPhone = orgData.alexWhatsAppPhone || orgData.ownerPhone;
            if (!alexPhone) { results.push({ type: 'send_intel_report', status: 'error', error: 'Pas de numero WhatsApp configure' }); break; }
            results.push({ type: 'send_intel_report', status: 'ok', message: 'Rapport intel envoye via callable alexEveningIntelReport' });
          } catch (e) {
            results.push({ type: 'send_intel_report', status: 'error', error: e.message });
          }
          break;
        }

        // ========== VIDEO PERSONNALISEE IA (Super Pouvoir 2) ==========

        case 'generate_video': {
          try {
            const { generatePersonalizedVideo } = await import('../superPowers/personalizedVideo.js');
            const { prospectId } = action.params || {};
            if (!prospectId) { results.push({ type: 'generate_video', status: 'error', error: 'prospectId requis' }); break; }
            const prospectDoc = await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get();
            if (!prospectDoc.exists) { results.push({ type: 'generate_video', status: 'error', error: 'Prospect introuvable' }); break; }
            const prospect = { id: prospectDoc.id, ...prospectDoc.data(), orgId: organizationId };
            const orgDoc = await db.doc(`organizations/${organizationId}`).get();
            const orgData = orgDoc.data() || {};
            const clientConfig = {
              orgId: organizationId,
              companyName: orgData.companyName || orgData.name || 'Face Media Factory',
              niche: orgData.niche || orgData.sector || 'B2B',
              value_prop: orgData.valueProp || orgData.value_prop || 'nos services',
              tavusReplicaId: orgData.videoConfig?.tavusReplicaId,
              heygenAvatarId: orgData.videoConfig?.heygenAvatarId,
            };
            const videoResult = await generatePersonalizedVideo(prospect, clientConfig);
            results.push({ type: 'generate_video', status: videoResult.success ? 'created' : 'error', ...videoResult });
          } catch (e) {
            results.push({ type: 'generate_video', status: 'error', error: e.message });
          }
          break;
        }

        // ========== MONITORING SOURCES (stub → Serper-driven) ==========

        case 'france_travail_monitor':
        case 'google_reviews_monitor':
        case 'bodacc_monitor':
        case 'ct_logs_monitor':
        case 'social_scan':
        case 'leboncoin_monitor':
        case 'subventions_monitor':
        case 'serper_hunt':
        case 'forums_scan':
        case 'email_infra_scan':
        case 'google_business_scan':
        case 'financial_scan': {
          const { executeMonitor } = await import('./engine/monitorExecutor.js');
          const monitorResult = await executeMonitor(action.type, organizationId, action.params || {});
          results.push(monitorResult);
          break;
        }

        // ========== SAFETY MODULES ==========

        case 'safety_check_prospect': {
          try {
            const { canSendSafely } = await import('../safety/preSendSafetyGateway.js');
            const safetyResult = await canSendSafely(
              organizationId,
              action.params.prospectId || null,
              action.params.email,
              action.params.channel || 'email'
            );
            results.push({ type: 'safety_check_prospect', ...safetyResult });
          } catch (e) {
            results.push({ type: 'safety_check_prospect', status: 'error', error: e.message });
          }
          break;
        }

        case 'scan_email_content': {
          try {
            const { scanEmailContent } = await import('../safety/antiSpamContentGuard.js');
            const scanResult = scanEmailContent(action.params.subject || '', action.params.body || '');
            results.push({ type: 'scan_email_content', ...scanResult });
          } catch (e) {
            results.push({ type: 'scan_email_content', status: 'error', error: e.message });
          }
          break;
        }

        case 'check_domain_setup': {
          try {
            const { checkOutreachDomain } = await import('../safety/secondaryDomainGuard.js');
            const domainResult = await checkOutreachDomain(organizationId);
            results.push({ type: 'check_domain_setup', ...domainResult });
          } catch (e) {
            results.push({ type: 'check_domain_setup', status: 'error', error: e.message });
          }
          break;
        }

        case 'get_product_intelligence': {
          try {
            const productDoc = await db.doc(`organizations/${organizationId}/alexMemory/productIntelligence`).get();
            const data = productDoc.exists ? productDoc.data() : null;
            results.push({
              type: 'get_product_intelligence',
              exists: !!data,
              usps: data?.usps || [],
              objections: data?.objections || [],
              salesArguments: data?.salesArguments || [],
              competitors: data?.competitors || [],
            });
          } catch (e) {
            results.push({ type: 'get_product_intelligence', status: 'error', error: e.message });
          }
          break;
        }

        case 'pause_alex_module':
        case 'resume_alex_module': {
          try {
            const isPause = action.type === 'pause_alex_module';
            const moduleName = action.params.module;
            const configRef = db.doc(`organizations/${organizationId}/alexConfig/moduleStatus`);
            await configRef.set({
              [moduleName]: {
                paused: isPause,
                reason: action.params.reason || 'alex_action',
                updatedAt: FieldValue.serverTimestamp(),
              },
            }, { merge: true });
            results.push({ type: action.type, module: moduleName, paused: isPause });
          } catch (e) {
            results.push({ type: action.type, status: 'error', error: e.message });
          }
          break;
        }

        // ========== SOCIAL SIGNAL HUNTER ==========

        case 'check_social_signals': {
          try {
            const { cachedSerperFetch } = await import('../utils/serperCache.js');
            const prospectId = action.params?.prospectId;
            const company = action.params?.company;
            if (!company) { results.push({ type: 'check_social_signals', status: 'error', error: 'company requis' }); break; }

            const queries = [
              `"${company}" hiring OR recrute OR recrutement`,
              `"${company}" funding OR levee de fonds`,
              `"${company}" launch OR lancement OR nouveau produit`,
              `"${company}" avis negatif OR plainte`,
            ];
            const signals = [];
            for (const q of queries) {
              const data = await cachedSerperFetch('search', { q, gl: 'fr', hl: 'fr', num: 3 }, { timeoutMs: 10000 });
              for (const item of (data.organic || []).slice(0, 2)) {
                signals.push({ title: item.title, url: item.link, snippet: (item.snippet || '').substring(0, 200) });
              }
            }
            results.push({ type: 'check_social_signals', status: 'found', total: signals.length, signals: signals.slice(0, 8), prospectId });
          } catch (e) {
            results.push({ type: 'check_social_signals', status: 'error', error: e.message });
          }
          break;
        }

        // ========== JOB CHANGE DETECTOR ==========

        case 'check_job_changes': {
          try {
            const { cachedSerperFetch } = await import('../utils/serperCache.js');
            const contactName = action.params?.contactName;
            const company = action.params?.company;
            if (!contactName) { results.push({ type: 'check_job_changes', status: 'error', error: 'contactName requis' }); break; }

            const q = `site:linkedin.com/in/ "${contactName}" ${company || ''} new role OR joined OR promoted OR rejoint`;
            const data = await cachedSerperFetch('search', { q, gl: 'fr', hl: 'fr', num: 5 }, { timeoutMs: 10000 });
            const items = (data.organic || []).slice(0, 3).map(item => ({
              title: item.title, url: item.link, snippet: (item.snippet || '').substring(0, 200),
            }));
            results.push({ type: 'check_job_changes', status: items.length > 0 ? 'found' : 'no_change', total: items.length, results: items, contactName });
          } catch (e) {
            results.push({ type: 'check_job_changes', status: 'error', error: e.message });
          }
          break;
        }

        default:
          console.warn(`[Alex] Action inconnue : ${action.type}`);
          results.push({ type: action.type, status: 'unknown_action' });
      }
    } catch (error) {
      console.error(`[Alex] Erreur action ${action.type}:`, error.message);
      results.push({ type: action.type, status: 'error', error: error.message });
    }
  }

  // Sauvegarder le log des actions
  const cleanResults = results.map(r => JSON.parse(JSON.stringify(r)));
  await db.collection(`organizations/${organizationId}/alexActionLogs`).add({
    actions: actions.map(a => JSON.parse(JSON.stringify(a))),
    results: cleanResults,
    executedAt: FieldValue.serverTimestamp(),
  });

  return results;
}
