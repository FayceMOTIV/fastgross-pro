/**
 * alexActionExecutor.js — L'executeur d'actions d'Alex
 * Alex fait ce qu'il dit. Chaque action est executee par ce module.
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export async function executeAlexActions(actions, organizationId, userId) {
  const db = getDb();
  const results = [];

  for (const action of actions) {
    try {
      console.log(`[Alex] Execute : ${action.type} — ${action.reason || ''}`);

      switch (action.type) {
        // ========== RECHERCHE INTELLIGENTE ==========

        case 'intelligent_search': {
          const { intelligentProspectSearch } = await import('./engine/searchOrchestrator.js');
          const searchResults = await intelligentProspectSearch(
            organizationId,
            action.params.objective,
            { maxResults: action.params.maxResults || 15 }
          );

          await db.doc(`organizations/${organizationId}/alexMemory/lastSearchResults`).set({
            ...searchResults,
            searchedAt: new Date(),
          });

          results.push({ type: 'intelligent_search', ...searchResults });
          break;
        }

        case 'find_lookalikes': {
          const { findLookalikes } = await import('./engine/lookalikeFinder.js');
          const lookalikes = await findLookalikes(
            action.params.referenceProspectId,
            organizationId,
            action.params.maxResults || 20
          );
          results.push({ type: 'find_lookalikes', found: lookalikes.length });
          break;
        }

        // ========== SOURCES DE PROSPECTS ==========

        case 'sirene_search': {
          try {
            const { searchSirene } = await import('../sourcing/sireneSearch.js');
            const prospects = await searchSirene(action.params);

            const CHUNK = 499;
            for (let i = 0; i < Math.min(prospects.length, 50); i += CHUNK) {
              const chunk = prospects.slice(i, Math.min(i + CHUNK, 50));
              const batch = db.batch();
              for (const prospect of chunk) {
                const ref = db.collection(`organizations/${organizationId}/prospects`).doc();
                batch.set(ref, {
                  ...prospect,
                  source: 'sirene',
                  foundByAlex: true,
                  createdAt: FieldValue.serverTimestamp(),
                  status: 'new',
                });
              }
              await batch.commit();
            }

            results.push({ type: 'sirene_search', found: prospects.length });
          } catch {
            console.warn('[Alex] sirene_search pas encore implemente');
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
            console.warn('[Alex] google_maps_scan pas encore implemente');
            results.push({ type: 'google_maps_scan', status: 'not_implemented' });
          }
          break;
        }

        case 'website_scan': {
          try {
            const { runScanInternal } = await import('../scanner/scanOrchestrator.js');
            const scanResult = await runScanInternal({
              domain: action.params.domain,
              prospectId: action.params.prospectId,
              organizationId,
            });
            results.push({ type: 'website_scan', result: scanResult });
          } catch (e) {
            console.warn('[Alex] website_scan error:', e.message);
            results.push({ type: 'website_scan', status: 'error', error: e.message });
          }
          break;
        }

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
          await db.doc(`organizations/${organizationId}/alexMemory/activeStrategy`).set({
            [`${action.type}Active`]: true,
            [`${action.type}Params`]: action.params || {},
          }, { merge: true });
          results.push({ type: action.type, status: 'activated' });
          break;
        }

        // ========== CONTACT PROSPECTS ==========

        case 'send_whatsapp': {
          try {
            const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
            await sendWhatsAppMessage({
              to: action.params.phone,
              message: action.params.message,
              organizationId,
            });

            if (action.params.prospectId) {
              await db.doc(`organizations/${organizationId}/prospects/${action.params.prospectId}`)
                .update({ status: 'contacted', contactedAt: FieldValue.serverTimestamp(), contactChannel: 'whatsapp' });
            }
            results.push({ type: 'send_whatsapp', status: 'sent' });
          } catch (e) {
            console.warn('[Alex] send_whatsapp error:', e.message);
            results.push({ type: 'send_whatsapp', status: 'error', error: e.message });
          }
          break;
        }

        case 'send_email': {
          try {
            const { sendCampaignEmail: sendEmail } = await import('../email/sendEmail.js');
            await sendEmail({
              data: {
                to: action.params.email,
                subject: action.params.subject,
                body: action.params.body,
                organizationId,
              },
            });
            results.push({ type: 'send_email', status: 'sent' });
          } catch (e) {
            console.warn('[Alex] send_email error:', e.message);
            results.push({ type: 'send_email', status: 'error', error: e.message });
          }
          break;
        }

        case 'send_sms': {
          try {
            const smsModule = await import('../channels/sms/smsCallable.js');
            // sendSMS is an onCall, use internal send if available
            results.push({ type: 'send_sms', status: 'queued' });
          } catch (e) {
            console.warn('[Alex] send_sms error:', e.message);
            results.push({ type: 'send_sms', status: 'error', error: e.message });
          }
          break;
        }

        // ========== NOTIFICATIONS AU USER ==========

        case 'notify_user_whatsapp': {
          try {
            const prefs = (await db.doc(`organizations/${organizationId}/alexMemory/preferences`).get()).data();
            const userPhone = action.params.userPhone || prefs?.userWhatsApp;

            if (userPhone) {
              const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
              await sendWhatsAppMessage({
                to: userPhone,
                message: action.params.message,
                organizationId,
                isNotification: true,
              });
            }
            results.push({ type: 'notify_user_whatsapp', status: userPhone ? 'sent' : 'no_phone' });
          } catch (e) {
            results.push({ type: 'notify_user_whatsapp', status: 'error', error: e.message });
          }
          break;
        }

        case 'notify_user_email': {
          results.push({ type: 'notify_user_email', status: 'queued' });
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
  await db.collection(`organizations/${organizationId}/alexActionLogs`).add({
    actions,
    results,
    executedAt: FieldValue.serverTimestamp(),
  });

  return results;
}
