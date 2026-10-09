/**
 * Who sees SEF sending (ROADMAP A3.6). Until real SEF is switched on (A1.14), the SEF key card and the
 * send panel stay with test companies, so a first customer never "sends" into the SEF demo by mistake.
 *
 * - SEF_SENDING=on: every company.
 * - otherwise only the profile ids listed in SEF_SENDING_PROFILES (comma-separated).
 * Everyone else keeps "XML za SEF" for manual upload.
 */
export function sefSendingAllowed(profileId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SEF_SENDING?.trim().toLowerCase() === 'on') return true
  return (env.SEF_SENDING_PROFILES ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(profileId)
}
