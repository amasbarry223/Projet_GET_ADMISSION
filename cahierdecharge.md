# CAHIER DES CHARGES — GET ADMISSION

**Plateforme web de gestion d'une agence d'admission universitaire**
Intermédiation entre étudiants étrangers et universités partenaires

*Confidentiel — GET Admission*

| | |
|---|---|
| **Type de solution** | Application web (back-office + espace candidat). Aucune application mobile. |
| **Périmètre** | Vitrine publique, espace étudiant, back-office d'administration |
| **Version du document** | 1.0 |
| **Date** | Juin 2026 |
| **Statut** | Pour validation |

---

## Sommaire

1. Présentation du projet
   - 1.1. Contexte
   - 1.2. Objectifs
   - 1.3. Périmètre
   - 1.4. Définitions et acronymes
2. Acteurs du système
   - 2.1. Cartographie des acteurs
   - 2.2. Description détaillée
3. Besoins fonctionnels
   - 3.1. Module Vitrine publique
   - 3.2. Module Compte & Authentification
   - 3.3. Module Dossier d'admission
   - 3.4. Module Paiement des frais d'agence
   - 3.5. Module Suivi & Notifications
   - 3.6. Module Attestation
4. Back-office d'administration
   - 4.1. Tableau de bord
   - 4.2. Gestion des dossiers
   - 4.3. Gestion du catalogue
   - 4.4. Gestion financière
   - 4.5. Gestion des utilisateurs internes
   - 4.6. Paramétrage & contenus
   - 4.7. Supervision & sécurité
5. Gestion des rôles et permissions (RBAC)
6. Cycle de vie d'un dossier
7. Besoins non fonctionnels
8. Architecture technique proposée
   - 8.1. Stack applicative
   - 8.2. Principes d'architecture
9. Arborescence fonctionnelle
   - 9.1. Espace public & candidat
   - 9.2. Back-office agence
10. Planning prévisionnel
11. Budget estimatif
12. Livrables et conditions
    - 12.1. Livrables attendus
    - 12.2. Hypothèses et prérequis
    - 12.3. Évolutions envisagées (post-V1)

---

## 1. Présentation du projet

### 1.1. Contexte

L'agence porteuse du projet exerce une activité d'intermédiation entre des étudiants étrangers et des universités partenaires. Aujourd'hui, le traitement des candidatures repose sur des échanges manuels (e-mails, messageries, déplacements physiques, suivi sur tableur), ce qui engendre des pertes d'information, des délais difficiles à maîtriser et un manque de visibilité pour le candidat comme pour l'agence.

GET Admission est la plateforme web destinée à digitaliser et centraliser l'ensemble du parcours d'admission : de la création de compte du candidat jusqu'à la remise de l'attestation de pré-inscription, en passant par la soumission du dossier, le paiement en ligne des frais d'agence et le suivi en temps réel de l'avancement.

### 1.2. Objectifs

La plateforme doit permettre :

**Pour l'étudiant étranger :**
- Créer un compte personnel sécurisé.
- Choisir une université partenaire et la formation visée.
- Constituer et soumettre son dossier d'admission (pièces justificatives en ligne).
- Régler les frais de l'agence en ligne.
- Suivre l'évolution de son dossier en temps réel.
- Recevoir son attestation de pré-inscription dans son espace personnel, ou venir la récupérer à l'agence.

**Pour l'agence :**
- Centraliser tous les dossiers dans un back-office unique.
- Affecter, traiter et valider les dossiers selon un circuit clair.
- Gérer le catalogue des universités partenaires et des formations.
- Suivre les encaissements et la facturation des frais d'agence.
- Émettre et délivrer les attestations de pré-inscription.
- Piloter l'activité via des tableaux de bord et des statistiques.

### 1.3. Périmètre

| Inclus dans le périmètre | Hors périmètre (V1) |
|---|---|
| Site vitrine public et catalogue des universités | Application mobile native (iOS / Android) |
| Espace candidat (étudiant étranger) | Place de marché ouverte à des agences tierces |
| Back-office d'administration (agence) | Gestion du logement / visa / billetterie |
| Paiement en ligne des frais d'agence | Comptabilité analytique complète / ERP |
| Suivi de dossier en temps réel et notifications | Cours en ligne / LMS |
| Génération et délivrance d'attestations | Portail université autonome (prévu Phase 2) |

> **Important :** GET Admission est une solution 100 % web (poste de travail et navigateur). Aucune application mobile n'est prévue. L'interface reste néanmoins responsive pour rester lisible sur tablette et grand écran.

### 1.4. Définitions et acronymes

| Terme | Définition |
|---|---|
| Candidat / Étudiant | Étudiant étranger souhaitant intégrer une université partenaire via l'agence. |
| Dossier d'admission | Ensemble des informations et pièces soumises par le candidat pour une université. |
| Frais d'agence | Montant facturé par l'agence pour le service d'intermédiation et d'accompagnement. |
| Attestation de préinscription | Document délivré confirmant la pré-admission du candidat. |
| Back-office | Interface d'administration réservée au personnel de l'agence. |
| RBAC | Role-Based Access Control : gestion des droits par rôle. |
| KYC | Know Your Customer : vérification d'identité du candidat. |
| SLA | Service Level Agreement : engagement de niveau de service. |

---

## 2. Acteurs du système

Le système distingue les acteurs externes (côté candidat) et les acteurs internes (côté agence). Chaque acteur dispose d'un périmètre d'action et de droits propres, gérés par le système RBAC (voir §5).

### 2.1. Cartographie des acteurs

| Acteur | Type | Rôle principal |
|---|---|---|
| Visiteur | Externe | Consulte la vitrine et le catalogue des universités sans authentification. |
| Étudiant / Candidat | Externe | Crée son compte, soumet son dossier, paie et suit l'avancement. |
| Conseiller / Gestionnaire de dossiers | Interne | Traite les dossiers, vérifie les pièces, échange avec le candidat. |
| Responsable financier / Comptable | Interne | Suit les paiements, valide les encaissements, gère la facturation. |
| Administrateur (Admin) | Interne | Gère universités, formations, contenus, utilisateurs et paramètres. |
| Super Administrateur | Interne | Contrôle total : rôles, configuration système, sécurité, journaux. |
| Université partenaire | Externe (Phase 2) | Accès portail limité pour recevoir et statuer sur les dossiers transmis. |

### 2.2. Description détaillée

**Étudiant / Candidat**
- S'inscrit, complète son profil et renseigne ses informations personnelles et académiques.
- Sélectionne une université partenaire et une formation.
- Téléverse ses pièces (diplômes, relevés, passeport, photo, lettre de motivation…).
- Règle les frais d'agence en ligne et télécharge son reçu.
- Suit l'état de son dossier et reçoit des notifications à chaque étape.
- Récupère son attestation de pré-inscription en ligne ou à l'agence.

**Conseiller / Gestionnaire de dossiers**
- Reçoit les dossiers affectés et les traite selon le circuit défini.
- Vérifie la conformité des pièces et demande les corrections nécessaires.
- Échange avec le candidat via la messagerie interne du dossier.
- Met à jour le statut du dossier et le transmet à l'université.

**Responsable financier / Comptable**
- Consulte l'ensemble des transactions et leur statut.
- Valide les paiements et gère les cas particuliers (remboursements, échecs).
- Émet et exporte les factures / reçus.
- Suit les indicateurs financiers (encaissements, impayés, chiffre d'affaires).

**Administrateur**
- Gère le catalogue : universités partenaires, formations, frais associés.
- Gère les comptes du personnel et leurs affectations.
- Administre les contenus de la vitrine, les modèles de documents et de notifications.
- Paramètre les frais d'agence, les modes de paiement et les règles de workflow.

**Super Administrateur**
- Dispose de tous les droits, y compris la gestion des rôles et permissions.
- Configure les paramètres systèmes critiques et les intégrations.
- Consulte les journaux d'audit et supervise la sécurité de la plateforme.

---

## 3. Besoins fonctionnels

Les besoins fonctionnels sont organisés en modules. Chaque exigence est identifiée par un code (BF-xx) pour faciliter le suivi et la recette.

### 3.1. Module Vitrine publique

| Code | Exigence |
|---|---|
| BF-01 | Page d'accueil présentant l'agence, ses services et ses chiffres clés. |
| BF-02 | Catalogue des universités partenaires avec recherche et filtres (pays, domaine, niveau). |
| BF-03 | Fiche détaillée d'une université (présentation, formations, frais indicatifs, prérequis). |
| BF-04 | Pages institutionnelles : à propos, FAQ, contact, mentions légales. |
| BF-05 | Appels à l'action vers la création de compte et la soumission de dossier. |

### 3.2. Module Compte & Authentification

| Code | Exigence |
|---|---|
| BF-06 | Création de compte candidat (e-mail + mot de passe) avec vérification de l'e-mail. |
| BF-07 | Connexion sécurisée et gestion de session. |
| BF-08 | Récupération et réinitialisation du mot de passe. |
| BF-09 | Gestion du profil : informations personnelles, coordonnées, nationalité, photo. |
| BF-10 | Données KYC : pièce d'identité / passeport téléversés et vérifiables par l'agence. |

### 3.3. Module Dossier d'admission

| Code | Exigence |
|---|---|
| BF-11 | Choix de l'université partenaire et de la formation visée. |
| BF-12 | Formulaire d'admission multi-étapes avec sauvegarde en brouillon. |
| BF-13 | Téléversement des pièces justificatives (formats et tailles contrôlés). |
| BF-14 | Contrôle de complétude avant soumission (pièces obligatoires). |
| BF-15 | Soumission du dossier et passage en file de traitement. |
| BF-16 | Possibilité de corriger / recompléter un dossier renvoyé par le conseiller. |
| BF-17 | Historique des actions et journal des échanges par dossier. |

### 3.4. Module Paiement des frais d'agence

| Code | Exigence |
|---|---|
| BF-18 | Affichage du montant des frais d'agence selon l'université / la formation. |
| BF-19 | Paiement en ligne via Mobile Money (Orange Money, Moov, Wave) et carte bancaire. |
| BF-20 | Confirmation de paiement et génération automatique d'un reçu téléchargeable. |
| BF-21 | Gestion des statuts de paiement (en attente, confirmé, échoué, remboursé). |
| BF-22 | Rapprochement automatique du paiement avec le dossier concerné. |
| BF-23 | Option de paiement en plusieurs tranches (paramétrable par l'agence). |

### 3.5. Module Suivi & Notifications

| Code | Exigence |
|---|---|
| BF-24 | Tableau de bord candidat affichant l'état d'avancement en temps réel. |
| BF-25 | Frise / timeline des étapes du dossier avec horodatage. |
| BF-26 | Notifications par e-mail et notifications in-app à chaque changement d'état. |
| BF-27 | Messagerie interne entre le candidat et son conseiller. |
| BF-28 | Alertes sur action requise (pièce manquante, paiement en attente). |

### 3.6. Module Attestation

| Code | Exigence |
|---|---|
| BF-29 | Génération de l'attestation de pré-inscription à partir d'un modèle paramétrable. |
| BF-30 | Mise à disposition de l'attestation dans l'espace candidat (téléchargement PDF). |
| BF-31 | Option « récupération à l'agence » avec marquage du mode de remise. |
| BF-32 | Numérotation unique et code de vérification de l'authenticité du document. |

---

## 4. Back-office d'administration

Le back-office est l'interface de pilotage réservée au personnel de l'agence. Il regroupe l'ensemble des fonctions de traitement, de gestion et de supervision. L'accès et les fonctions visibles dépendent du rôle de l'utilisateur (voir §5).

### 4.1. Tableau de bord
- Indicateurs clés : nouveaux dossiers, dossiers en cours, taux d'acceptation, encaissements.
- Graphiques d'évolution (dossiers par période, par université, par statut).
- File des dossiers nécessitant une action prioritaire.

### 4.2. Gestion des dossiers
- Liste filtrable et triable de tous les dossiers (statut, université, conseiller, date).
- Vue détaillée : profil candidat, pièces, paiements, historique, échanges.
- Affectation manuelle ou automatique d'un dossier à un conseiller.
- Vérification des pièces, demande de correction, validation ou rejet motivé.
- Changement de statut et transmission à l'université partenaire.
- Émission de l'attestation et choix du mode de remise.

### 4.3. Gestion du catalogue
- Universités partenaires : création, modification, activation / désactivation.
- Formations : niveau, domaine, prérequis, pièces exigées, frais d'agence associés.
- Modèles de pièces obligatoires par université / formation.

### 4.4. Gestion financière
- Suivi des transactions et de leur statut.
- Édition des reçus et factures, exports comptables (CSV / PDF).
- Tableau des encaissements, impayés et remboursements.

### 4.5. Gestion des utilisateurs internes
- Création des comptes du personnel et attribution des rôles.
- Activation / suspension de comptes.
- Suivi de l'activité (dernière connexion, charge de dossiers par conseiller).

### 4.6. Paramétrage & contenus
- Modèles d'attestations, de reçus et de notifications.
- Paramétrage des frais, des modes de paiement et des règles de workflow.
- Gestion des contenus de la vitrine (pages, FAQ, actualités).

### 4.7. Supervision & sécurité
- Journal d'audit des actions sensibles (qui, quoi, quand).
- Gestion des rôles et permissions (réservé au Super Administrateur).
- Sauvegardes et paramètres système.

---

## 5. Gestion des rôles et permissions (RBAC)

Chaque utilisateur est rattaché à un rôle unique déterminant ses droits. La matrice ci-dessous synthétise les accès par fonction.

**Légende :** ● accès complet · ◐ accès partiel / conditionnel · ✕ aucun accès

| Fonction | Candidat | Conseiller | Financier | Admin | Super Admin |
|---|---|---|---|---|---|
| Consulter la vitrine / catalogue | ● | ● | ● | ● | ● |
| Créer / soumettre un dossier | ● | ✕ | ✕ | ✕ | ✕ |
| Payer les frais d'agence | ● | ✕ | ✕ | ✕ | ✕ |
| Suivre son propre dossier | ● | ✕ | ✕ | ✕ | ✕ |
| Traiter / vérifier les dossiers | ✕ | ● | ◐ | ● | ● |
| Transmettre à l'université | ✕ | ● | ✕ | ● | ● |
| Émettre une attestation | ✕ | ◐ | ✕ | ● | ● |
| Gérer les paiements / factures | ✕ | ✕ | ● | ◐ | ● |
| Gérer le catalogue universités | ✕ | ✕ | ✕ | ● | ● |
| Gérer les utilisateurs internes | ✕ | ✕ | ✕ | ● | ● |
| Paramétrer le système | ✕ | ✕ | ✕ | ◐ | ● |
| Gérer rôles & permissions | ✕ | ✕ | ✕ | ✕ | ● |
| Consulter les journaux d'audit | ✕ | ✕ | ✕ | ◐ | ● |

> **Note :** le Super Administrateur hérite de tous les droits. Le rôle « Université partenaire » (Phase 2) disposera d'un accès restreint aux seuls dossiers qui lui sont transmis.

---

## 6. Cycle de vie d'un dossier

Le dossier d'admission suit un circuit d'états bien défini. Chaque transition déclenche une notification et est tracée dans l'historique.

| # | État | Description | Acteur déclencheur |
|---|---|---|---|
| 1 | Brouillon | Le candidat complète son dossier sans l'avoir soumis. | Candidat |
| 2 | Soumis | Le dossier est envoyé et entre en file de traitement. | Candidat |
| 3 | En vérification | Les pièces et informations sont contrôlées. | Conseiller |
| 4 | À corriger | Une ou plusieurs pièces sont non conformes. | Conseiller |
| 5 | Paiement en attente | Le dossier est conforme, frais d'agence à régler. | Système |
| 6 | Paiement confirmé | Les frais d'agence ont été encaissés. | Système / Financier |
| 7 | Transmis à l'université | Le dossier est envoyé à l'université partenaire. | Conseiller / Admin |
| 8 | En attente de réponse | Décision de l'université en cours. | Université |
| 9 | Pré-admission accordée | Le candidat est accepté en pré-inscription. | Université / Admin |
| 10 | Refusé | La candidature n'est pas retenue. | Université / Admin |
| 11 | Attestation disponible | L'attestation est émise et mise à disposition. | Admin / Conseiller |
| 12 | Clôturé | Le dossier est finalisé et archivé. | Système |

> **Règle :** un dossier ne peut être transmis à l'université qu'après confirmation du paiement des frais d'agence (état 6). Tout retour de l'université en état 4 « À corriger » rouvre le dossier au candidat.

---

## 7. Besoins non fonctionnels

| Catégorie | Exigence |
|---|---|
| Performance | Temps de réponse des pages < 2 s en conditions normales ; téléversement de pièces jusqu'à 10 Mo par fichier. |
| Disponibilité | Disponibilité cible 99,5 % ; sauvegardes automatiques quotidiennes. |
| Sécurité | Chiffrement des données en transit (HTTPS/TLS) et au repos ; mots de passe hachés ; protection contre les attaques courantes (XSS, CSRF, injection). |
| Confidentialité | Accès aux données personnelles limité par rôle ; journalisation des accès aux données sensibles. |
| Protection des données | Conformité aux principes de protection des données personnelles (consentement, durée de conservation, droit d'accès et de suppression). |
| Compatibilité | Navigateurs récents (Chrome, Edge, Firefox, Safari) ; interface responsive desktop / tablette. |
| Ergonomie | Parcours candidat clair en moins de 5 étapes ; messages d'erreur explicites ; interface en français. |
| Scalabilité | Architecture capable d'absorber la montée en charge lors des périodes de campagne. |
| Traçabilité | Historisation complète des actions sur les dossiers et journal d'audit administrateur. |
| Maintenabilité | Code documenté, modulaire ; environnement de test distinct de la production. |

---

## 8. Architecture technique proposée

L'architecture proposée est indicative et pourra être ajustée lors de la phase de conception détaillée.

### 8.1. Stack applicative

| Couche | Technologies envisagées |
|---|---|
| Front-end | React / Next.js, Tailwind CSS — interfaces vitrine, espace candidat et back-office. |
| Back-end / API | Node.js (NestJS / Express) — API REST sécurisée. |
| Base de données | PostgreSQL (données relationnelles) ; stockage objet pour les pièces jointes. |
| Authentification | JWT / sessions ; contrôle d'accès basé sur les rôles (RBAC). |
| Paiement | Intégration des agrégateurs Mobile Money (UEMOA) et passerelle carte bancaire. |
| Notifications | E-mail transactionnel ; notifications in-app temps réel. |
| Documents | Génération PDF des attestations et reçus à partir de modèles. |
| Hébergement | Serveur cloud avec sauvegardes automatiques et certificat SSL. |

### 8.2. Principes d'architecture
- Séparation claire entre vitrine publique, espace candidat et back-office.
- API centralisée exposant les services métier (dossiers, paiements, utilisateurs).
- Couche de sécurité transverse appliquant les règles RBAC à chaque requête.
- Stockage sécurisé et isolé des pièces justificatives.
- Environnements distincts : développement, recette, production.

---

## 9. Arborescence fonctionnelle

### 9.1. Espace public & candidat
- Accueil
- Universités partenaires
  - Détail université / formation
- À propos · FAQ · Contact
- Connexion / Inscription
- Espace candidat
  - Tableau de bord (suivi temps réel)
  - Mon dossier (formulaire multi-étapes, pièces)
  - Paiement & reçus
  - Messagerie conseiller
  - Mon attestation
  - Mon profil

### 9.2. Back-office agence
- Tableau de bord & statistiques
- Dossiers (liste, détail, affectation, traitement)
- Catalogue (universités, formations, frais)
- Finance (transactions, factures, exports)
- Utilisateurs internes & rôles
- Attestations & modèles
- Paramètres & contenus vitrine
- Journaux d'audit & sécurité

---

## 10. Planning prévisionnel

Le projet est découpé en phases livrables. Les durées sont indicatives et seront affinées au lancement.

| Phase | Contenu | Livrables | Durée est. |
|---|---|---|---|
| Phase 0 — Cadrage | Ateliers, spécifications détaillées, maquettes (UX/UI), validation. | Dossier de conception, maquettes validées | 2 semaines |
| Phase 1 — Fondations | Authentification, comptes candidats, profil, base de données, vitrine. | Vitrine + comptes opérationnels | 3 semaines |
| Phase 2 — Dossiers | Catalogue, soumission de dossier, pièces, workflow de traitement. | Parcours candidat + back-office dossiers | 4 semaines |
| Phase 3 — Paiement & suivi | Paiement en ligne, reçus, suivi temps réel, notifications, messagerie. | Paiement & suivi opérationnels | 3 semaines |
| Phase 4 — Attestations & finance | Génération d'attestations, module financier, exports, tableaux de bord. | Module attestations + finance | 2 semaines |
| Phase 5 — Recette & mise en ligne | Tests, corrections, formation, déploiement et documentation. | Plateforme en production | 2 semaines |

**Durée totale estimée : environ 16 semaines** (hors Phase 2 portail université partenaire).

---

## 11. Budget estimatif

Le budget ci-dessous est une estimation indicative en FCFA (XOF), à confirmer après la phase de cadrage. Il couvre la conception, le développement et la mise en production de la V1.

| Poste | Détail | Montant (FCFA) |
|---|---|---|
| Cadrage & conception UX/UI | Ateliers, spécifications, maquettes | 650 000 |
| Développement front-end | Vitrine, espace candidat, back-office | 2 200 000 |
| Développement back-end & API | Services métier, RBAC, base de données | 2 400 000 |
| Intégration paiement | Mobile Money + carte bancaire | 750 000 |
| Module attestations & documents | Génération PDF, modèles, vérification | 550 000 |
| Notifications & suivi temps réel | E-mail, in-app, timeline | 450 000 |
| Recette, déploiement & formation | Tests, mise en ligne, prise en main | 600 000 |
| **TOTAL ESTIMATIF (HT)** | | **7 600 000** |

> À prévoir en sus : frais récurrents annuels d'hébergement, nom de domaine, certificat SSL et maintenance évolutive (estimés séparément). Les commissions des agrégateurs de paiement restent à la charge de l'agence.

---

## 12. Livrables et conditions

### 12.1. Livrables attendus
1. Plateforme web complète déployée en production (vitrine, espace candidat, back-office).
2. Codes sources et documentation technique.
3. Guide d'utilisation du back-office et formation du personnel.
4. Maquettes UX/UI validées.
5. Jeu de tests de recette et procès-verbal de réception.

### 12.2. Hypothèses et prérequis
- L'agence fournit les contenus (textes, logos, modèles de documents officiels).
- Les comptes auprès des agrégateurs de paiement sont ouverts par l'agence.
- Les universités partenaires et leurs frais sont communiqués par l'agence.
- Un référent unique côté agence est désigné pour la validation des livrables.

### 12.3. Évolutions envisagées (post-V1)
- Portail dédié pour les universités partenaires (réception et décision sur dossiers).
- Tableau de bord analytique avancé et reporting exportable.
- Signature électronique des attestations.

---

*Document établi pour validation. Toute modification du périmètre fera l'objet d'un avenant.*