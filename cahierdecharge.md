# CAHIER DES CHARGES — GET ADMISSION

*Plateforme web de gestion d'une agence d'admission universitaire*
*Intermédiation entre étudiants étrangers et universités partenaires*

| | |
|---|---|
| **Projet** | GET Admission |
| **Type de solution** | Application web (back-office + espace candidat). Aucune application mobile. |
| **Périmètre** | Vitrine publique, espace étudiant, back-office d'administration |
| **Version du document** | 1.1 — Refonte |
| **Objet de la révision** | Logique documentaire académique adaptative + frais d'agence fixes (public/privé) |
| **Date** | Août 2026 |
| **Statut** | Pour validation |

> **Nouveautés de la v1.1** : le module « Dossier d'admission » adapte désormais dynamiquement la liste des pièces demandées au profil académique du candidat (lycéen en cours, bachelier, redoublant, parcours interrompu). Les frais d'agence deviennent des montants fixes selon le statut de l'établissement visé.

---

## 1. Présentation du projet

### 1.1. Contexte

L'agence porteuse du projet exerce une activité d'intermédiation entre des étudiants étrangers et des universités partenaires. Aujourd'hui, le traitement des candidatures repose sur des échanges manuels (e-mails, messageries, déplacements physiques, suivi sur tableur), ce qui engendre des pertes d'information, des délais difficiles à maîtriser et un manque de visibilité pour le candidat comme pour l'agence.

GET Admission est la plateforme web destinée à digitaliser et centraliser l'ensemble du parcours d'admission : de la création de compte du candidat jusqu'à la remise de l'attestation de pré-inscription, en passant par la soumission du dossier, le paiement en ligne des frais d'agence et le suivi en temps réel de l'avancement.

Cette révision (v1.1) introduit une exigence structurante : la liste des pièces académiques demandées à un candidat ne peut plus être figée par université ou par formation — elle doit être calculée dynamiquement à partir du profil scolaire et académique réel du candidat, avec prise en compte des redoublements et des interruptions de parcours.

### 1.2. Objectifs

**Pour l'étudiant étranger :**
- Créer un compte personnel sécurisé.
- Renseigner son profil académique (niveau actuel, classe, statut vis-à-vis du baccalauréat).
- Choisir une université partenaire et la formation visée.
- Constituer et soumettre un dossier dont la liste de pièces s'adapte automatiquement à son profil académique.
- Régler les frais de l'agence en ligne, à un montant fixe selon le statut public ou privé de l'établissement.
- Suivre l'évolution de son dossier en temps réel.
- Recevoir son attestation de pré-inscription dans son espace personnel, ou venir la récupérer à l'agence.

**Pour l'agence :**
- Centraliser tous les dossiers dans un back-office unique.
- Affecter, traiter et valider les dossiers selon un circuit clair.
- Gérer le catalogue des universités partenaires et des formations.
- Paramétrer la matrice des documents requis par profil académique, sans développement spécifique.
- Suivre les encaissements et la facturation des frais d'agence fixes (public/privé).
- Émettre et délivrer les attestations de pré-inscription.
- Piloter l'activité via des tableaux de bord et des statistiques.

### 1.3. Périmètre

| Inclus dans le périmètre | Hors périmètre (V1) |
|---|---|
| Site vitrine public et catalogue des universités | Application mobile native (iOS / Android) |
| Espace candidat (étudiant étranger) | Place de marché ouverte à des agences tierces |
| Back-office d'administration (agence) | Gestion du logement / visa / billetterie |
| Paiement en ligne des frais d'agence (montants fixes public/privé) | Comptabilité analytique complète / ERP |
| Moteur de règles documentaires académiques adaptatif | Cours en ligne / LMS |
| Suivi de dossier en temps réel et notifications | Portail université autonome (prévu Phase 2) |
| Génération et délivrance d'attestations | |

> **Important** : GET Admission est une solution 100 % web (poste de travail et navigateur). Aucune application mobile n'est prévue. L'interface reste néanmoins responsive pour rester lisible sur tablette et grand écran.

### 1.4. Définitions et acronymes

| Terme | Définition |
|---|---|
| Candidat / Étudiant | Étudiant étranger souhaitant intégrer une université partenaire via l'agence. |
| Dossier d'admission | Ensemble des informations et pièces soumises par le candidat pour une université. |
| Profil académique | Ensemble des données décrivant le parcours scolaire/universitaire du candidat (niveau, classe, statut bac, redoublements, interruptions) utilisées pour déterminer les pièces requises. |
| Matrice documentaire | Table de règles associant à chaque profil académique la liste des pièces obligatoires et optionnelles. |
| Frais d'agence | Montant forfaitaire facturé par l'agence pour le service d'intermédiation et d'accompagnement, fixé selon le statut (public/privé) de l'établissement visé. |
| Attestation de pré-inscription | Document délivré confirmant la pré-admission du candidat. |
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
| Étudiant / Candidat | Externe | Crée son compte, renseigne son profil académique, soumet son dossier, paie et suit l'avancement. |
| Conseiller / Gestionnaire de dossiers | Interne | Traite les dossiers, vérifie les pièces, échange avec le candidat. |
| Responsable financier / Comptable | Interne | Suit les paiements, valide les encaissements, gère la facturation. |
| Administrateur (Admin) | Interne | Gère universités, formations, contenus, utilisateurs, paramètres et matrice documentaire. |
| Super Administrateur | Interne | Contrôle total : rôles, configuration système, sécurité, journaux. |
| Université partenaire | Externe (Phase 2) | Accès portail limité pour recevoir et statuer sur les dossiers transmis. |

### 2.2. Description détaillée

**Étudiant / Candidat**
- S'inscrit, complète son profil et renseigne ses informations personnelles et académiques (niveau, classe, statut bac, parcours antérieur).
- Sélectionne une université partenaire et une formation.
- Téléverse les pièces demandées par le système, dont la liste s'adapte à son profil académique déclaré.
- Règle les frais d'agence en ligne (montant fixe selon statut public/privé) et télécharge son reçu.
- Suit l'état de son dossier et reçoit des notifications à chaque étape, y compris en cas de pièce manquante.
- Récupère son attestation de pré-inscription en ligne ou à l'agence.

**Conseiller / Gestionnaire de dossiers**
- Reçoit les dossiers affectés et les traite selon le circuit défini.
- Vérifie la conformité des pièces exigées par le profil académique du candidat et demande les corrections nécessaires.
- Échange avec le candidat via la messagerie interne du dossier.
- Met à jour le statut du dossier et le transmet à l'université.

**Responsable financier / Comptable**
- Consulte l'ensemble des transactions et leur statut.
- Valide les paiements et gère les cas particuliers (remboursements, échecs).
- Émet et exporte les factures / reçus.
- Suit les indicateurs financiers (encaissements, impayés, chiffre d'affaires) par statut d'établissement (public/privé).

**Administrateur**
- Gère le catalogue : universités partenaires, formations, statut public/privé de chaque établissement.
- Paramètre la matrice documentaire (profils académiques → pièces requises) sans intervention technique.
- Gère les comptes du personnel et leurs affectations.
- Administre les contenus de la vitrine, les modèles de documents et de notifications.
- Paramètre les frais d'agence fixes, les modes de paiement et les règles de workflow.

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
| BF-02 | Catalogue des universités partenaires avec recherche et filtres (pays, domaine, niveau, statut public/privé). |
| BF-03 | Fiche détaillée d'une université (présentation, formations, frais d'agence applicables, prérequis). |
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
| BF-10b | Questionnaire de profil académique structuré (niveau actuel, classe, statut vis-à-vis du baccalauréat, parcours antérieur) alimentant le moteur de règles documentaires. |

### 3.3. Module Dossier d'admission — logique documentaire adaptative

Cette section remplace et complète l'ancien module « Dossier d'admission » de la v1.0. Le principe central : le système ne présente jamais une liste statique de pièces. Il calcule, à partir du profil académique déclaré par le candidat, la liste exacte des documents obligatoires et optionnels à fournir, et la met à jour à chaque changement de statut du candidat (obtention du bac en cours de dossier, ajout d'un redoublement, etc.).

#### 3.3.1. Principe général

| Code | Exigence |
|---|---|
| BF-11 | Choix de l'université partenaire et de la formation visée. |
| BF-12 | Formulaire d'admission multi-étapes avec sauvegarde en brouillon. |
| BF-13 | Le système doit adapter automatiquement la liste des documents demandés en fonction du profil académique du candidat (niveau, statut bac, redoublements, interruptions), calculée via une matrice documentaire paramétrable en back-office. |
| BF-13a | Le profil académique du candidat peut être mis à jour en cours de dossier (ex. obtention du baccalauréat) ; la liste des pièces requises est recalculée automatiquement sans perte des pièces déjà fournies. |
| BF-14 | Contrôle de complétude avant soumission, fondé sur la liste dynamique de pièces obligatoires issue du profil du candidat. |
| BF-15 | Soumission du dossier et passage en file de traitement. |
| BF-16 | Possibilité de corriger / recompléter un dossier renvoyé par le conseiller. |
| BF-17 | Historique des actions et journal des échanges par dossier. |

#### 3.3.2. Candidats lycéens (Terminale, baccalauréat non encore obtenu)

Si le candidat est actuellement en classe de Terminale et n'a pas encore obtenu son baccalauréat, le système doit demander :
- Les bulletins scolaires des deux ou trois trimestres de la classe de Seconde (10ᵉ année).
- Les bulletins scolaires des deux ou trois trimestres de la classe de Première (11ᵉ année).
- Les bulletins déjà disponibles de la classe de Terminale (12ᵉ année).
- Une attestation de scolarité (si disponible).

Si le candidat obtient son baccalauréat avant la clôture de son dossier, le système doit lui permettre d'ajouter ultérieurement, sans réouverture d'un nouveau dossier :
- Le diplôme ou l'attestation de réussite au baccalauréat.
- Le relevé officiel des notes du baccalauréat.

| Code | Exigence |
|---|---|
| BF-13b | Détection du profil « lycéen en Terminale, bac non obtenu » et génération de la liste de pièces Seconde / Première / Terminale disponible + attestation de scolarité optionnelle. |
| BF-13c | Ajout a posteriori du diplôme/attestation de réussite et du relevé de notes du baccalauréat dès leur obtention, avec recalcul automatique du statut de complétude du dossier. |

#### 3.3.3. Candidats ayant déjà obtenu le baccalauréat

Pour ce profil, le système doit demander :
- Le diplôme du baccalauréat (ou une attestation de réussite).
- Le relevé officiel des notes du baccalauréat.
- Les bulletins ou relevés de notes de chaque année d'études supérieures effectuée après le baccalauréat.

Selon le niveau d'études supérieures du candidat, les documents à fournir peuvent inclure :
- Bulletins ou relevés de notes de la première année universitaire.
- Bulletins ou relevés de notes de la deuxième année universitaire.
- Bulletins ou relevés de notes de la troisième année (Licence 3), le cas échéant.
- Diplôme de DUT, BTS, Licence ou tout autre diplôme obtenu.
- Certificat de fréquentation ou certificat de scolarité si la formation est en cours.

| Code | Exigence |
|---|---|
| BF-13d | Détection du profil « bachelier » et génération de la liste de pièces bac + relevé de notes bac, complétée dynamiquement par niveau d'études supérieures déclaré (L1, L2, L3, diplôme DUT/BTS/Licence, ou certificat de scolarité si formation en cours). |

#### 3.3.4. Gestion des redoublements

Le système doit détecter et gérer les redoublements en permettant au candidat d'ajouter les bulletins et relevés de notes de chaque année redoublée, aussi bien au lycée (Seconde, Première ou Terminale) qu'à l'université.

| Code | Exigence |
|---|---|
| BF-13e | Déclaration d'un ou plusieurs redoublements par le candidat (niveau concerné : Seconde, Première, Terminale ou année universitaire) ; le système ajoute dynamiquement un emplacement de dépôt pour les bulletins/relevés de chaque année redoublée. |

#### 3.3.5. Documents justificatifs complémentaires (interruption de parcours)

Si le candidat présente une interruption de son parcours académique (année sans études) ou une période de stage, le système doit exiger un document justificatif correspondant, par exemple :
- Attestation de stage.
- Attestation d'emploi.
- Attestation de formation.
- Certificat de volontariat.
- Lettre explicative justifiant l'interruption des études.
- Tout autre document officiel permettant de justifier cette période.

| Code | Exigence |
|---|---|
| BF-13f | Déclaration d'une période d'interruption ou de stage par le candidat (dates de début/fin, motif) ; le système exige alors un document justificatif correspondant parmi une liste paramétrable, ou un document libre avec lettre explicative. |

#### 3.3.6. Validation intelligente du dossier

Le système doit vérifier automatiquement que tous les documents obligatoires — déterminés par le profil académique du candidat — sont présents avant d'autoriser la soumission du dossier. En cas de document manquant, une notification claire doit indiquer au candidat les pièces à fournir afin de compléter son dossier.

| Code | Exigence |
|---|---|
| BF-14b | Le contrôle de complétude évalue l'arbre de règles complet (niveau, statut bac, redoublements éventuels, interruptions éventuelles) et bloque la soumission tant qu'une pièce obligatoire manque. |
| BF-14c | Message d'erreur explicite listant nominativement chaque pièce manquante, avec lien direct vers l'emplacement de dépôt correspondant. |

> **Exemple de calcul** : un candidat qui déclare « Terminale, bac non obtenu, redoublement de Première » se voit demander Seconde + Première (année 1) + Première (redoublement) + Terminale disponible + attestation de scolarité optionnelle. S'il déclare ensuite avoir obtenu son bac, le diplôme et le relevé de notes du bac s'ajoutent automatiquement à la liste, sans que les pièces déjà déposées soient perdues.

### 3.4. Module Paiement des frais d'agence

Les frais d'agence, auparavant variables selon l'université et la formation, deviennent des montants fixes déterminés uniquement par le statut de l'établissement visé (public ou privé).

| Statut de l'établissement | Frais d'agence |
|---|---|
| Établissement public | 65 000 FCFA |
| Établissement privé | 110 000 FCFA |

| Code | Exigence |
|---|---|
| BF-18 | Affichage du montant des frais d'agence en fonction du seul statut (public/privé) de l'établissement choisi — 65 000 FCFA (public) ou 110 000 FCFA (privé). |
| BF-19 | Paiement en ligne via Mobile Money (Orange Money, Moov, Wave) et carte bancaire. |
| BF-20 | Confirmation de paiement et génération automatique d'un reçu téléchargeable mentionnant le statut de l'établissement et le montant appliqué. |
| BF-21 | Gestion des statuts de paiement (en attente, confirmé, échoué, remboursé). |
| BF-22 | Rapprochement automatique du paiement avec le dossier concerné. |
| BF-23 | Option de paiement en plusieurs tranches (paramétrable par l'agence), calculée sur le montant fixe applicable. |
| BF-23b | Chaque université du catalogue est qualifiée « publique » ou « privée » en back-office, ce qui détermine automatiquement le montant des frais facturés au candidat. |

### 3.5. Module Suivi & Notifications

| Code | Exigence |
|---|---|
| BF-24 | Tableau de bord candidat affichant l'état d'avancement en temps réel. |
| BF-25 | Frise / timeline des étapes du dossier avec horodatage. |
| BF-26 | Notifications par e-mail et notifications in-app à chaque changement d'état. |
| BF-27 | Messagerie interne entre le candidat et son conseiller. |
| BF-28 | Alertes sur action requise (pièce manquante selon le profil académique, paiement en attente). |

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
- Indicateurs clés : nouveaux dossiers, dossiers en cours, taux d'acceptation, encaissements par statut d'établissement (public/privé).
- Graphiques d'évolution (dossiers par période, par université, par statut, par profil académique).
- File des dossiers nécessitant une action prioritaire, y compris ceux bloqués pour pièce manquante.

### 4.2. Gestion des dossiers
- Liste filtrable et triable de tous les dossiers (statut, université, conseiller, date, profil académique).
- Vue détaillée : profil candidat, profil académique déclaré, pièces attendues/reçues, paiements, historique, échanges.
- Affectation manuelle ou automatique d'un dossier à un conseiller.
- Vérification des pièces au regard de la matrice documentaire applicable, demande de correction, validation ou rejet motivé.
- Changement de statut et transmission à l'université partenaire.
- Émission de l'attestation et choix du mode de remise.

### 4.3. Gestion du catalogue
- Universités partenaires : création, modification, statut public/privé, activation / désactivation.
- Formations : niveau, domaine, prérequis, pièces exigées additionnelles le cas échéant.
- Modèles de pièces obligatoires par université / formation, en complément de la matrice documentaire académique.

### 4.4. Gestion de la matrice documentaire académique
- Interface de paramétrage des profils académiques (lycéen Terminale, bachelier, niveau L1/L2/L3, redoublant, parcours interrompu) et des pièces associées à chacun.
- Possibilité de marquer une pièce comme obligatoire, optionnelle ou conditionnelle (ex. « si redoublement déclaré »).
- Historique des versions de la matrice, pour assurer la traçabilité des règles appliquées à chaque dossier.

### 4.5. Gestion financière
- Suivi des transactions et de leur statut, ventilé par statut d'établissement (public/privé).
- Édition des reçus et factures, exports comptables (CSV / PDF).
- Tableau des encaissements, impayés et remboursements.

### 4.6. Gestion des utilisateurs internes
- Création des comptes du personnel et attribution des rôles.
- Activation / suspension de comptes.
- Suivi de l'activité (dernière connexion, charge de dossiers par conseiller).

### 4.7. Paramétrage & contenus
- Modèles d'attestations, de reçus et de notifications.
- Paramétrage des frais fixes (public/privé), des modes de paiement et des règles de workflow.
- Gestion des contenus de la vitrine (pages, FAQ, actualités).

### 4.8. Supervision & sécurité
- Journal d'audit des actions sensibles (qui, quoi, quand), y compris les modifications de la matrice documentaire.
- Gestion des rôles et permissions (réservé au Super Administrateur).
- Sauvegardes et paramètres système.

---

## 5. Gestion des rôles et permissions (RBAC)

Chaque utilisateur est rattaché à un rôle unique déterminant ses droits. La matrice ci-dessous synthétise les accès par fonction. Légende : ● accès complet · ◐ accès partiel / conditionnel · ✕ aucun accès.

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
| Paramétrer la matrice documentaire | ✕ | ✕ | ✕ | ● | ● |
| Gérer les utilisateurs internes | ✕ | ✕ | ✕ | ● | ● |
| Paramétrer le système | ✕ | ✕ | ✕ | ◐ | ● |
| Gérer rôles & permissions | ✕ | ✕ | ✕ | ✕ | ● |
| Consulter les journaux d'audit | ✕ | ✕ | ✕ | ◐ | ● |

> **Note** : le Super Administrateur hérite de tous les droits. Le rôle « Université partenaire » (Phase 2) disposera d'un accès restreint aux seuls dossiers qui lui sont transmis.

---

## 6. Cycle de vie d'un dossier

Le dossier d'admission suit un circuit d'états bien défini. Chaque transition déclenche une notification et est tracée dans l'historique.

| # | État | Description | Acteur déclencheur |
|---|---|---|---|
| 1 | Brouillon | Le candidat déclare son profil académique et complète son dossier sans l'avoir soumis. | Candidat |
| 2 | Soumis | Le dossier, complet au regard de la matrice documentaire applicable, est envoyé et entre en file de traitement. | Candidat |
| 3 | En vérification | Les pièces et informations sont contrôlées au regard du profil académique déclaré. | Conseiller |
| 4 | À corriger | Une ou plusieurs pièces sont non conformes ou une pièce liée au profil (redoublement, interruption) manque. | Conseiller |
| 5 | Paiement en attente | Le dossier est conforme, frais d'agence fixes (public/privé) à régler. | Système |
| 6 | Paiement confirmé | Les frais d'agence ont été encaissés. | Système / Financier |
| 7 | Transmis à l'université | Le dossier est envoyé à l'université partenaire. | Conseiller / Admin |
| 8 | En attente de réponse | Décision de l'université en cours. | Université |
| 9 | Pré-admission accordée | Le candidat est accepté en pré-inscription. | Université / Admin |
| 10 | Refusé | La candidature n'est pas retenue. | Université / Admin |
| 11 | Attestation disponible | L'attestation est émise et mise à disposition. | Admin / Conseiller |
| 12 | Clôturé | Le dossier est finalisé et archivé. | Système |

> **Règle** : un dossier ne peut être transmis à l'université qu'après confirmation du paiement des frais d'agence (état 6). Tout retour de l'université en état 4 « À corriger » rouvre le dossier au candidat. Une mise à jour du profil académique (ex. obtention du bac) en cours de traitement ne fait pas régresser le dossier d'état, mais recalcule la liste des pièces attendues.

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
| Ergonomie | Parcours candidat clair ; questionnaire de profil académique compréhensible sans jargon ; messages d'erreur explicites ; interface en français. |
| Évolutivité de la matrice | La matrice documentaire académique doit être modifiable par un administrateur métier sans intervention de développement. |
| Scalabilité | Architecture capable d'absorber la montée en charge lors des périodes de campagne. |
| Traçabilité | Historisation complète des actions sur les dossiers, des versions de la matrice documentaire et journal d'audit administrateur. |
| Maintenabilité | Code documenté, modulaire ; environnement de test distinct de la production. |

---

## 8. Architecture technique proposée

L'architecture proposée est indicative et pourra être ajustée lors de la phase de conception détaillée.

### 8.1. Stack applicative

| Couche | Technologies envisagées |
|---|---|
| Front-end | React / Next.js, Tailwind CSS — interfaces vitrine, espace candidat et back-office. |
| Back-end / API | Node.js (NestJS / Express) — API REST sécurisée. |
| Moteur de règles documentaires | Service dédié évaluant le profil académique du candidat contre la matrice documentaire paramétrée, exposé via l'API métier. |
| Base de données | PostgreSQL (données relationnelles, y compris la matrice documentaire versionnée) ; stockage objet pour les pièces jointes. |
| Authentification | JWT / sessions ; contrôle d'accès basé sur les rôles (RBAC). |
| Paiement | Intégration des agrégateurs Mobile Money (UEMOA) et passerelle carte bancaire ; calcul du montant sur le statut public/privé de l'établissement. |
| Notifications | E-mail transactionnel ; notifications in-app temps réel. |
| Documents | Génération PDF des attestations et reçus à partir de modèles. |
| Hébergement | Serveur cloud avec sauvegardes automatiques et certificat SSL. |

### 8.2. Principes d'architecture
- Séparation claire entre vitrine publique, espace candidat et back-office.
- API centralisée exposant les services métier (dossiers, paiements, utilisateurs, matrice documentaire).
- Moteur de règles documentaires découplé du reste de l'application, pour permettre son évolution sans redéploiement complet.
- Couche de sécurité transverse appliquant les règles RBAC à chaque requête.
- Stockage sécurisé et isolé des pièces justificatives.
- Environnements distincts : développement, recette, production.

---

## 9. Arborescence fonctionnelle

### 9.1. Espace public & candidat
- Accueil
- Universités partenaires
  - Détail université / formation (statut public/privé, frais d'agence applicables)
- À propos · FAQ · Contact
- Connexion / Inscription
- Espace candidat
  - Tableau de bord (suivi temps réel)
  - Mon profil académique (niveau, statut bac, redoublements, interruptions)
  - Mon dossier (formulaire multi-étapes, pièces dynamiques selon profil)
  - Paiement & reçus
  - Messagerie conseiller
  - Mon attestation
  - Mon profil

### 9.2. Back-office agence
- Tableau de bord & statistiques
- Dossiers (liste, détail, affectation, traitement)
- Catalogue (universités, statut public/privé, formations, frais)
- Matrice documentaire académique (profils, règles, versions)
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
| Phase 0 — Cadrage | Ateliers, spécifications détaillées, définition de la matrice documentaire, maquettes (UX/UI), validation. | Dossier de conception, maquettes validées, matrice documentaire v1 | 2 semaines |
| Phase 1 — Fondations | Authentification, comptes candidats, profil académique, base de données, vitrine. | Vitrine + comptes opérationnels | 3 semaines |
| Phase 2 — Dossiers & moteur documentaire | Catalogue, moteur de règles documentaires adaptatif, soumission de dossier, pièces, workflow de traitement. | Parcours candidat + back-office dossiers | 5 semaines |
| Phase 3 — Paiement & suivi | Paiement en ligne (montants fixes public/privé), reçus, suivi temps réel, notifications, messagerie. | Paiement & suivi opérationnels | 3 semaines |
| Phase 4 — Attestations & finance | Génération d'attestations, module financier, exports, tableaux de bord. | Module attestations + finance | 2 semaines |
| Phase 5 — Recette & mise en ligne | Tests (dont scénarios de profils académiques multiples), corrections, formation, déploiement et documentation. | Plateforme en production | 2 semaines |

> Durée totale estimée : environ 17 semaines (hors Phase 2 portail université partenaire). Le module de moteur documentaire adaptatif ajoute un délai d'une semaine par rapport à la v1.0 en raison de la complexité des règles de profil académique.

---

## 11. Budget estimatif

Le budget ci-dessous est une estimation indicative en FCFA (XOF), à confirmer après la phase de cadrage. Il couvre la conception, le développement et la mise en production de la V1, incluant le moteur de règles documentaires adaptatif.

| Poste | Détail | Montant (FCFA) |
|---|---|---|
| Cadrage & conception UX/UI | Ateliers, spécifications, maquettes | 650 000 |
| Développement front-end | Vitrine, espace candidat, back-office | 2 200 000 |
| Développement back-end & API | Services métier, RBAC, base de données | 2 400 000 |
| Moteur de règles documentaires | Modélisation des profils académiques, matrice paramétrable, interface d'administration | 700 000 |
| Intégration paiement | Mobile Money + carte bancaire, montants fixes public/privé | 750 000 |
| Module attestations & documents | Génération PDF, modèles, vérification | 550 000 |
| Notifications & suivi temps réel | E-mail, in-app, timeline | 450 000 |
| Recette, déploiement & formation | Tests (scénarios multi-profils), mise en ligne, prise en main | 650 000 |
| **TOTAL ESTIMATIF (HT)** | | **8 350 000** |

> À prévoir en sus : frais récurrents annuels d'hébergement, nom de domaine, certificat SSL et maintenance évolutive (estimés séparément). Les commissions des agrégateurs de paiement restent à la charge de l'agence. Les frais d'agence facturés aux candidats (65 000 FCFA établissement public / 110 000 FCFA établissement privé) constituent un revenu de l'agence et ne font pas partie du présent budget de développement.

---

## 12. Livrables et conditions

### 12.1. Livrables attendus
- Plateforme web complète déployée en production (vitrine, espace candidat, back-office).
- Moteur de règles documentaires académiques et interface de paramétrage de la matrice.
- Codes sources et documentation technique.
- Guide d'utilisation du back-office (y compris paramétrage de la matrice documentaire) et formation du personnel.
- Maquettes UX/UI validées.
- Jeu de tests de recette couvrant les principaux profils académiques et procès-verbal de réception.

### 12.2. Hypothèses et prérequis
- L'agence fournit les contenus (textes, logos, modèles de documents officiels).
- L'agence fournit la liste complète des profils académiques à couvrir et la matrice documentaire cible en Phase 0.
- Les comptes auprès des agrégateurs de paiement sont ouverts par l'agence.
- Les universités partenaires, leur statut (public/privé) et leurs prérequis sont communiqués par l'agence.
- Un référent unique côté agence est désigné pour la validation des livrables.

### 12.3. Évolutions envisagées (post-V1)
- Portail dédié pour les universités partenaires (réception et décision sur dossiers).
- Tableau de bord analytique avancé et reporting exportable.
- Signature électronique des attestations.
- Extension de la matrice documentaire à d'autres systèmes éducatifs (hors filière francophone standard).

---

*Document établi pour validation. Toute modification du périmètre fera l'objet d'un avenant.*