import { base44 } from '@/api/base44Client';

const lsKey = (userId, key) => `mp_onb_${userId}_${key}`;

// Welcome tutorial
export function isWelcomeDone(user) {
  if (!user) return true;
  return user.onb_welcome_done === true || localStorage.getItem(lsKey(user.id, 'welcome')) === '1';
}

export async function markWelcomeDone(userId) {
  if (!userId) return;
  localStorage.setItem(lsKey(userId, 'welcome'), '1');
  try {
    await base44.auth.updateMe({ onb_welcome_done: true });
  } catch (e) {
    console.error('Errore salvataggio onboarding welcome:', e);
  }
}

// Section banners
export function isSectionDone(user, section) {
  if (!user) return true;
  return user.onb_sections?.[section] === true || localStorage.getItem(lsKey(user.id, `sec_${section}`)) === '1';
}

export async function markSectionDone(user, section) {
  if (!user) return;
  localStorage.setItem(lsKey(user.id, `sec_${section}`), '1');
  try {
    const sections = { ...(user.onb_sections || {}), [section]: true };
    await base44.auth.updateMe({ onb_sections: sections });
  } catch (e) {
    console.error('Errore salvataggio onboarding sezione:', e);
  }
}