import React, { useMemo, useState, useEffect } from "react";
import { Navbar } from "./helpers/Navbar";
import { Footer } from "./helpers/Footer";
import { useNavigate, useLocation } from "react-router-dom";

/* --------- Übersetzungen (aus deiner Vorgabe) --------- */
const TERMS = {
  en: {
    langLabel: "English",
    flag: "🇬🇧",
    effective: "Effective Date: 09.02.2025",
    toc: [
      ["general", "1. General Terms"],
      ["usage", "2. App Usage"],
      ["subs", "3. Subscription & Payments"],
      ["renew", "4. Auto-Renewal & Cancellation"],
      ["refund", "6. Refund Policy"],
      ["withdrawal", "7. No Right of Withdrawal (EU)"],
      ["disclaimer", "8. Disclaimer of Liability"],
      ["changes", "9. Changes to the Terms"],
      ["account", "10. Account Termination & Deletion"],
    ],
    sections: {
      general:
        "This app is provided by Laurent Brückner. By using this app, you agree to these Terms of Use.",
      usage: `The app is designed for personal trade journaling and data analysis.
We do not guarantee the accuracy of calculations (e.g., win rate results).
You are responsible for ensuring the accuracy of your own input data.`,
      subs: `This app offers a weekly auto-renewing subscription through the Apple App Store.
Payment is charged to your Apple ID account upon confirmation of purchase.
Your subscription will automatically renew every week unless canceled at least 24 hours before the renewal date.
The cost of the subscription is displayed in the app and in the App Store purchase confirmation.
Taxes may be applied based on your country of residence.`,
      renew: `The subscription automatically renews each week unless you cancel it.
To cancel your subscription, you must go to Settings > Apple ID > Subscriptions and cancel at least 24 hours before renewal.
Deleting the app does not cancel your subscription. You must cancel it through Apple ID settings.`,
      refund: `All payments are handled by Apple Inc. through the App Store.
Refunds are not provided by the developer. If you believe you were charged incorrectly, contact Apple Support directly at Apple Support.`,
      withdrawal: `By purchasing a weekly subscription, you expressly agree that the service starts immediately, and you waive your right to withdraw from the purchase under EU consumer laws.`,
      disclaimer: `We are not liable for any financial losses or trading decisions made based on this app’s data.
This app does not provide financial advice and should not be interpreted as such.`,
      changes: `We reserve the right to modify these Terms of Use at any time.
The latest version will always be available within the app.`,
      account: `You can delete your account at any time.
We reserve the right to block or delete accounts that violate these terms.
Deleting your account does not cancel your subscription. You must cancel your subscription separately via Apple ID settings.`,
    },
  },
  de: {
    langLabel: "Deutsch",
    flag: "🇩🇪",
    effective: "Gültig ab: 09.02.2025",
    toc: [
      ["general", "1. Allgemeine Bedingungen"],
      ["usage", "2. Nutzung der App"],
      ["subs", "3. Abonnement & Zahlungen"],
      ["renew", "4. Automatische Verlängerung & Kündigung"],
      ["refund", "6. Erstattungsrichtlinien"],
      ["withdrawal", "7. Kein Widerrufsrecht (EU)"],
      ["disclaimer", "8. Haftungsausschluss"],
      ["changes", "9. Änderungen der AGB"],
      ["account", "10. Kontolöschung & Sperrung"],
    ],
    sections: {
      general:
        "Diese App wird von Laurent Brückner bereitgestellt. Durch die Nutzung dieser App stimmen Sie diesen AGB zu.",
      usage: `Die App dient zur persönlichen Dokumentation von Trades und zur Datenanalyse.
Wir garantieren nicht die Genauigkeit von Berechnungen (z. B. Gewinnraten).
Sie sind selbst für die Richtigkeit Ihrer Eingaben verantwortlich.`,
      subs: `Diese App bietet ein wöchentliches, automatisch verlängerndes Abonnement über den Apple App Store an.
Die Zahlung erfolgt über Ihr Apple-ID-Konto bei Bestätigung des Kaufs.
Ihr Abonnement verlängert sich automatisch jede Woche, es sei denn, Sie kündigen es mindestens 24 Stunden vor dem Verlängerungsdatum.
Die Abonnementkosten werden in der App und bei der Kaufbestätigung im App Store angezeigt.
Je nach Wohnsitzland können Steuern anfallen.`,
      renew: `Das Abonnement verlängert sich automatisch jede Woche, sofern Sie es nicht kündigen.
Um Ihr Abonnement zu kündigen, müssen Sie zu Einstellungen > Apple ID > Abonnements gehen und es mindestens 24 Stunden vor der Verlängerung kündigen.
Das Löschen der App beendet Ihr Abonnement nicht. Sie müssen es in den Apple-ID-Einstellungen kündigen.`,
      refund: `Alle Zahlungen werden von Apple Inc. über den App Store abgewickelt.
Der Entwickler bietet keine Rückerstattungen an. Falls Sie glauben, dass eine falsche Abbuchung erfolgte, wenden Sie sich direkt an den Apple Support unter Apple Support.`,
      withdrawal: `Durch den Kauf eines wöchentlichen Abonnements stimmen Sie ausdrücklich zu, dass der Service sofort beginnt, und verzichten auf Ihr Widerrufsrecht gemäß EU-Verbraucherschutzgesetzen.`,
      disclaimer: `Wir übernehmen keine Haftung für finanzielle Verluste oder Handelsentscheidungen, die auf den Daten dieser App basieren.
Diese App bietet keine Finanzberatung und darf nicht als solche interpretiert werden.`,
      changes: `Wir behalten uns das Recht vor, diese AGB jederzeit zu ändern.
Die neueste Version ist immer in der App verfügbar.`,
      account: `Sie können Ihr Konto jederzeit löschen.
Wir behalten uns das Recht vor, Konten zu sperren oder zu löschen, die gegen diese Bedingungen verstoßen.
Das Löschen Ihres Kontos beendet Ihr Abonnement nicht. Die Kündigung muss über die Apple-ID-Einstellungen erfolgen.`,
    },
  },
  es: {
    langLabel: "Español",
    flag: "🇪🇸",
    effective: "Fecha de entrada en vigor: 09.02.2025",
    toc: [
      ["general", "1. Condiciones generales"],
      ["usage", "2. Uso de la aplicación"],
      ["subs", "3. Suscripción y pagos"],
      ["renew", "4. Renovación automática y cancelación"],
      ["refund", "6. Política de reembolso"],
      ["withdrawal", "7. Sin derecho de desistimiento (UE)"],
      ["disclaimer", "8. Descargo de responsabilidad"],
      ["changes", "9. Cambios en los términos"],
      ["account", "10. Terminación y eliminación de la cuenta"],
    ],
    sections: {
      general:
        "Esta aplicación es proporcionada por Laurent Brückner. Al utilizar esta aplicación, aceptas estos términos de uso.",
      usage: `La aplicación está diseñada para el registro de operaciones personales y análisis de datos.
No garantizamos la precisión de los cálculos (por ejemplo, tasas de ganancia).
Eres responsable de la exactitud de tus propios datos ingresados.`,
      subs: `Esta aplicación ofrece una suscripción semanal de renovación automática a través de la App Store de Apple.
El pago se carga a tu cuenta de Apple ID al confirmar la compra.
Tu suscripción se renovará automáticamente cada semana, a menos que la canceles al menos 24 horas antes de la fecha de renovación.
El costo de la suscripción se muestra en la aplicación y en la confirmación de compra de la App Store.
Pueden aplicarse impuestos según tu país de residencia.`,
      renew: `La suscripción se renueva automáticamente cada semana a menos que la canceles.
Para cancelar tu suscripción, debes ir a Configuración > Apple ID > Suscripciones y cancelarla al menos 24 horas antes de la renovación.
Eliminar la aplicación no cancela tu suscripción. Debes cancelarla a través de la configuración de Apple ID.`,
      refund: `Todos los pagos son gestionados por Apple Inc. a través de la App Store.
El desarrollador no proporciona reembolsos. Si crees que se te ha cobrado incorrectamente, comunícate directamente con Apple Support en Apple Support.`,
      withdrawal: `Al comprar una suscripción semanal, aceptas expresamente que el servicio comienza de inmediato y renuncias a tu derecho de desistimiento según las leyes de protección al consumidor de la UE.`,
      disclaimer: `No somos responsables de ninguna pérdida financiera o decisiones comerciales basadas en los datos de esta aplicación.
Esta aplicación no proporciona asesoramiento financiero y no debe interpretarse como tal.`,
      changes: `Nos reservamos el derecho de modificar estos términos de uso en cualquier momento.
La última versión siempre estará disponible dentro de la aplicación.`,
      account: `Puedes eliminar tu cuenta en cualquier momento.
Nos reservamos el derecho de bloquear o eliminar cuentas que infrinjan estos términos.
Eliminar tu cuenta no cancela tu suscripción. Debes cancelarla por separado a través de la configuración de Apple ID.`,
    },
  },
  fr: {
    langLabel: "Français",
    flag: "🇫🇷",
    effective: "Date d’entrée en vigueur : 09.02.2025",
    toc: [
      ["general", "1. Dispositions générales"],
      ["usage", "2. Utilisation de l’application"],
      ["subs", "3. Abonnement et paiements"],
      ["renew", "4. Renouvellement automatique et annulation"],
      ["refund", "6. Politique de remboursement"],
      ["withdrawal", "7. Pas de droit de rétractation (UE)"],
      ["disclaimer", "8. Clause de non-responsabilité"],
      ["changes", "9. Modifications des CGU"],
      ["account", "10. Suppression et résiliation de compte"],
    ],
    sections: {
      general:
        "Cette application est fournie par Laurent Brückner. En utilisant cette application, vous acceptez ces Conditions Générales d’Utilisation.",
      usage: `L'application est conçue pour le suivi personnel des opérations de trading et l'analyse des données.
Nous ne garantissons pas l'exactitude des calculs (ex. : taux de réussite).
Vous êtes responsable de l'exactitude des données que vous saisissez dans l’application.`,
      subs: `Cette application propose un abonnement hebdomadaire avec renouvellement automatique via l'App Store d'Apple.
Le paiement est prélevé sur votre compte Apple ID dès la confirmation de l’achat.
Votre abonnement sera automatiquement renouvelé chaque semaine, sauf annulation au moins 24 heures avant la date de renouvellement.
Le prix de l'abonnement est affiché dans l'application et dans la confirmation d'achat de l'App Store.
Des taxes peuvent être appliquées en fonction de votre pays de résidence.`,
      renew: `L’abonnement se renouvelle automatiquement chaque semaine, sauf si vous l’annulez.
Pour annuler votre abonnement, vous devez vous rendre dans Réglages > Apple ID > Abonnements et l'annuler au moins 24 heures avant le renouvellement.
La suppression de l'application ne met pas fin à votre abonnement. Vous devez l'annuler via les paramètres Apple ID.`,
      refund: `Tous les paiements sont gérés par Apple Inc. via l'App Store.
Aucun remboursement n'est effectué par le développeur. Si vous pensez avoir été facturé par erreur, veuillez contacter l'Assistance Apple directement via Apple Support.`,
      withdrawal: `En souscrivant un abonnement hebdomadaire, vous acceptez expressément que le service commence immédiatement et vous renoncez à votre droit de rétractation conformément aux lois européennes sur la protection des consommateurs.`,
      disclaimer: `Nous ne sommes pas responsables des pertes financières ou des décisions de trading basées sur les données de cette application.
Cette application ne fournit pas de conseils financiers et ne doit pas être interprétée comme telle.`,
      changes: `Nous nous réservons le droit de modifier ces Conditions Générales d’Utilisation à tout moment.
La dernière version sera toujours disponible dans l'application.`,
      account: `Vous pouvez supprimer votre compte à tout moment.
Nous nous réservons le droit de bloquer ou de supprimer les comptes qui ne respectent pas ces conditions.
La suppression de votre compte ne met pas fin à votre abonnement. Vous devez l'annuler séparément via les paramètres Apple ID.`,
    },
  },
};


const POLICY = {
  en: {
    langLabel: "English",
    flag: "🇬🇧",
    title: "Acardia Journal App Privacy Policy",
    effective: "Effective Date: 09.02.2025",
    toc: [
      ["intro", "1. Introduction"],
      ["controller", "2. Data Controller"],
      ["collection", "3. Collection and Use of Personal Data"],
      ["firebase", "4. Use of Firebase"],
      ["security", "5. Data Security"],
      ["sharing", "6. Data Sharing with Third Parties"],
      ["rights", "7. Your Rights"],
      ["changes", "8. Changes to this Privacy Policy"],
      ["contact", "9. Contact"],
    ],
    sections: {
      intro:
        'This Privacy Policy informs you about the personal data ("Data") we collect, process, and use in connection with your use of the Acardia Journal app. We take the protection of your data very seriously.',
      controller: `The data controller responsible for processing under the General Data Protection Regulation (GDPR) is:
      
Laurent Brückner`,
      collection: `When you use our app, we collect the following personal data:

• Email address — used for registration and identification.
• Password — used solely for authentication and stored securely (e.g., hashed).

We use these data exclusively for:
• Granting access to the app and managing your user account.
• Improving and securing the app’s functionalities.`,
      firebase: `We use Firebase by Google LLC as a backend service provider for storing and managing your data as well as for authentication (email and password login). Your data may be processed on servers in the USA, the EU, or other countries.

For more information, see:
• Google Privacy Policy
• Firebase Privacy Policy`,
      security:
        "We implement technical and organizational measures to protect your data against unauthorized access, loss, or misuse. This includes encryption and regular security audits.",
      sharing:
        "Your personal data is not shared with third parties, except when necessary for contract fulfillment or if required by law.",
      rights:
        "You have the right to request information about your stored data, as well as to request correction, deletion, or limitation of processing. You may also object to processing and, where applicable, request data portability. To exercise your rights, please contact the data controller in Section 2.",
      changes:
        "We reserve the right to update this Privacy Policy to reflect current legal requirements or changes in our processing practices. The current version will be published in the app.",
      contact:
        "For any questions or concerns regarding data protection, please contact: acardia.journal@gmail.com",
    },
  },
  de: {
    langLabel: "Deutsch",
    flag: "🇩🇪",
    title: "Datenschutzerklärung zur Acardia Journal App",
    effective: "Stand: 09.02.2025",
    toc: [
      ["intro", "1. Einleitung"],
      ["controller", "2. Verantwortlicher"],
      ["collection", "3. Erhebung und Verwendung personenbezogener Daten"],
      ["firebase", "4. Nutzung von Firebase"],
      ["security", "5. Datensicherheit"],
      ["sharing", "6. Weitergabe von Daten an Dritte"],
      ["rights", "7. Ihre Rechte als Nutzer"],
      ["changes", "8. Änderungen dieser Datenschutzerklärung"],
      ["contact", "9. Kontakt"],
    ],
    sections: {
      intro:
        'Diese Datenschutzerklärung informiert Sie darüber, welche personenbezogenen Daten („Daten“) wir im Rahmen der Nutzung der App Acardia Journal erheben, verarbeiten und nutzen. Der Schutz Ihrer Daten ist uns sehr wichtig.',
      controller: `Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:
      
Laurent Brückner`,
      collection: `Bei der Nutzung unserer App erheben wir folgende personenbezogene Daten:

• E-Mail-Adresse – zur Registrierung und Identifizierung.
• Passwort – ausschließlich zur Authentifizierung, sicher gespeichert (z. B. Hashing).

Diese Daten werden ausschließlich verwendet für:
• Ermöglichung des Zugangs zur App und Verwaltung Ihres Nutzerkontos.
• Verbesserung und Absicherung der App-Funktionalitäten.`,
      firebase: `Wir nutzen Firebase von Google LLC als Backend-Dienstleister zur Speicherung und Verwaltung Ihrer Daten sowie zur Authentifizierung (Login mit E-Mail und Passwort). Daten können auf Servern in den USA, der EU oder anderen Ländern verarbeitet werden.

Weitere Informationen:
• Google Datenschutzbestimmungen
• Firebase-Datenschutzbestimmungen`,
      security:
        "Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten vor unbefugtem Zugriff, Verlust oder Missbrauch zu schützen. Dazu gehören u. a. Verschlüsselung und regelmäßige Sicherheitsüberprüfungen.",
      sharing:
        "Eine Weitergabe Ihrer personenbezogenen Daten erfolgt nicht an Dritte, außer wenn dies zur Vertragserfüllung notwendig ist oder wir gesetzlich dazu verpflichtet sind.",
      rights:
        "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch sowie – soweit anwendbar – Datenübertragbarkeit. Zur Ausübung Ihrer Rechte wenden Sie sich bitte an den in Abschnitt 2 genannten Verantwortlichen.",
      changes:
        "Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an rechtliche Anforderungen oder Änderungen unserer Verarbeitungspraxis anzupassen. Die jeweils aktuelle Fassung wird in der App veröffentlicht.",
      contact:
        "Bei Fragen oder Anliegen zum Datenschutz: acardia.journal@gmail.com",
    },
  },
  es: {
    langLabel: "Español",
    flag: "🇪🇸",
    title: "Política de Privacidad de la App Acardia Journal",
    effective: "Fecha de vigencia: 09.02.2025",
    toc: [
      ["intro", "1. Introducción"],
      ["controller", "2. Responsable del Tratamiento"],
      ["collection", "3. Recopilación y Uso de Datos Personales"],
      ["firebase", "4. Uso de Firebase"],
      ["security", "5. Seguridad de los Datos"],
      ["sharing", "6. Compartir Datos con Terceros"],
      ["rights", "7. Sus Derechos"],
      ["changes", "8. Cambios en esta Política de Privacidad"],
      ["contact", "9. Contacto"],
    ],
    sections: {
      intro:
        'Esta Política de Privacidad le informa sobre los datos personales ("Datos") que recopilamos, procesamos y utilizamos en relación con el uso de la aplicación Acardia Journal. Nos tomamos muy en serio la protección de sus datos.',
      controller: `El responsable del tratamiento de datos conforme al RGPD es:
      
Laurent Brückner`,
      collection: `Cuando utiliza nuestra aplicación, recopilamos los siguientes datos personales:

• Correo electrónico — para registro e identificación.
• Contraseña — solo para autenticación y almacenada de forma segura (por ejemplo, con hash).

Usamos estos datos exclusivamente para:
• Permitir el acceso a la aplicación y gestionar su cuenta.
• Mejorar y asegurar las funcionalidades de la aplicación.`,
      firebase: `Utilizamos Firebase de Google LLC como proveedor de backend para almacenar y gestionar sus datos y para la autenticación (inicio de sesión con correo y contraseña). Sus datos pueden procesarse en servidores ubicados en EE. UU., la UE u otros países.

Más información:
• Política de Privacidad de Google
• Política de Privacidad de Firebase`,
      security:
        "Aplicamos medidas técnicas y organizativas para proteger sus datos contra accesos no autorizados, pérdidas o usos indebidos, incluyendo cifrado y auditorías regulares.",
      sharing:
        "Sus datos personales no se comparten con terceros, salvo cuando sea necesario para el cumplimiento del contrato o cuando la ley lo exija.",
      rights:
        "Usted puede solicitar acceso, rectificación, supresión, limitación, oposición y, cuando proceda, portabilidad de sus datos. Para ejercer sus derechos, contacte con el responsable del tratamiento indicado en la Sección 2.",
      changes:
        "Nos reservamos el derecho de actualizar esta Política de Privacidad según requisitos legales o cambios en nuestras prácticas. La versión vigente se publicará en la app.",
      contact:
        "Para consultas relacionadas con protección de datos: acardia.journal@gmail.com",
    },
  },
  fr: {
    langLabel: "Français",
    flag: "🇫🇷",
    title: "Politique de Confidentialité de l’App Acardia Journal",
    effective: "Date d’entrée en vigueur : 09.02.2025",
    toc: [
      ["intro", "1. Introduction"],
      ["controller", "2. Responsable du Traitement"],
      ["collection", "3. Collecte et Utilisation des Données Personnelles"],
      ["firebase", "4. Utilisation de Firebase"],
      ["security", "5. Sécurité des Données"],
      ["sharing", "6. Partage des Données avec des Tiers"],
      ["rights", "7. Vos Droits"],
      ["changes", "8. Modifications de cette Politique de Confidentialité"],
      ["contact", "9. Contact"],
    ],
    sections: {
      intro:
        'La présente Politique de Confidentialité vous informe sur les données personnelles ("Données") que nous collectons, traitons et utilisons lors de l’utilisation de l’application Acardia Journal.',
      controller: `Le responsable du traitement au sens du RGPD est :
      
Laurent Brückner`,
      collection: `Lorsque vous utilisez notre application, nous collectons les données personnelles suivantes :

• Adresse e-mail — utilisée pour l’inscription et l’identification.
• Mot de passe — utilisé uniquement pour l’authentification et stocké de manière sécurisée (p. ex. hachage).

Ces données sont utilisées exclusivement pour :
• Permettre l’accès à l’application et gérer votre compte utilisateur.
• Améliorer et sécuriser les fonctionnalités de l’application.`,
      firebase: `Nous utilisons Firebase de Google LLC comme service backend pour stocker et gérer vos données et pour l’authentification (connexion par e-mail et mot de passe). Vos données peuvent être traitées sur des serveurs situés aux États-Unis, dans l’UE ou ailleurs.

Informations complémentaires :
• Politique de Confidentialité de Google
• Politique de Confidentialité de Firebase`,
      security:
        "Nous appliquons des mesures techniques et organisationnelles (chiffrement, contrôles, audits) pour protéger vos données.",
      sharing:
        "Vos données personnelles ne sont pas partagées avec des tiers, sauf si nécessaire à l’exécution d’un contrat ou exigé par la loi.",
      rights:
        "Vous disposez de droits d’accès, rectification, suppression, limitation, opposition et, le cas échéant, portabilité des données. Pour exercer vos droits, contactez le responsable figurant à la Section 2.",
      changes:
        "Nous pouvons mettre à jour cette Politique de Confidentialité pour refléter les exigences légales ou des changements de pratiques. La version à jour sera publiée dans l’app.",
      contact:
        "Questions relatives à la protection des données : acardia.journal@gmail.com",
    },
  },
};




function LastUpdated({ dateStr }) {
  return (
    <div className="text-xs text-neutral-400 mt-2">
      Last updated: {dateStr}
    </div>
  );
}


/* ---------- Shared UI bits ---------- */
function PageContainer({ title, subtitle, children }) {
  return (
    <div className="relative w-full min-h-screen" style={{ background: "#181818" }}>
      <Navbar />
      <div className="h-[88px]" />
      <header className="max-w-5xl mx-auto px-4 pt-10">
        <div
          className="rounded-2xl p-6 md:p-8 border shadow-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <h1 className="text-white text-3xl md:text-4xl font-extrabold">{title}</h1>
          {subtitle && (
            <p className="text-neutral-300 mt-2 max-w-2xl">{subtitle}</p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        {children}
      </main>

      <Footer />
    </div>
  );
}

/* --------- UI-Helfer --------- */
function SectionCard({ id, title, children }) {
  return (
    <section id={id} className="mb-6">
      <div
        className="rounded-2xl p-6 md:p-7 border"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">{title}</h2>
        <div className="text-neutral-200 leading-relaxed whitespace-pre-line">
          {children}
        </div>
      </div>
    </section>
  );
}


export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sprache aus URL-Hash (#de/#es/#fr/#en) oder Default 'en'
  const initialLang = useMemo(() => {
    const hash = (location.hash || "").replace("#", "").toLowerCase();
    return ["en", "de", "es", "fr"].includes(hash) ? hash : "en";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // bei Erst-Mount bestimmen

  const [lang, setLang] = useState(initialLang);
  const t = POLICY[lang];
  const updated = useMemo(() => "October 20, 2025", []);

  // Bei Hash-Änderung zu Sektionen scrollen (falls #intro etc.)
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  function changeLang(next) {
    setLang(next);
    if (location.hash !== `#${next}`) {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

  return (
    <div className="relative w-full min-h-screen" style={{ background: "#181818" }}>
      <Navbar />
      <div className="h-[88px]" />

      {/* Header / Hero */}
      <header className="max-w-5xl mx-auto px-4 pt-10">
        <div
          className="rounded-2xl p-6 md:p-8 border shadow-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h1 className="text-white text-3xl md:text-4xl font-extrabold flex-1">
              {t.title}
            </h1>

            {/* Sprachumschalter */}
            <div className="flex flex-wrap items-center gap-2">
              {["en", "de", "es", "fr"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => changeLang(code)}
                  className={`px-3 py-2 rounded-xl text-sm border transition ${
                    lang === code ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{
                    background: "#1f1f1f",
                    borderColor: "rgba(255,255,255,0.14)",
                    color: "#fff",
                  }}
                  aria-pressed={lang === code}
                >
                  <span className="mr-2">{POLICY[code].flag}</span>
                  {POLICY[code].langLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="text-neutral-300 mt-3">{t.effective}</div>
          <LastUpdated dateStr={updated} />

          {/* Header-Quicklinks */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
              onClick={() => navigate("/")}
            >
              Home
            </button>
            <button
              className="px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
              onClick={() => navigate("/help")}
            >
              App Support
            </button>
            <button
              className="px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
              onClick={() => navigate("/terms")}
            >
              Terms of Use
            </button>
          </div>
        </div>
      </header>

      {/* Inhalt + Sticky TOC */}
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        <div className="grid md:grid-cols-[240px,1fr] gap-6">
          <aside
            className="hidden md:block sticky self-start top-28 rounded-2xl p-4 border text-sm"
            style={{ background: "#1b1b1b", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="font-semibold text-neutral-200 mb-2">On this page</div>
            <nav className="space-y-2">
              {t.toc.map(([id, label]) => (
                <a key={id} className="block text-neutral-400 hover:text-white" href={`#${id}`}>
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div>
            {t.toc.map(([id, label]) => (
              <SectionCard key={id} id={id} title={label}>
                {t.sections[id]}
              </SectionCard>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export function TermsOfUsePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sprache aus URL-Hash (#de / #es / #fr / #en) oder Default 'en'
  const initialLang = useMemo(() => {
    const hash = (location.hash || "").replace("#", "").toLowerCase();
    return ["en", "de", "es", "fr"].includes(hash) ? hash : "en";
  }, [location.hash]);

  const [lang, setLang] = useState(initialLang);
  const t = TERMS[lang];

  // Bei Hash-Änderung automatisch zu Sektionen scrollen
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  function changeLang(next) {
    setLang(next);
    // Hash auf die Sprache setzen, damit Link teilbar ist
    if (location.hash !== `#${next}`) {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

  return (
    <div className="relative w-full min-h-screen" style={{ background: "#181818" }}>
      <Navbar />
      <div className="h-[88px]" />

      {/* Header / Hero */}
      <header className="max-w-5xl mx-auto px-4 pt-10">
        <div
          className="rounded-2xl p-6 md:p-8 border shadow-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h1 className="text-white text-3xl md:text-4xl font-extrabold flex-1">
              Terms of Use
            </h1>

            {/* Sprachumschalter mit Flaggen */}
            <div className="flex flex-wrap items-center gap-2">
             {["en", "de", "es", "fr"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => changeLang(code)}
                  className={`px-3 py-2 rounded-xl text-sm border transition ${
                    lang === code ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{
                    background: "#1f1f1f",
                    borderColor: "rgba(255,255,255,0.14)",
                    color: "#fff",
                  }}
                  aria-pressed={lang === code}
                >
                  <span className="mr-2">{TERMS[code].flag}</span>
                  {TERMS[code].langLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="text-neutral-300 mt-3">{t.effective}</div>

          {/* Quicklinks im Header */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
              onClick={() => navigate("/")}
            >
              Home
            </button>
            <button
              className="px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
              onClick={() => navigate("/help")}
            >
              App Support
            </button>
            <button
              className="px-4 py-2 rounded-full text-sm border"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
              onClick={() => navigate("/privacy")}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </header>

      {/* Inhalt + Sticky TOC */}
      <main className="max-w-5xl mx-auto px-4 py-10 text-white">
        <div className="grid md:grid-cols-[240px,1fr] gap-6">
          <aside
            className="hidden md:block sticky self-start top-28 rounded-2xl p-4 border text-sm"
            style={{ background: "#1b1b1b", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="font-semibold text-neutral-200 mb-2">On this page</div>
            <nav className="space-y-2">
              {t.toc.map(([id, label]) => (
                <a
                  key={id}
                  className="block text-neutral-400 hover:text-white"
                  href={`#${id}`}
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div>
            {t.toc.map(([id, label]) => (
              <SectionCard key={id} id={id} title={label}>
                {t.sections[id]}
              </SectionCard>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


/* ---------- Help Center (with mailto form) ---------- */
export function HelpCenterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
 const navigate = useNavigate(); // ← NEU
  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function submitMailto(e) {
    e.preventDefault();
    if (!form.email || !form.message || !form.subject) {
      alert("Please fill at least Email, Subject and Message.");
      return;
    }
    setSending(true);
    
    const to = "acardia.journal@gmail.com";
    const subject = encodeURIComponent(form.subject);
    const body = encodeURIComponent(
      `From: ${form.name || "Anonymous"} <${form.email}>\n\n${form.message}`
    );
    // Opens mail client with populated email
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    // small UX delay
    setTimeout(() => setSending(false), 800);
  }

  return (
    <PageContainer
      title="Help Center"
      subtitle="Tell us what's going on — we usually reply within 1–2 business days."
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Form */}
        <div
          className="rounded-2xl p-6 md:p-7 border"
          style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-2xl font-bold mb-2">Contact Support</h2>
          <p className="text-neutral-300 mb-6">
            Your message will open your default email app addressed to{" "}
            <span className="underline">acardia.journal@gmail.com</span>.
          </p>

          <form onSubmit={submitMailto} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-neutral-300">Name</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className="mt-1 w-full rounded-xl px-3 py-2 bg-[#151515] border outline-none focus:ring-2"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-300">Email *</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                  className="mt-1 w-full rounded-xl px-3 py-2 bg-[#151515] border outline-none focus:ring-2"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-neutral-300">Subject *</span>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={onChange}
                required
                className="mt-1 w-full rounded-xl px-3 py-2 bg-[#151515] border outline-none focus:ring-2"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                placeholder="e.g., Billing, Bug report, Feature request"
              />
            </label>

            <label className="block">
              <span className="text-sm text-neutral-300">Message *</span>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                required
                rows={6}
                className="mt-1 w-full rounded-xl px-3 py-2 bg-[#151515] border outline-none focus:ring-2"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "#fff", resize: "vertical" }}
                placeholder="Describe the issue. Steps to reproduce really help."
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2 rounded-full font-semibold"
                style={{
                  background:
                    "linear-gradient(45deg, #e82fa6 0%, #2c60fa 100%)",
                  color: "#fff",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Opening mail app…" : "Send email"}
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-full border text-sm"
                style={{ borderColor: "rgba(255,255,255,0.18)" }}
                onClick={() =>
                  navigator.clipboard.writeText("acardia.journal@gmail.com")
                }
                title="Copy email address"
              >
                Copy address
              </button>
            </div>
          </form>
        </div>

        {/* Quick links / Tips */}
         <div
          className="rounded-2xl p-6 md:p-7 border"
          style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <h3 className="text-xl font-bold mb-3">Quick links</h3>

          {/* ✅ Klickbare Links per navigate() */}
          <ul className="space-y-3 text-neutral-200">
            <li>
              • Check our{" "}
              <button
                type="button"
                className="underline hover:opacity-90"
                onClick={() => navigate("/privacy")}
                aria-label="Open Privacy Policy"
              >
                Privacy Policy
              </button>{" "}
              for data & permissions.
            </li>
            <li>
              • Review the{" "}
              <button
                type="button"
                className="underline hover:opacity-90"
                onClick={() => navigate("/terms")}
                aria-label="Open Terms of Use"
              >
                Terms of Use
              </button>{" "}
              if you’re unsure about licensing.
            </li>
            <li>
              • Include screenshots and app version when reporting bugs.
            </li>
          </ul>

          <div
            className="mt-6 p-4 rounded-xl text-sm"
            style={{ background: "#212121", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            Tip: If no email app opens, click “Copy address” and email us manually from
            your client.
          </div>
        </div>
      </div>
    </PageContainer>
  );
}