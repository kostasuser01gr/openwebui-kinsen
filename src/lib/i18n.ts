// Lightweight i18n framework for Kinsen Chat
// Supports English (default) and Greek

export type Locale = 'en' | 'el';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'app.title': 'Kinsen Chat',
    'app.subtitle': 'Car Rental Ops Assistant',
    'login.title': 'Kinsen Chat',
    'login.subtitle': 'Car Rental Operations Hub',
    'login.passcode.tab': 'Passcode',
    'login.email.tab': 'Email Login',
    'login.passcode.placeholder': 'Enter staff passcode',
    'login.email.placeholder': 'Email address',
    'login.password.placeholder': 'Password',
    'login.button': 'Log In',
    'chat.placeholder': 'Ask about policies, procedures, pricing…',
    'chat.welcome': 'Welcome to Kinsen Chat',
    'chat.welcome.desc': 'Ask me about our car rental policies, procedures, and operations.',
    'chat.new': '+ New Conversation',
    'chat.export': 'Export Chat',
    'chat.sessions': 'Sessions',
    'sidebar.recent': 'Recent Searches',
    'panel.macros': 'Macros & Calculators',
    'panel.checklists': 'Checklists',
    'panel.workflows': 'Guided Workflows',
    'panel.customers': 'Customer Lookup',
    'panel.email': 'Email Generator',
    'panel.escalations': 'Escalations',
    'panel.vehicles': 'Vehicle Status Board',
    'admin.title': 'Admin Panel',
    'admin.knowledge': 'Knowledge Base',
    'admin.analytics': 'Analytics',
    'admin.users': 'Users',
    'admin.flags': 'Feature Flags',
    'admin.webhooks': 'Webhooks',
    'actions.search': 'Search',
    'actions.save': 'Save',
    'actions.cancel': 'Cancel',
    'actions.delete': 'Delete',
    'actions.close': 'Close',
    'actions.back': 'Back',
    'actions.next': 'Next',
    'actions.submit': 'Submit',
    'status.loading': 'Loading...',
    'status.no_results': 'No results found',
    'feedback.up': 'Helpful',
    'feedback.down': 'Not helpful',
  },
  el: {
    'app.title': 'Kinsen Chat',
    'app.subtitle': 'Βοηθός Ενοικίασης Αυτοκινήτων',
    'login.title': 'Kinsen Chat',
    'login.subtitle': 'Κέντρο Λειτουργιών Ενοικίασης',
    'login.passcode.tab': 'Κωδικός',
    'login.email.tab': 'Σύνδεση Email',
    'login.passcode.placeholder': 'Εισάγετε κωδικό προσωπικού',
    'login.email.placeholder': 'Διεύθυνση email',
    'login.password.placeholder': 'Κωδικός πρόσβασης',
    'login.button': 'Σύνδεση',
    'chat.placeholder': 'Ρωτήστε για πολιτικές, διαδικασίες, τιμολόγηση…',
    'chat.welcome': 'Καλώς ήρθατε στο Kinsen Chat',
    'chat.welcome.desc': 'Ρωτήστε μας για τις πολιτικές ενοικίασης αυτοκινήτων.',
    'chat.new': '+ Νέα Συνομιλία',
    'chat.export': 'Εξαγωγή Συνομιλίας',
    'chat.sessions': 'Συνεδρίες',
    'sidebar.recent': 'Πρόσφατες Αναζητήσεις',
    'panel.macros': 'Μακροεντολές & Υπολογιστές',
    'panel.checklists': 'Λίστες Ελέγχου',
    'panel.workflows': 'Καθοδηγούμενες Ροές',
    'panel.customers': 'Αναζήτηση Πελατών',
    'panel.email': 'Δημιουργία Email',
    'panel.escalations': 'Κλιμακώσεις',
    'panel.vehicles': 'Κατάσταση Στόλου',
    'admin.title': 'Πίνακας Διαχείρισης',
    'admin.knowledge': 'Βάση Γνώσεων',
    'admin.analytics': 'Αναλυτικά',
    'admin.users': 'Χρήστες',
    'admin.flags': 'Σημαίες Λειτουργιών',
    'admin.webhooks': 'Webhooks',
    'actions.search': 'Αναζήτηση',
    'actions.save': 'Αποθήκευση',
    'actions.cancel': 'Ακύρωση',
    'actions.delete': 'Διαγραφή',
    'actions.close': 'Κλείσιμο',
    'actions.back': 'Πίσω',
    'actions.next': 'Επόμενο',
    'actions.submit': 'Υποβολή',
    'status.loading': 'Φόρτωση...',
    'status.no_results': 'Δεν βρέθηκαν αποτελέσματα',
    'feedback.up': 'Χρήσιμο',
    'feedback.down': 'Μη χρήσιμο',
  },
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  try {
    localStorage.setItem('kinsen-locale', locale);
  } catch {
    /* SSR/test */
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kinsen-locale') as Locale | null;
    if (stored && translations[stored]) {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

export function t(key: string): string {
  return translations[currentLocale]?.[key] || translations.en[key] || key;
}

export function getAvailableLocales(): { code: Locale; label: string }[] {
  return [
    { code: 'en', label: 'English' },
    { code: 'el', label: 'Ελληνικά' },
  ];
}
