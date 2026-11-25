import { ErrorResponseSchema } from '@mairie360/bffs-lib';
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Adds the .openapi() methods to Zod
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Bearer JWT verified by `requireSession` (src/app.ts) and forwarded to Core API and the E-learning API.
// The document requires it on every operation (`openapi.ts`); public operations opt out with `security: []`. The ZAP OpenAPI coverage gate reads this to tell which operations must be
// reached authenticated.
export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// =====================
// ENUMS
// =====================

export const CourseStatus = z.enum(['not-started', 'in-progress', 'completed']).openapi({
  description: 'Progress status of the formation for the signed-in user',
  example: 'in-progress',
});

export const CatalogStatusFilter = z.enum(['all', 'not-started', 'in-progress', 'completed']).openapi({
  description: 'Status filter available in the catalogue',
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
    description: 'Visual variant used by the formation badges',
    example: 'mandatory',
  });

export const ContentType = z
  .enum(['video', 'pdf', 'document', 'link', 'quiz', 'audio', 'other'])
  .openapi({
    description:
      'Type of learning content. `video`, `pdf`, `document` and `audio` are stored files (their URL comes from the `file` route); `link` carries its `href`; `quiz` and `other` have no file.',
    example: 'video',
  });

export const CourseLevel = z.enum(['beginner', 'intermediate', 'advanced']).openapi({
  description: 'Level of a formation',
  example: 'beginner',
});

export const CourseSource = z.enum(['internal', 'platform']).openapi({
  description: 'Origin of a formation: `internal` (made by the mairie) or `platform` (provided with Mairie360)',
  example: 'internal',
});

registry.register('CourseStatus', CourseStatus);
registry.register('CatalogStatusFilter', CatalogStatusFilter);
registry.register('BadgeVariant', BadgeVariant);
registry.register('ContentType', ContentType);
registry.register('CourseLevel', CourseLevel);
registry.register('CourseSource', CourseSource);

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
    description: 'Distribution of the ratings by value, from 1 to 5',
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
    description: 'Configuration of the end-of-course rating component',
  });

export const FilterOption = z
  .object({
    label: z.string().openapi({ example: 'En cours' }),
    value: z.string().openapi({ example: 'in-progress' }),
    disabled: z.boolean().optional(),
  })
  .openapi({
    description: 'Filter option ready to display in the front',
  });

export const StatCard = z
  .object({
    label: z.string().openapi({ example: 'Formations en cours' }),
    value: z.union([z.string(), z.number()]).openapi({ example: 3 }),
    iconColor: z.string().optional().openapi({ example: '#2563eb' }),
  })
  .openapi({
    description: 'Summary statistic to display in the catalogue',
  });

export const CourseBadge = z
  .object({
    label: z.string().openapi({ example: 'Obligatoire' }),
    variant: BadgeVariant.optional(),
  })
  .openapi({
    description: 'Badge of a formation',
  });

export const FooterLink = z
  .object({
    label: z.string().openapi({ example: 'Support technique' }),
    href: z.string().openapi({ example: '/support' }),
  })
  .openapi({
    description: 'Link shown in the footer',
  });

export const FooterConfig = z
  .object({
    productName: z.string().openapi({ example: 'Mairie360' }),
    version: z.string().openapi({ example: '2.1.0' }),
    links: z.array(FooterLink),
  })
  .openapi({
    description: 'Configuration of the footer',
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
    description: 'Signed-in user, as the E-learning screens expect it',
  });

export const NotificationSummary = z
  .object({
    unreadCount: z.number().min(0).openapi({ example: 3 }),
  })
  .openapi({
    description: 'Summary of the notifications of the signed-in user',
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
    duration: z.string().optional().openapi({
      description: 'Human duration (`12 min`, `1 h 30`). In an administration body, also `90 s`, `1h30`, `12:30` (minutes:seconds), `1:02:00` or a bare number of minutes.',
      example: '12 min',
    }),
    durationSeconds: z.number().int().min(0).optional().openapi({
      description: 'Duration in seconds; wins over `duration` in an administration body',
      example: 720,
    }),
    fileName: z.string().optional().openapi({ description: 'Name of the stored file (stored files only)', example: 'organigramme-mairie360.pdf' }),
    href: z.string().optional().openapi({
      description: 'Absolute `https://` URL of a `link` content (links only: a stored file is opened through the `file` route)',
      example: 'https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on',
    }),
    completed: z.boolean().optional(),
    required: z.boolean().optional().openapi({ description: '`false` for an optional content (defaults to `true` in an administration body)' }),
  })
  .openapi({
    description: 'Learning content of a chapter',
  });

export const CourseChapter = z
  .object({
    id: z.string().openapi({ example: 'accueil-1' }),
    title: z.string().openapi({ example: 'Municipal organisation' }),
    description: z.string().optional(),
    duration: z.string().optional().openapi({ description: 'Sum of the durations of its contents', example: '25 min' }),
    durationSeconds: z.number().int().min(0).optional().openapi({ description: 'Sum of the durations of its contents, in seconds', example: 1500 }),
    completed: z.boolean().optional(),
    active: z.boolean().optional(),
    contents: z.array(CourseContent).optional(),
  })
  .openapi({
    description: 'Chapter of a formation',
  });

export const ElearningCourseDetails = z
  .object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    instructor: z.string().optional(),
    duration: z.string().optional(),
    rating: z.union([z.number(), z.string()]).optional(),
    ratingLabel: z.string().optional().openapi({ example: '4,5 (12 avis)' }),
    ratingDistribution: RatingDistribution.optional(),
    progress: z.number().min(0).max(100).optional(),
    completed: z.boolean().optional(),
    completionRating: CompletionRating.optional(),
    chapters: z.array(CourseChapter),
  })
  .openapi({
    description: 'Full detail shown in the formation modal',
  });

export const ElearningCourse = z
  .object({
    id: z.string().openapi({ example: 'accueil-agents' }),
    title: z.string().openapi({ example: 'Accueil des nouveaux agents' }),
    description: z.string(),
    instructor: z.string().optional(),
    rating: z.union([z.number(), z.string()]).optional().openapi({ description: 'Average rating (1 to 5, one decimal), absent while nobody rated the course', example: 4.8 }),
    ratingCount: z.number().int().min(0).optional().openapi({ description: 'Number of ratings', example: 12 }),
    duration: z.string().optional().openapi({ description: 'Sum of the durations of its contents', example: '2 h 15' }),
    durationSeconds: z.number().int().min(0).optional().openapi({ description: 'Sum of the durations of its contents, in seconds', example: 8100 }),
    chapters: z.union([z.number(), z.string()]).optional().openapi({ example: 4 }),
    learners: z.union([z.number(), z.string()]).optional().openapi({ description: 'Number of users enrolled in the course', example: 128 }),
    category: z.string().optional().openapi({ example: 'Integration' }),
    level: CourseLevel.optional(),
    mandatory: z.boolean().optional().openapi({ description: '`true` for a mandatory course (its `titleBadge` is then the mandatory badge)' }),
    source: CourseSource.optional(),
    statusValue: CourseStatus.optional(),
    titleBadge: CourseBadge.optional(),
    levelBadge: CourseBadge.optional(),
    statusBadge: CourseBadge.optional(),
    progress: z.number().min(0).max(100).optional(),
    deadline: z.string().optional().openapi({
      description:
        'Date by which the course must be completed, ISO `YYYY-MM-DD` (the front formats it). An administration body also accepts an ISO date-time (its date is kept).',
      example: '2026-06-30',
    }),
    startedAt: z.string().optional().openapi({ description: 'Start of the caller on the course (RFC 3339), absent when none was recorded', example: '2026-03-02T08:15:00Z' }),
    completedAt: z.string().optional().openapi({ description: 'Completion of the course by the caller (RFC 3339), absent while not completed', example: '2026-03-20T16:40:00Z' }),
    lastActivityAt: z.string().optional().openapi({ description: 'Latest chapter the caller completed (RFC 3339), absent before any', example: '2026-03-18T10:05:00Z' }),
    lastReminderAt: z.string().optional().openapi({ description: 'Latest reminder an administrator sent the caller about this course (RFC 3339), absent without one', example: '2026-03-10T09:00:00Z' }),
    ratingDistribution: RatingDistribution.optional(),
    details: ElearningCourseDetails.optional(),
  })
  .openapi({
    description: 'Formation shown in the catalogue',
  });

registry.register('CourseContent', CourseContent);
registry.register('CourseChapter', CourseChapter);
registry.register('ElearningCourseDetails', ElearningCourseDetails);
registry.register('ElearningCourse', ElearningCourse);

// Creation body of POST /elearning/admin/courses. Built from the shape (not .extend()) so it is published as a plain
// object, not an allOf. The `id` the front gives a new course is ignored: the E-learning API allocates it.
export const AdminCourseCreateBody = z
  .object({ ...ElearningCourse.shape, id: z.string().optional().openapi({ description: 'Ignored: the e-learning service allocates the id', example: 'new-course' }) })
  .openapi('AdminCourseCreateBody', {
    description:
      'Formation to create. Its chapters (`details.chapters`) and their contents are created in order; a new content can only be a `link` (with its `href`), a `quiz` or `other`: there is no upload. Chapter and content ids are ignored.',
  });

registry.register('AdminCourseCreateBody', AdminCourseCreateBody);

// =====================
// CATALOG
// =====================

export const ElearningCatalogQuery = z.object({
  search: z.string().optional().openapi({ example: 'accueil' }),
  category: z.string().optional().openapi({ example: 'Integration' }),
  status: CatalogStatusFilter.optional(),
  page: z.coerce.number().int().min(1).optional().openapi({ example: 1 }),
  pageSize: z.coerce.number().int().min(1).max(100).optional().openapi({ example: 10 }),
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
    description: 'Full model of the E-learning catalogue',
  });

export const ElearningCatalogResponse = z
  .object({
    user: CurrentUser,
    notifications: NotificationSummary,
    catalog: ElearningCatalogView,
    footer: FooterConfig.optional(),
  })
  .openapi({
    description: 'Response loading the E-learning catalogue',
  });

registry.register('ElearningCatalogQuery', ElearningCatalogQuery);
registry.register('ElearningCatalogView', ElearningCatalogView);
registry.register('ElearningCatalogResponse', ElearningCatalogResponse);

export const AdminCourseResponse = z
  .object({
    id: z.string().openapi({ description: 'Id of the course in the e-learning service', example: '42' }),
    course: ElearningCourse,
  })
  .openapi({
    description:
      'Formation created or updated by an administrator: `course` is the course as it was sent, with its normalised fields and the id of the e-learning service. The ids of new chapters and contents are known once the catalogue is read again.',
  });

export const AdminCourseDeleteResponse = z
  .object({
    deleted: z.boolean(),
    courseId: z.string(),
  })
  .openapi({
    description: 'Confirmation that the course was deleted',
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
    description: 'Response loading the profile page',
  });

registry.register('ElearningProfileResponse', ElearningProfileResponse);

// =====================
// ACTIONS
// =====================

// E-learning API identifiers are positive integers: the BFF exposes them as decimal strings.
const NumericId = (description: string, example: string) =>
  z.string().regex(/^[1-9]\d{0,14}$/, 'Expected a positive integer identifier').openapi({ description, example });

export const CourseIdParams = z.object({
  courseId: NumericId('Course (E-learning API formation) identifier', '4'),
});

// The administration routes edit and delete the course they name: their example is course 7, a course of init-test.sql
// that nothing else reads, so the ZAP scan (which calls every operation on the examples) never edits course 4.
export const AdminCourseIdParams = z.object({
  courseId: NumericId('Course (E-learning API formation) identifier', '7'),
});

export const CourseContentParams = z.object({
  courseId: NumericId('Course (E-learning API formation) identifier', '4'),
  contentId: NumericId('Content (E-learning API attachment) identifier', '27'),
});

export const CompleteContentBody = z
  .object({
    chapterId: NumericId('Chapter (E-learning API module) identifier', '11'),
    completed: z.boolean().openapi({
      description: 'Only `true` is supported: the E-learning API cannot mark a module as not completed (501).',
      example: true,
    }),
  })
  .openapi({
    description:
      'Content completion. Progress is tracked per chapter by the E-learning API: completing a content completes its whole chapter.',
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
    description: 'Progress updated after a content is completed',
  });

export const SubmitRatingBody = z
  .object({
    rating: z.number().int().min(1).max(5).openapi({ example: 5 }),
  })
  .openapi({
    description: 'Rating sent by the user',
  });

export const RatingSubmitResponse = z
  .object({
    rating: z.number().min(1).max(5).openapi({ description: 'Average rating of the course, one decimal, the caller\'s included', example: 4.5 }),
    ratingCount: z.number().min(0).openapi({ description: 'Number of ratings of the course, the caller\'s included', example: 12 }),
    ratingLabel: z.string().openapi({ example: '4,5 (12 avis)' }),
    myRating: z.number().int().min(1).max(5).openapi({ description: 'The rating the caller just gave', example: 5 }),
    ratingDistribution: RatingDistribution.openapi({ description: 'Always empty: the e-learning service does not publish the distribution' }),
    submitted: z.boolean().openapi({ description: 'Always `true`' }),
  })
  .openapi({
    description: 'Rating summary after sending',
  });

export const CourseActionResponse = z
  .object({
    course: ElearningCourse,
    nextContentId: z.string().optional(),
    redirectUrl: z.string().optional(),
  })
  .openapi({
    description: 'Response to start or resume a formation',
  });

// Calendar year of the training time and the attestations (the e-learning service accepts 2000 to 2100).
export const YearQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().openapi({ description: 'Calendar year, from 2000 to 2100; defaults to the current year (UTC)', example: 2026 }),
});

export const TrainingTimeCourse = z
  .object({
    id: z.string().openapi({ example: '4' }),
    title: z.string().openapi({ example: 'RGPD pour les agents' }),
    status: CourseStatus.openapi({ description: 'Current progress of the caller, whatever the year' }),
    timeSpentSeconds: z.number().int().min(0).openapi({ description: 'Durations of the contents of the chapters completed during the year', example: 1800 }),
    completedAt: z.string().nullable().openapi({ description: 'Completion of the course (RFC 3339), `null` while not completed', example: '2026-03-20T16:40:00Z' }),
  })
  .openapi({ description: 'Training time of the caller on one course during the year' });

export const TrainingTimeResponse = z
  .object({
    year: z.number().int().openapi({ example: 2026 }),
    goalMinutes: z.number().int().min(0).openapi({ description: 'Yearly training goal of an agent, in minutes, set for the whole instance', example: 600 }),
    timeSpentSeconds: z.number().int().min(0).openapi({ description: 'Training time of the year, every course together, in seconds', example: 5400 }),
    completedCount: z.number().int().min(0).openapi({ description: 'Courses completed during the year', example: 2 }),
    courses: z.array(TrainingTimeCourse).openapi({ description: 'Every course the caller is enrolled in, by increasing id' }),
  })
  .openapi({ description: 'Training time of the caller during a year' });

export const ChapterContentParams = z.object({
  courseId: NumericId('Course (E-learning API formation) identifier', '4'),
  chapterId: NumericId('Chapter (E-learning API module) identifier', '11'),
  contentId: NumericId('Content (E-learning API attachment) identifier', '27'),
});

export const ContentFileResponse = z
  .object({
    url: z.string().openapi({
      description: 'Signed URL of the stored file, valid a few minutes: ask for it again on every opening instead of storing it',
      example: 'https://elearning.s3.fr-par.scw.cloud/courses/4/principes.pdf?X-Amz-Signature=abc',
    }),
  })
  .openapi({ description: 'Where to open a stored file (video, PDF, document, audio)' });

// PDF answers (attestations): the bytes of the e-learning service, as they are.
export const PdfDocument = z.string().openapi({ type: 'string', format: 'binary', description: 'PDF document' });

export const ServiceStats = z
  .object({
    serviceId: z.string().nullable().openapi({ description: 'Id of the service, `null` for the agents without a service', example: '3' }),
    serviceName: z.string().nullable().openapi({ description: 'Name of the service, `null` for the agents without a service', example: 'Urbanisme' }),
    agents: z.number().int().min(0).openapi({ example: 25 }),
    participants: z.number().int().min(0).openapi({ example: 20 }),
    participationRate: z.number().min(0).openapi({ description: 'Percent, one decimal', example: 80 }),
  })
  .openapi({ description: 'Participation of one service of the mairie' });

export const CourseStats = z
  .object({
    id: z.string().openapi({ example: '4' }),
    title: z.string().openapi({ example: 'RGPD pour les agents' }),
    source: CourseSource,
    mandatory: z.boolean(),
    enrolled: z.number().int().min(0).openapi({ description: 'Agents enrolled (archived accounts excluded)', example: 40 }),
    completed: z.number().int().min(0).openapi({ description: 'Agents who completed it', example: 12 }),
    averageProgress: z.number().min(0).openapi({ description: 'Average progress of the enrolled agents, percent, one decimal', example: 47.5 }),
  })
  .openapi({ description: 'Indicators of one course' });

export const LateAgent = z
  .object({
    userId: z.string().openapi({ description: 'Core API id of the agent', example: '42' }),
    firstName: z.string().openapi({ example: 'Alice' }),
    lastName: z.string().openapi({ example: 'Martin' }),
    courseId: z.string().openapi({ example: '4' }),
    courseTitle: z.string().openapi({ example: 'RGPD pour les agents' }),
    deadline: z.string().openapi({ description: 'Past deadline of the course, `YYYY-MM-DD`', example: '2026-06-30' }),
    progress: z.number().min(0).openapi({ description: 'Progress of the agent, percent, one decimal', example: 50 }),
    lastReminderAt: z.string().nullable().openapi({ description: 'Latest reminder sent to the agent about this course (RFC 3339), `null` without one', example: null }),
  })
  .openapi({ description: 'An agent late on a mandatory course' });

export const AdminStatsResponse = z
  .object({
    internalCourses: z.number().int().min(0).openapi({ description: 'Courses made by the mairie', example: 12 }),
    platformCourses: z.number().int().min(0).openapi({ description: 'Courses provided with Mairie360', example: 30 }),
    mandatoryInternalCourses: z.number().int().min(0).openapi({ description: 'Mandatory courses among the internal ones', example: 3 }),
    agents: z.number().int().min(0).openapi({ description: 'Non-archived accounts', example: 120 }),
    participants: z.number().int().min(0).openapi({ description: 'Agents enrolled in at least one course', example: 95 }),
    participationRate: z.number().min(0).openapi({ description: '`participants / agents`, percent, one decimal', example: 79.2 }),
    averageCompletion: z.number().min(0).openapi({ description: 'Average progress over every enrolment, percent, one decimal', example: 61.4 }),
    lateMandatory: z.number().int().min(0).openapi({ description: 'Enrolments on a mandatory course whose deadline is past, not completed', example: 7 }),
    byService: z.array(ServiceStats).openapi({ description: 'By service name, the agents without a service last' }),
    byCourse: z.array(CourseStats).openapi({ description: 'Every course, by increasing id' }),
    lateAgents: z.array(LateAgent).openapi({ description: 'The 500 most overdue late enrolments (`lateMandatory` counts them all), by deadline, then course, then agent' }),
  })
  .openapi({ description: 'E-learning indicators of the instance' });

export const SendRemindersBody = z
  .object({
    userIds: z
      .array(NumericId('Core API id of an agent', '42'))
      .max(1000)
      .optional()
      .openapi({ description: 'Agents to remind (at most 1000). Absent: every late agent of the course. Agents not enrolled, or who completed it, are ignored.' }),
  })
  .openapi({ description: 'Who to remind about a mandatory course' });

export const SendRemindersResponse = z
  .object({
    sent: z.number().int().min(0).openapi({ description: 'One per agent reminded; 0 when nobody was to remind', example: 3 }),
  })
  .openapi({ description: 'Reminders sent' });

// =====================
// ENROLMENT (MAIR-817): only an administrator enrols agents in a course
// =====================

// The enrolment writes name course 7 and agent 2 of init-test.sql, so the ZAP scan (which calls every operation on the
// examples) enrols and unenrols the seeded agent on the scratch course, never on course 4.
export const AdminLearnerParams = z.object({
  courseId: NumericId('Course (E-learning API formation) identifier', '7'),
  userId: NumericId('Core API id of the agent', '2'),
});

const agentIdentityShape = {
  userId: z.string().openapi({ description: 'Core API id of the agent', example: '2' }),
  name: z.string().openapi({ description: 'First and last name', example: 'Alice Martin' }),
  firstName: z.string().openapi({ description: 'First name of the account', example: 'Alice' }),
  lastName: z.string().openapi({ description: 'Last name of the account', example: 'Martin' }),
};

export const AgentIdentity = z.object(agentIdentityShape).openapi({ description: 'An active (non-archived) agent of the instance' });

export const AdminAgentsQuery = z.object({
  // Core refuses a search holding a control character (400), which the BFF answered 502: refused here first.
  // eslint-disable-next-line no-control-regex
  search: z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f\u007f]*$/, 'Must not contain a control character').optional().openapi({
    description: 'Part of the `first last` name, `last first` name or e-mail of the agent, case ignored (trimmed, 1 to 100 characters, no control character).',
    example: 'martin',
  }),
  limit: z.coerce.number().int().min(1).max(200).default(50).openapi({ description: 'Agents to return, 1 to 200 (default 50)', example: 50 }),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0).openapi({ description: 'Agents to skip, in id order (default 0): the `nextOffset` of the previous page', example: 0 }),
  excludeCourseId: NumericId('Leaves out the agents already enrolled in this course (the « add agents » picker of a course)', '4').optional(),
});

export const AdminAgentsResponse = z
  .object({
    agents: z.array(AgentIdentity).openapi({ description: 'Agents of the page, in id order' }),
    limit: z.number().int().openapi({ example: 50 }),
    offset: z.number().int().openapi({ example: 0 }),
    nextOffset: z.number().int().nullable().openapi({ description: 'Offset of the next page, `null` after the last agent. The total is not known upstream.', example: 50 }),
  })
  .openapi({ description: 'One page of the agents an administrator can enrol' });

export const CourseLearner = z.object({
  ...agentIdentityShape,
  status: CourseStatus,
  progress: z.number().int().min(0).max(100).openapi({ description: 'Share of the chapters completed, percent (100 once the course is completed)', example: 50 }),
  startedAt: z.string().nullable().openapi({ description: 'First chapter completed, `null` before', example: '2026-03-02T09:15:00' }),
  completedAt: z.string().nullable().openapi({ description: 'Course completed, `null` before', example: null }),
  lastActivityAt: z.string().nullable().openapi({ description: 'Last chapter completed, `null` before', example: '2026-03-04T10:00:00' }),
  lastReminderAt: z.string().nullable().openapi({ description: 'Last reminder an administrator sent for this course, `null` if none', example: null }),
}).openapi({ description: 'An agent enrolled in the course, with their progress' });

export const CourseLearnersQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50).openapi({ description: 'Learners to return, 1 to 200 (default 50)', example: 50 }),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0).openapi({ description: 'Learners to skip (default 0): the `nextOffset` of the previous page', example: 0 }),
});

export const CourseLearnersResponse = z
  .object({
    courseId: z.string().openapi({ example: '4' }),
    learners: z.array(CourseLearner).openapi({ description: 'Learners of the page, by last name, first name and id' }),
    total: z.number().int().min(0).openapi({ description: 'Active learners of the course, all pages together', example: 12 }),
    limit: z.number().int().openapi({ example: 50 }),
    offset: z.number().int().openapi({ example: 0 }),
    nextOffset: z.number().int().nullable().openapi({ description: 'Offset of the next page, `null` after the last learner', example: null }),
  })
  .openapi({ description: 'One page of the active (non-archived) agents enrolled in a course' });

export const EnrolLearnersBody = z
  .object({
    userIds: z.array(NumericId('Core API id of an agent', '2')).min(1).max(200).openapi({ description: '1 to 200 agents to enrol (duplicates are counted once)' }),
  })
  .openapi({ description: 'Agents to enrol in the course' });

export const EnrolLearnersResponse = z
  .object({
    courseId: z.string().openapi({ example: '7' }),
    enrolled: z.array(z.string()).openapi({ description: 'Agents enrolled by this request', example: ['2'] }),
    alreadyEnrolled: z.array(z.string()).openapi({ description: 'Agents who were enrolled already (their progress is kept)', example: [] }),
    failed: z.array(z.string()).openapi({ description: 'Agents not enrolled: unknown or archived account, or a failure of the e-learning service for that agent', example: [] }),
  })
  .openapi({ description: 'Outcome of the enrolment, per agent, in the order of the request' });

export const RemoveLearnerResponse = z
  .object({
    removed: z.boolean(),
    courseId: z.string().openapi({ example: '7' }),
    userId: z.string().openapi({ example: '2' }),
  })
  .openapi({ description: 'Confirmation that the agent was unenrolled (their progress on the course is deleted)' });

registry.register('AdminLearnerParams', AdminLearnerParams);
registry.register('AgentIdentity', AgentIdentity);
registry.register('AdminAgentsQuery', AdminAgentsQuery);
registry.register('AdminAgentsResponse', AdminAgentsResponse);
registry.register('CourseLearner', CourseLearner);
registry.register('CourseLearnersQuery', CourseLearnersQuery);
registry.register('CourseLearnersResponse', CourseLearnersResponse);
registry.register('EnrolLearnersBody', EnrolLearnersBody);
registry.register('EnrolLearnersResponse', EnrolLearnersResponse);
registry.register('RemoveLearnerResponse', RemoveLearnerResponse);

registry.register('YearQuery', YearQuery);
registry.register('TrainingTimeCourse', TrainingTimeCourse);
registry.register('TrainingTimeResponse', TrainingTimeResponse);
registry.register('ChapterContentParams', ChapterContentParams);
registry.register('ContentFileResponse', ContentFileResponse);
registry.register('ServiceStats', ServiceStats);
registry.register('CourseStats', CourseStats);
registry.register('LateAgent', LateAgent);
registry.register('AdminStatsResponse', AdminStatsResponse);
registry.register('SendRemindersBody', SendRemindersBody);
registry.register('SendRemindersResponse', SendRemindersResponse);
registry.register('CourseIdParams', CourseIdParams);
registry.register('AdminCourseIdParams', AdminCourseIdParams);
registry.register('CourseContentParams', CourseContentParams);
registry.register('CompleteContentBody', CompleteContentBody);
registry.register('ContentCompleteResponse', ContentCompleteResponse);
registry.register('SubmitRatingBody', SubmitRatingBody);
registry.register('RatingSubmitResponse', RatingSubmitResponse);
registry.register('CourseActionResponse', CourseActionResponse);

// =====================
// ERROR
// =====================

// Body of every error answer, shared by every BFF (`@mairie360/bffs-lib`): `{ error: { code, message, details } }`.
// clone(): the lib builds its schemas on import, before extendZodWithOpenApi() above, and zod 4 only
// adds .openapi() to schemas created after the extension.
export const ErrorResponse = registry.register('ErrorResponse', ErrorResponseSchema.clone());

// Errors shared by the routes that call Core API or the E-learning API on behalf of the caller (routes/Elearning/auth.ts).
export const sessionErrorResponses = {
  401: {
    description: 'Missing, expired or invalid session',
    content: { 'application/json': { schema: ErrorResponse } },
  },
  // bffs-lib >= 2.4.0 relays an upstream 429 with its Retry-After instead of a 502 (MAIR-562).
  429: {
    description: 'An upstream API rate limit is reached: retry after the Retry-After header (seconds)',
    content: { 'application/json': { schema: ErrorResponse } },
  },
  502: {
    description: 'An upstream API is unreachable, failed or answered an unusable body',
    content: { 'application/json': { schema: ErrorResponse } },
  },
  503: {
    description: 'An upstream API is not configured (`<SERVICE>_URL` missing or invalid)',
    content: { 'application/json': { schema: ErrorResponse } },
  },
};

// Features with no upstream equivalent yet: the BFF answers 501 instead of faking persistence.
export const notImplementedResponse = {
  501: {
    description: 'Not available: no upstream service stores this data yet',
    content: { 'application/json': { schema: ErrorResponse } },
  },
};
