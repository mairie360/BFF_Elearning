import type { Response } from 'express';
import { z } from 'zod';
import {
  CompleteContentBody,
  ContentCompleteResponse,
  CourseActionResponse,
  CourseChapter,
  CourseContent,
  CurrentUser,
  ElearningCatalogQuery,
  ElearningCatalogResponse,
  ElearningCourse,
  ElearningProfileResponse,
  FooterConfig,
  ProfileUpdateResponse,
  RatingDistribution,
  RatingSubmitResponse,
  SubmitRatingBody,
  UpdateProfileBody,
} from '../../openapi-registry';

type BffCurrentUser = z.infer<typeof CurrentUser>;
type BffFooterConfig = z.infer<typeof FooterConfig>;
type BffCourse = z.infer<typeof ElearningCourse>;
type BffChapter = z.infer<typeof CourseChapter>;
type BffContent = z.infer<typeof CourseContent>;
type BffCatalogQuery = z.infer<typeof ElearningCatalogQuery>;
type BffCatalogResponse = z.infer<typeof ElearningCatalogResponse>;
type BffProfileResponse = z.infer<typeof ElearningProfileResponse>;
type BffUpdateProfileBody = z.infer<typeof UpdateProfileBody>;
type BffProfileUpdateResponse = z.infer<typeof ProfileUpdateResponse>;
type BffCompleteContentBody = z.infer<typeof CompleteContentBody>;
type BffContentCompleteResponse = z.infer<typeof ContentCompleteResponse>;
type BffSubmitRatingBody = z.infer<typeof SubmitRatingBody>;
type BffRatingDistribution = z.infer<typeof RatingDistribution>;
type BffRatingSubmitResponse = z.infer<typeof RatingSubmitResponse>;
type BffCourseActionResponse = z.infer<typeof CourseActionResponse>;
type RatingKey = '1' | '2' | '3' | '4' | '5';

export class ElearningRouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = {},
  ) {
    super(message);
    this.name = 'ElearningRouteError';
  }
}

const footerConfig: BffFooterConfig = {
  productName: 'Mairie360',
  version: '2.1.0',
  links: [
    { label: 'Support technique', href: '/support' },
    { label: 'Documentation', href: '/documentation' },
    { label: "Conditions d'utilisation", href: '/conditions' },
  ],
};

let currentUser: BffCurrentUser = {
  id: 'user-123',
  name: 'Admin Systeme',
  initials: 'AS',
  email: 'admin@mairie360.fr',
  phone: '+262 692 00 00 00',
  service: 'Administration',
  position: 'Administrateur systeme',
  role: 'admin',
  isAdmin: true,
  address: '1 rue de la Mairie',
  city: 'Saint-Denis',
  lastConnection: '3 juillet 2026 a 09:15',
};

const courses: BffCourse[] = [
  {
    id: 'accueil-agents',
    title: 'Accueil des nouveaux agents',
    description:
      "Un parcours court pour comprendre l'organisation municipale, les outils internes et les premiers reflexes de service public.",
    instructor: 'Direction des ressources humaines',
    rating: 4.8,
    duration: '2 h 15',
    chapters: 4,
    learners: 128,
    category: 'Integration',
    statusValue: 'in-progress',
    titleBadge: { label: 'Obligatoire', variant: 'mandatory' },
    levelBadge: { label: 'Debutant', variant: 'beginner' },
    statusBadge: { label: 'En cours', variant: 'inProgress' },
    progress: 50,
    deadline: '30 juin 2026',
    ratingDistribution: { '1': 0, '2': 1, '3': 4, '4': 35, '5': 88 },
    details: {
      title: 'Accueil des nouveaux agents',
      subtitle: "Parcours d'integration",
      description:
        'Cette formation accompagne les agents dans leurs premieres semaines : cadre administratif, canaux de communication, securite des donnees et bonnes pratiques terrain.',
      instructor: 'Direction des ressources humaines',
      duration: '2 h 15',
      progress: 50,
      ratingDistribution: { '1': 0, '2': 1, '3': 4, '4': 35, '5': 88 },
      chapters: [
        {
          id: 'accueil-1',
          title: "Comprendre l'organisation municipale",
          duration: '25 min',
          completed: true,
          contents: [
            {
              id: 'accueil-1-video',
              title: 'Presentation des directions et services',
              type: 'video',
              duration: '12 min',
              completed: true,
            },
            {
              id: 'accueil-1-doc',
              title: 'Organigramme et contacts utiles',
              type: 'pdf',
              fileName: 'organigramme-mairie360.pdf',
              completed: true,
            },
          ],
        },
        {
          id: 'accueil-2',
          title: 'Utiliser les outils internes',
          duration: '40 min',
          active: true,
          contents: [
            {
              id: 'accueil-2-video',
              title: 'Messagerie, agenda et portail RH',
              type: 'video',
              duration: '18 min',
              completed: true,
            },
            {
              id: 'accueil-2-quiz',
              title: 'Verifier ses premiers acquis',
              type: 'quiz',
              duration: '8 min',
              completed: false,
            },
          ],
        },
        {
          id: 'accueil-3',
          title: 'Adopter les reflexes de service public',
          duration: '35 min',
          contents: [
            {
              id: 'accueil-3-video',
              title: 'Accueil, impartialite et confidentialite',
              type: 'video',
              duration: '16 min',
              completed: false,
            },
            {
              id: 'accueil-3-support',
              title: "Charte de l'agent municipal",
              type: 'document',
              fileName: 'charte-agent.pdf',
              completed: false,
            },
          ],
        },
        {
          id: 'accueil-4',
          title: 'Finaliser son integration',
          duration: '35 min',
          contents: [
            {
              id: 'accueil-4-check',
              title: "Checklist des demarches d'arrivee",
              type: 'document',
              completed: false,
            },
            {
              id: 'accueil-4-quiz',
              title: 'Evaluation finale',
              type: 'quiz',
              duration: '12 min',
              completed: false,
            },
          ],
        },
      ],
      completionRating: {
        title: 'Evaluer ce parcours',
        helperText: "Votre retour aide a ameliorer l'accueil des prochains agents.",
        submitted: false,
      },
    },
  },
  {
    id: 'rgpd-collectivites',
    title: 'RGPD et donnees communales',
    description:
      "Identifier les donnees personnelles, appliquer les bonnes pratiques et reagir correctement en cas d'incident.",
    instructor: 'Delegue a la protection des donnees',
    rating: 4.6,
    duration: '3 h',
    chapters: 5,
    learners: 86,
    category: 'Conformite',
    statusValue: 'not-started',
    titleBadge: { label: 'Obligatoire', variant: 'mandatory' },
    levelBadge: { label: 'Intermediaire', variant: 'intermediate' },
    statusBadge: { label: 'Non commence', variant: 'notStarted' },
    progress: 0,
    deadline: '15 juillet 2026',
    ratingDistribution: { '1': 1, '2': 2, '3': 8, '4': 31, '5': 44 },
    details: {
      title: 'RGPD et donnees communales',
      subtitle: 'Protection des donnees au quotidien',
      description:
        'Le parcours presente les obligations RGPD dans un contexte de mairie : demandes citoyennes, dossiers administratifs, conservation, partage et signalement.',
      instructor: 'Delegue a la protection des donnees',
      duration: '3 h',
      progress: 0,
      ratingDistribution: { '1': 1, '2': 2, '3': 8, '4': 31, '5': 44 },
      chapters: [
        {
          id: 'rgpd-1',
          title: 'Reconnaitre une donnee personnelle',
          duration: '30 min',
          active: true,
          contents: [
            {
              id: 'rgpd-1-video',
              title: 'Donnees citoyennes et donnees sensibles',
              type: 'video',
              duration: '15 min',
            },
            {
              id: 'rgpd-1-quiz',
              title: 'Cas pratiques de qualification',
              type: 'quiz',
              duration: '10 min',
            },
          ],
        },
        {
          id: 'rgpd-2',
          title: 'Collecter le strict necessaire',
          duration: '35 min',
          contents: [
            {
              id: 'rgpd-2-video',
              title: 'Minimisation et information des usagers',
              type: 'video',
              duration: '18 min',
            },
            {
              id: 'rgpd-2-doc',
              title: "Modele de mention d'information",
              type: 'pdf',
              fileName: 'mention-information-rgpd.pdf',
            },
          ],
        },
        {
          id: 'rgpd-3',
          title: 'Partager et conserver les dossiers',
          duration: '45 min',
          contents: [
            {
              id: 'rgpd-3-video',
              title: 'Regles de conservation et habilitations',
              type: 'video',
              duration: '20 min',
            },
            {
              id: 'rgpd-3-link',
              title: 'Referentiel interne des durees de conservation',
              type: 'link',
              href: '#',
              required: false,
            },
          ],
        },
        {
          id: 'rgpd-4',
          title: 'Reagir a une violation de donnees',
          duration: '40 min',
          contents: [
            {
              id: 'rgpd-4-audio',
              title: "Scenario commente d'incident",
              type: 'audio',
              duration: '9 min',
            },
            {
              id: 'rgpd-4-doc',
              title: 'Fiche reflexe de signalement',
              type: 'document',
            },
          ],
        },
        {
          id: 'rgpd-5',
          title: 'Evaluation RGPD',
          duration: '30 min',
          contents: [
            {
              id: 'rgpd-5-quiz',
              title: 'Evaluation finale',
              type: 'quiz',
              duration: '20 min',
            },
          ],
        },
      ],
      completionRating: {
        title: 'Noter la formation RGPD',
        submitted: false,
      },
    },
  },
  {
    id: 'relation-usager',
    title: 'Relation usager en situation sensible',
    description:
      'Des methodes concretes pour accueillir, apaiser et orienter un usager dans les situations de tension.',
    instructor: 'Pole accueil citoyen',
    rating: 4.9,
    duration: '2 h 45',
    chapters: 4,
    learners: 211,
    category: 'Relation usager',
    statusValue: 'completed',
    levelBadge: { label: 'Intermediaire', variant: 'intermediate' },
    statusBadge: { label: 'Termine', variant: 'completed' },
    progress: 100,
    ratingDistribution: { '1': 0, '2': 1, '3': 3, '4': 39, '5': 168 },
    details: {
      title: 'Relation usager en situation sensible',
      subtitle: 'Accueil et posture professionnelle',
      description:
        "Le parcours combine apports courts, mises en situation et quiz pour renforcer les reflexes d'accueil dans les moments difficiles.",
      instructor: 'Pole accueil citoyen',
      duration: '2 h 45',
      progress: 100,
      completed: true,
      ratingDistribution: { '1': 0, '2': 1, '3': 3, '4': 39, '5': 168 },
      chapters: [
        {
          id: 'usager-1',
          title: "Installer un cadre d'echange clair",
          duration: '35 min',
          completed: true,
          contents: [
            {
              id: 'usager-1-video',
              title: 'Ecoute active et reformulation',
              type: 'video',
              duration: '14 min',
              completed: true,
            },
            {
              id: 'usager-1-quiz',
              title: 'Identifier les signaux faibles',
              type: 'quiz',
              duration: '8 min',
              completed: true,
            },
          ],
        },
        {
          id: 'usager-2',
          title: 'Desamorcer une tension',
          duration: '45 min',
          completed: true,
          contents: [
            {
              id: 'usager-2-video',
              title: 'Postures et mots utiles',
              type: 'video',
              duration: '20 min',
              completed: true,
            },
            {
              id: 'usager-2-audio',
              title: "Analyse d'un dialogue d'accueil",
              type: 'audio',
              duration: '7 min',
              completed: true,
            },
          ],
        },
        {
          id: 'usager-3',
          title: 'Orienter vers le bon interlocuteur',
          duration: '35 min',
          completed: true,
          contents: [
            {
              id: 'usager-3-doc',
              title: 'Cartographie des relais internes',
              type: 'document',
              completed: true,
            },
          ],
        },
        {
          id: 'usager-4',
          title: 'Evaluation finale',
          duration: '50 min',
          completed: true,
          contents: [
            {
              id: 'usager-4-quiz',
              title: 'Mise en situation finale',
              type: 'quiz',
              duration: '25 min',
              completed: true,
            },
          ],
        },
      ],
      completionRating: {
        title: 'Votre avis sur la formation',
        submitted: false,
      },
    },
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getStatusBadge(status: BffCourse['statusValue']): BffCourse['statusBadge'] {
  if (status === 'completed') {
    return { label: 'Termine', variant: 'completed' };
  }

  if (status === 'in-progress') {
    return { label: 'En cours', variant: 'inProgress' };
  }

  return { label: 'Non commence', variant: 'notStarted' };
}

function getStatusFromProgress(progress: number): BffCourse['statusValue'] {
  if (progress >= 100) {
    return 'completed';
  }

  if (progress > 0) {
    return 'in-progress';
  }

  return 'not-started';
}

function getRequiredContents(chapters: BffChapter[]): BffContent[] {
  return chapters.flatMap((chapter) => chapter.contents ?? []).filter((content) => content.required !== false);
}

function getFirstIncompleteContent(chapters: BffChapter[]): BffContent | undefined {
  return getRequiredContents(chapters).find((content) => !content.completed);
}

function getRatingCount(distribution: BffRatingDistribution): number {
  return (['1', '2', '3', '4', '5'] as RatingKey[]).reduce((total, key) => total + (distribution[key] ?? 0), 0);
}

function getRatingAverage(distribution: BffRatingDistribution): number {
  const ratingCount = getRatingCount(distribution);

  if (ratingCount === 0) {
    return 0;
  }

  const total = (['1', '2', '3', '4', '5'] as RatingKey[]).reduce(
    (sum, key) => sum + Number(key) * (distribution[key] ?? 0),
    0,
  );

  return Math.round((total / ratingCount) * 10) / 10;
}

function ensureRatingDistribution(course: BffCourse): BffRatingDistribution {
  const ratingDistribution = course.ratingDistribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  course.ratingDistribution = ratingDistribution;

  if (course.details) {
    course.details.ratingDistribution = ratingDistribution;
  }

  return ratingDistribution;
}

function updateCourseProgress(course: BffCourse): {
  completedRequiredContents: number;
  totalRequiredContents: number;
  completedChapters: number;
  totalChapters: number;
  progress: number;
  completed: boolean;
} {
  const chapters = course.details?.chapters ?? [];
  const requiredContents = getRequiredContents(chapters);
  const totalRequiredContents = requiredContents.length;
  const completedRequiredContents = requiredContents.filter((content) => content.completed).length;
  const progress =
    totalRequiredContents === 0 ? 0 : Math.round((completedRequiredContents / totalRequiredContents) * 100);
  const completed = totalRequiredContents > 0 && completedRequiredContents === totalRequiredContents;
  let activeChapterAssigned = false;

  for (const chapter of chapters) {
    const chapterRequiredContents = (chapter.contents ?? []).filter((content) => content.required !== false);
    const chapterCompleted =
      chapterRequiredContents.length > 0 && chapterRequiredContents.every((content) => content.completed);

    chapter.completed = chapterCompleted;
    chapter.active = false;

    if (!chapterCompleted && !activeChapterAssigned) {
      chapter.active = true;
      activeChapterAssigned = true;
    }
  }

  if (course.details) {
    course.details.progress = progress;
    course.details.completed = completed;
  }

  course.progress = progress;
  course.statusValue = getStatusFromProgress(progress);
  course.statusBadge = getStatusBadge(course.statusValue);

  return {
    completedRequiredContents,
    totalRequiredContents,
    completedChapters: chapters.filter((chapter) => chapter.completed).length,
    totalChapters: chapters.length,
    progress,
    completed,
  };
}

function findCourse(courseId: string): BffCourse {
  const course = courses.find((entry) => entry.id === courseId);

  if (!course) {
    throw new ElearningRouteError(404, 'COURSE_NOT_FOUND', 'Formation introuvable.', { courseId });
  }

  return course;
}

function findCourseDetails(course: BffCourse) {
  if (!course.details) {
    throw new ElearningRouteError(422, 'COURSE_DETAILS_UNAVAILABLE', 'Detail de formation indisponible.', {
      courseId: course.id,
    });
  }

  return course.details;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details: unknown = {},
): Response {
  return res.status(status).json({
    code,
    message,
    details,
  });
}

export function sendValidationError(res: Response, details: unknown): Response {
  return sendError(res, 400, 'BAD_REQUEST', 'Payload invalide.', details);
}

export function handleRouteError(res: Response, error: unknown): Response {
  if (error instanceof ElearningRouteError) {
    return sendError(res, error.status, error.code, error.message, error.details);
  }

  const message = error instanceof Error ? error.message : 'Erreur serveur non prevue.';
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

export function buildCatalogResponse(query: BffCatalogQuery): BffCatalogResponse {
  const search = query.search ? normalize(query.search) : '';
  const category = query.category && query.category !== 'all' ? query.category : undefined;
  const status = query.status && query.status !== 'all' ? query.status : undefined;
  const filteredCourses = courses.filter((course) => {
    const searchableText = normalize(
      [course.title, course.description, course.instructor, course.category].filter(Boolean).join(' '),
    );
    const matchesSearch = search ? searchableText.includes(search) : true;
    const matchesCategory = category ? course.category === category : true;
    const matchesStatus = status ? course.statusValue === status : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? (filteredCourses.length || 20);
  const pagedCourses = filteredCourses.slice((page - 1) * pageSize, page * pageSize);
  const categories = Array.from(
    new Set(courses.map((course) => course.category).filter((value): value is string => Boolean(value))),
  ).map((value) => ({
    label: value,
    value,
  }));

  return {
    user: clone(currentUser),
    notifications: {
      unreadCount: 3,
    },
    catalog: {
      title: 'Centre de Formation',
      subtitle: 'Developpez vos competences professionnelles',
      certificationCount: 14,
      emptyLabel: 'Aucune formation ne correspond a votre recherche.',
      statuses: [
        { label: 'Tous les statuts', value: 'all' },
        { label: 'Non commence', value: 'not-started' },
        { label: 'En cours', value: 'in-progress' },
        { label: 'Termine', value: 'completed' },
      ],
      categories: [{ label: 'Toutes les categories', value: 'all' }, ...categories],
      stats: [
        { label: 'Formations disponibles', value: courses.length },
        { label: 'En cours', value: courses.filter((course) => course.statusValue === 'in-progress').length },
        { label: 'Terminees', value: courses.filter((course) => course.statusValue === 'completed').length },
      ],
      courses: clone(pagedCourses),
    },
    footer: clone(footerConfig),
  };
}

export function buildProfileResponse(): BffProfileResponse {
  return {
    user: clone(currentUser),
    footer: clone(footerConfig),
  };
}

export function updateProfile(body: BffUpdateProfileBody): BffProfileUpdateResponse {
  currentUser = {
    ...currentUser,
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.address !== undefined ? { address: body.address } : {}),
    ...(body.city !== undefined ? { city: body.city } : {}),
  };

  return {
    user: clone(currentUser),
  };
}

export function completeCourseContent(
  courseId: string,
  contentId: string,
  body: BffCompleteContentBody,
): BffContentCompleteResponse {
  const course = findCourse(courseId);
  const details = findCourseDetails(course);
  const chapter = details.chapters.find((entry) => entry.id === body.chapterId);

  if (!chapter) {
    throw new ElearningRouteError(404, 'CHAPTER_NOT_FOUND', 'Chapitre introuvable.', {
      courseId,
      chapterId: body.chapterId,
    });
  }

  const content = chapter.contents?.find((entry) => entry.id === contentId);

  if (!content) {
    throw new ElearningRouteError(404, 'CONTENT_NOT_FOUND', 'Contenu introuvable.', {
      courseId,
      chapterId: body.chapterId,
      contentId,
    });
  }

  content.completed = body.completed;
  const progress = updateCourseProgress(course);

  return {
    ...progress,
    chapters: clone(details.chapters),
    chapter: clone(chapter),
    content: clone(content),
  };
}

export function submitCourseRating(
  courseId: string,
  body: BffSubmitRatingBody,
): BffRatingSubmitResponse {
  const course = findCourse(courseId);
  const ratingDistribution = ensureRatingDistribution(course);
  const ratingKey = String(body.rating) as RatingKey;
  ratingDistribution[ratingKey] = (ratingDistribution[ratingKey] ?? 0) + 1;
  const rating = getRatingAverage(ratingDistribution);

  course.rating = rating;

  if (course.details) {
    course.details.rating = rating;
    course.details.completionRating = {
      ...course.details.completionRating,
      initialValue: body.rating,
      submitted: true,
    };
  }

  return {
    rating,
    ratingCount: getRatingCount(ratingDistribution),
    ratingDistribution: clone(ratingDistribution),
    submitted: true,
  };
}

export function startCourse(courseId: string): BffCourseActionResponse {
  const course = findCourse(courseId);
  const details = findCourseDetails(course);

  if (course.statusValue === 'not-started') {
    course.statusValue = 'in-progress';
    course.statusBadge = getStatusBadge('in-progress');
    course.progress = course.progress ?? 0;
    details.progress = details.progress ?? 0;
  }

  const nextContentId = getFirstIncompleteContent(details.chapters)?.id;

  return {
    course: clone(course),
    ...(nextContentId ? { nextContentId } : {}),
    redirectUrl: `/courses/${course.id}`,
  };
}
