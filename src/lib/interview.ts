import type { Profile } from './portfolio';

export type AnswerKey = 'owner' | 'job' | 'name' | 'services' | 'city' | 'phone' | 'extra';
export type Question = { key: AnswerKey; title: string; spoken: string; hint: string; placeholder: string; suggestions?: string[]; optional?: boolean; multiline?: boolean };
export const questions: Question[] = [
  { key: 'owner', title: 'D’abord, comment vous appelez-vous ?', spoken: 'Bonjour et bienvenue sur TalentProof ! Je vais vous aider à créer une présentation de votre activité. Nous allons le faire ensemble, une question à la fois. Pour commencer, comment vous appelez-vous ?', hint: 'Votre prénom suffit pour faire connaissance.', placeholder: 'Par exemple : Afi', optional: true },
  { key: 'job', title: 'Quel est votre métier ?', spoken: 'Enchantée ! Quel est votre métier ? Vous pouvez par exemple me dire : je suis couturière.', hint: 'Dites simplement ce que vous faites.', placeholder: 'Je suis couturière…', suggestions: ['Couturière', 'Coiffeuse', 'Maquilleuse', 'Artisane'] },
  { key: 'name', title: 'Comment s’appelle votre atelier ?', spoken: 'Très bien. Comment s’appelle votre atelier ou votre activité ? Si vous n’avez pas de nom, vous pouvez utiliser votre prénom.', hint: 'Le nom que vos clientes connaissent. Votre prénom convient aussi.', placeholder: 'Par exemple : Les créations d’Afi' },
  { key: 'services', title: 'Que proposez-vous à vos clientes ?', spoken: 'Quelles prestations proposez-vous à vos clientes ? Prenez votre temps pour les expliquer.', hint: 'Retouches, tenues sur mesure, tresses… Racontez avec vos mots.', placeholder: 'Je fais des retouches et des tenues sur mesure…', multiline: true },
  { key: 'city', title: 'Où peut-on vous trouver ?', spoken: 'Dans quelle ville et dans quel quartier travaillez-vous ? Pas besoin de donner votre adresse personnelle.', hint: 'Une ville et un quartier, sans votre adresse personnelle.', placeholder: 'Par exemple : Lomé, quartier Agoè' },
  { key: 'phone', title: 'Comment vous contacter ?', spoken: 'Quel numéro de téléphone ou de WhatsApp souhaitez-vous donner à vos clientes ? Vous pouvez aussi passer cette question.', hint: 'Un numéro professionnel. Vous choisirez ensuite de l’afficher ou non.', placeholder: '+228 90 00 00 00', optional: true },
  { key: 'extra', title: 'Un dernier mot sur votre savoir-faire ?', spoken: 'Y a-t-il autre chose que vous souhaitez dire sur votre travail ? Une spécialité, votre façon de travailler ou vos disponibilités ? Cette question est facultative.', hint: 'Une spécialité, vos disponibilités ou ce qui rend votre travail unique.', placeholder: 'Par exemple : Je reçois sur rendez-vous…', optional: true, multiline: true },
];
export function answerValue(profile: Profile, key: AnswerKey): string {
  return profile[key] || '';
}
export function cleanAnswer(key: AnswerKey, text: string) {
  let value = text.trim().replace(/\s+/g, ' ').slice(0, key === 'services' || key === 'extra' ? 1200 : 120);
  if (key === 'job') value = value.replace(/^(je suis|mon métier est|je travaille comme)\s+/i, '');
  if (key === 'name') value = value.replace(/^(mon atelier s'appelle|mon atelier se nomme|il s'appelle)\s+/i, '');
  if (key === 'owner') value = value.replace(/^(je m'appelle|mon prénom est|moi c'est)\s+/i, '');
  return value ? value.charAt(0).toLocaleUpperCase('fr') + value.slice(1) : '';
}
