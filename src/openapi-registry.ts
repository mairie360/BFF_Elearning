import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// On ajoute les méthodes .openapi() à Zod
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// =====================
// ENUMS
// =====================

export const CourseStatus = z.enum(['not-started', 'in-progress', 'completed']).openapi({
  description: 'Statut de progression de la formation pour l’utilisateur connecté',
  example: 'in-progress',
});

export const CatalogStatusFilter = z.enum(['all', 'not-started', 'in-progress', 'completed']).openapi({
  description: 'Filtre de statut disponible dans le catalogue',
  example: 'all',
});

export const BadgeVariant = z
  .enum([
    'default',
    'beginner',
    'intermediate',
    'advanced',
    'inProgress',
    'completed',
    'mandatory',
    'notStarted',
  ])
  .openapi({
    description: 'Variante visuelle utilisée par les badges de formation',
    example: 'mandatory',
  });

export const ContentType = z
  .enum(['video', 'pdf', 'document', 'link', 'quiz', 'audio', 'other'])
  .openapi({
    description: 'Type de contenu pédagogique',
    example: 'video',
  });

registry.register('CourseStatus', CourseStatus);
registry.register('CatalogStatusFilter', CatalogStatusFilter);
registry.register('BadgeVariant', BadgeVariant);
registry.register('ContentType', ContentType);

// =====================
// SHARED MODELS
// =====================

export const RatingDistribution = z
  .object({
    '1': z.number().min(0).optional(),
    '2': z.number().min(0).optional(),
    '3': z.number().min(0).optional(),
    '4': z.number().min(0).optional(),
    '5': z.number().min(0).optional(),
  })
  .openapi({
    description: 'Répartition des notes par valeur, de 1 à 5',
    example: { '1': 0, '2': 1, '3': 4, '4': 35, '5': 88 },
  });

export const CompletionRating = z
  .object({
    initialValue: z.number().min(1).max(5).optional(),
    max: z.number().min(1).optional(),
    submitted: z.boolean().optional(),
    disabled: z.boolean().optional(),
    title: z.string().optional(),
    helperText: z.string().optional(),
    submitLabel: z.string().optional(),
    submittedLabel: z.string().optional(),
  })
  .openapi({
    description: 'Configuration du composant de notation de fin de formation',
  });

export const FilterOption = z
  .object({
    label: z.string().openapi({ example: 'En cours' }),
    value: z.string().openapi({ example: 'in-progress' }),
    disabled: z.boolean().optional(),
  })
  .openapi({
    description: 'Option de filtre prête à afficher dans le frontend',
  });

export const StatCard = z
  .object({
    label: z.string().openapi({ example: 'Formations en cours' }),
    value: z.union([z.string(), z.number()]).openapi({ example: 3 }),
    iconColor: z.string().optional().openapi({ example: '#2563eb' }),
  })
  .openapi({
    description: 'Statistique synthétique affichable dans le catalogue',
  });

export const CourseBadge = z
  .object({
    label: z.string().openapi({ example: 'Obligatoire' }),
    variant: BadgeVariant.optional(),
  })
  .openapi({
    description: 'Badge associé à une formation',
  });

export const FooterLink = z
  .object({
    label: z.string().openapi({ example: 'Support technique' }),
    href: z.string().openapi({ example: '/support' }),
  })
  .openapi({
    description: 'Lien affiché dans le footer',
  });

export const FooterConfig = z
  .object({
    productName: z.string().openapi({ example: 'Mairie360' }),
    version: z.string().openapi({ example: '2.1.0' }),
    links: z.array(FooterLink),
  })
  .openapi({
    description: 'Configuration du footer',
  });

export const CurrentUser = z
  .object({
    id: z.string().openapi({ example: 'user-123' }),
    name: z.string().openapi({ example: 'Admin Système' }),
    initials: z.string().openapi({ example: 'AS' }),
    email: z.string().email().optional().openapi({ example: 'admin@mairie360.fr' }),
    phone: z.string().optional().openapi({ example: '+262 692 00 00 00' }),
    service: z.string().optional().openapi({ example: 'Administration' }),
    position: z.string().optional().openapi({ example: 'Administrateur système' }),
    role: z.string().optional().openapi({ example: 'admin' }),
    isAdmin: z.boolean().openapi({ example: true }),
    avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    address: z.string().optional().openapi({ example: '1 rue de la Mairie' }),
    city: z.string().optional().openapi({ example: 'Saint-Denis' }),
    lastConnection: z.string().optional().openapi({ example: '3 juillet 2026 à 09:15' }),
  })
  .openapi({
    description: 'Utilisateur connecté tel qu’attendu par les écrans E-learning',
  });

export const NotificationSummary = z
  .object({
    unreadCount: z.number().min(0).openapi({ example: 3 }),
  })
  .openapi({
    description: 'Résumé des notifications de l’utilisateur connecté',
  });

registry.register('RatingDistribution', RatingDistribution);
registry.register('CompletionRating', CompletionRating);
registry.register('FilterOption', FilterOption);
registry.register('StatCard', StatCard);
registry.register('CourseBadge', CourseBadge);
registry.register('FooterLink', FooterLink);
registry.register('FooterConfig', FooterConfig);
registry.register('CurrentUser', CurrentUser);
registry.register('NotificationSummary', NotificationSummary);

// =====================
// COURSES
// =====================

export const CourseContent = z
  .object({
    id: z.string().openapi({ example: 'accueil-1-video' }),
    title: z.string().openapi({ example: 'Présentation des directions et services' }),
    type: ContentType,
    description: z.string().optional(),
    duration: z.string().optional().openapi({ example: '12 min' }),
    fileName: z.string().optional().openapi({ example: 'organigramme-mairie360.pdf' }),
    href: z.string().optional().openapi({ example: '/documents/organigramme-mairie360.pdf' }),
    completed: z.boolean().optional(),
    required: z.boolean().optional(),
  })
  .openapi({
    description: 'Contenu pédagogique d’un chapitre',
  });

export const CourseChapter = z
  .object({
    id: z.string().openapi({ example: 'accueil-1' }),
    title: z.string().openapi({ example: 'Comprendre l’organisation municipale' }),
    description: z.string().optional(),
    duration: z.string().openapi({ example: '25 min' }),
    completed: z.boolean().optional(),
    active: z.boolean().optional(),
    contents: z.array(CourseContent).optional(),
  })
  .openapi({
    description: 'Chapitre d’une formation',
  });

export const ElearningCourseDetails = z
  .object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    instructor: z.string().optional(),
    duration: z.string().optional(),
    rating: z.union([z.number(), z.string()]).optional(),
    ratingLabel: z.string().optional(),
    ratingDistribution: RatingDistribution.optional(),
    progress: z.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
    completionRating: CompletionRating.optional(),
    chapters: z.array(CourseChapter),
  })
  .openapi({
    description: 'Détail complet affiché dans la modale de formation',
  });

export const ElearningCourse = z
  .object({
    id: z.string().openapi({ example: 'accueil-agents' }),
    title: z.string().openapi({ example: 'Accueil des nouveaux agents' }),
    description: z.string(),
    instructor: z.string().optional(),
    rating: z.union([z.number(), z.string()]).optional().openapi({ example: 4.8 }),
    duration: z.string().optional().openapi({ example: '2 h 15' }),
    chapters: z.union([z.number(), z.string()]).optional().openapi({ example: 4 }),
    learners: z.union([z.number(), z.string()]).optional().openapi({ example: 128 }),
    category: z.string().optional().openapi({ example: 'Intégration' }),
    statusValue: CourseStatus.optional(),
    titleBadge: CourseBadge.optional(),
    levelBadge: CourseBadge.optional(),
    statusBadge: CourseBadge.optional(),
    progress: z.number().min(0).max(100).optional(),
    deadline: z.string().optional().openapi({ example: '30 juin 2026' }),
    ratingDistribution: RatingDistribution.optional(),
    details: ElearningCourseDetails.optional(),
  })
  .openapi({
    description: 'Formation affichée dans le catalogue',
  });

registry.register('CourseContent', CourseContent);
registry.register('CourseChapter', CourseChapter);
registry.register('ElearningCourseDetails', ElearningCourseDetails);
registry.register('ElearningCourse', ElearningCourse);

// =====================
// CATALOG
// =====================

export const ElearningCatalogQuery = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: CatalogStatusFilter.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const ElearningCatalogView = z
  .object({
    title: z.string().openapi({ example: 'Centre de Formation' }),
    subtitle: z.string().optional().openapi({ example: 'Développez vos compétences professionnelles' }),
    certificationCount: z.number().min(0).openapi({ example: 14 }),
    emptyLabel: z.string().openapi({ example: 'Aucune formation ne correspond à votre recherche.' }),
    statuses: z.array(FilterOption),
    categories: z.array(FilterOption).optional(),
    stats: z.array(StatCard).optional(),
    adminStats: z
      .object({
        totalCourses: z.number().int().min(0),
        totalLearners: z.number().int().min(0),
        mandatoryCourses: z.number().int().min(0),
        totalContents: z.number().int().min(0),
        averageRating: z.number().min(0).max(5),
        completionRate: z.number().min(0).max(100),
      })
      .optional(),
    courses: z.array(ElearningCourse),
  })
  .openapi({
    description: 'Modèle complet du catalogue E-learning',
  });

export const ElearningCatalogResponse = z
  .object({
    user: CurrentUser,
    notifications: NotificationSummary,
    catalog: ElearningCatalogView,
    footer: FooterConfig.optional(),
  })
  .openapi({
    description: 'Réponse de chargement du catalogue E-learning',
  });

registry.register('ElearningCatalogQuery', ElearningCatalogQuery);
registry.register('ElearningCatalogView', ElearningCatalogView);
registry.register('ElearningCatalogResponse', ElearningCatalogResponse);

export const AdminCourseResponse = z
  .object({
    course: ElearningCourse,
  })
  .openapi({
    description: 'Formation créée ou mise à jour par un administrateur',
  });

export const AdminCourseDeleteResponse = z
  .object({
    deleted: z.boolean(),
    courseId: z.string(),
  })
  .openapi({
    description: 'Confirmation de suppression de la formation',
  });

registry.register('AdminCourseResponse', AdminCourseResponse);
registry.register('AdminCourseDeleteResponse', AdminCourseDeleteResponse);

// =====================
// PROFILE
// =====================

export const ElearningProfileResponse = z
  .object({
    user: CurrentUser,
    footer: FooterConfig.optional(),
  })
  .openapi({
    description: 'Réponse de chargement de la page profil',
  });

export const UpdateProfileBody = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  })
  .openapi({
    description: 'Champs éditables du profil utilisateur',
  });

export const ProfileUpdateResponse = z
  .object({
    user: CurrentUser,
  })
  .openapi({
    description: 'Profil mis à jour',
  });

registry.register('ElearningProfileResponse', ElearningProfileResponse);
registry.register('UpdateProfileBody', UpdateProfileBody);
registry.register('ProfileUpdateResponse', ProfileUpdateResponse);

// =====================
// ACTIONS
// =====================

export const CourseIdParams = z.object({
  courseId: z.string().openapi({
    description: 'Identifiant de la formation',
    example: 'accueil-agents',
  }),
});

export const CourseContentParams = z.object({
  courseId: z.string().openapi({
    description: 'Identifiant de la formation',
    example: 'accueil-agents',
  }),
  contentId: z.string().openapi({
    description: 'Identifiant du contenu',
    example: 'accueil-1-video',
  }),
});

export const CompleteContentBody = z
  .object({
    chapterId: z.string().openapi({ example: 'accueil-1' }),
    completed: z.boolean().openapi({ example: true }),
  })
  .openapi({
    description: 'Payload de complétion d’un contenu',
  });

export const ContentCompleteResponse = z
  .object({
    progress: z.number().min(0).max(100),
    completedRequiredContents: z.number().min(0),
    totalRequiredContents: z.number().min(0),
    completedChapters: z.number().min(0),
    totalChapters: z.number().min(0),
    completed: z.boolean(),
    chapters: z.array(CourseChapter),
    chapter: CourseChapter,
    content: CourseContent,
  })
  .openapi({
    description: 'Progression mise à jour après complétion d’un contenu',
  });

export const SubmitRatingBody = z
  .object({
    rating: z.number().int().min(1).max(5).openapi({ example: 5 }),
  })
  .openapi({
    description: 'Note envoyée par l’utilisateur',
  });

export const RatingSubmitResponse = z
  .object({
    rating: z.number().min(1).max(5),
    ratingCount: z.number().min(0),
    ratingDistribution: RatingDistribution,
    submitted: z.boolean(),
  })
  .openapi({
    description: 'Résumé de notation après envoi',
  });

export const StartCourseBody = z
  .object({
    source: z.string().optional().openapi({ example: 'catalog' }),
  })
  .openapi({
    description: 'Contexte de démarrage ou reprise d’une formation',
  });

export const CourseActionResponse = z
  .object({
    course: ElearningCourse,
    nextContentId: z.string().optional(),
    redirectUrl: z.string().optional(),
  })
  .openapi({
    description: 'Réponse de démarrage ou reprise d’une formation',
  });

registry.register('CourseIdParams', CourseIdParams);
registry.register('CourseContentParams', CourseContentParams);
registry.register('CompleteContentBody', CompleteContentBody);
registry.register('ContentCompleteResponse', ContentCompleteResponse);
registry.register('SubmitRatingBody', SubmitRatingBody);
registry.register('RatingSubmitResponse', RatingSubmitResponse);
registry.register('StartCourseBody', StartCourseBody);
registry.register('CourseActionResponse', CourseActionResponse);

// =====================
// ERROR
// =====================

export const ApiError = z
  .object({
    code: z.string().openapi({ example: 'COURSE_NOT_FOUND' }),
    message: z.string().openapi({ example: 'Formation introuvable.' }),
    details: z.unknown().optional().openapi({ example: { courseId: 'accueil-agents' } }),
  })
  .openapi({
    description: 'Format d’erreur commun du BFF E-learning',
  });

registry.register('ApiError', ApiError);
