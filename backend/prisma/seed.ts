import { PrismaClient, RoleCode, TicketPriority, TicketStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const ROLES: { code: RoleCode; name: string }[] = [
  { code: RoleCode.USER, name: 'Пользователь' },
  { code: RoleCode.AGENT, name: 'Исполнитель' },
  { code: RoleCode.MANAGER, name: 'Руководитель' },
];

const POLICIES: { priority: TicketPriority; reaction: number; resolution: number }[] = [
  { priority: TicketPriority.LOW, reaction: 480, resolution: 4320 },
  { priority: TicketPriority.MEDIUM, reaction: 240, resolution: 1440 },
  { priority: TicketPriority.HIGH, reaction: 60, resolution: 480 },
  { priority: TicketPriority.CRITICAL, reaction: 15, resolution: 120 },
];

const CATEGORIES = [
  ['Оборудование', 'Компьютеры, принтеры, периферия'],
  ['Программы', 'Установка и работа приложений'],
  ['Сеть и интернет', 'Подключение, Wi-Fi, VPN'],
  ['Учётные записи', 'Доступы и пароли'],
  ['Почта', 'Корпоративная почта и календарь'],
];

const USERS: { email: string; fullName: string; roles: RoleCode[] }[] = [
  {
    email: 'manager@helpdesk.local',
    fullName: 'Смирнова Ольга Петровна',
    roles: [RoleCode.MANAGER],
  },
  { email: 'agent1@helpdesk.local', fullName: 'Волков Илья Сергеевич', roles: [RoleCode.AGENT] },
  { email: 'agent2@helpdesk.local', fullName: 'Кузнецова Анна Игоревна', roles: [RoleCode.AGENT] },
  { email: 'user1@helpdesk.local', fullName: 'Орлов Дмитрий Андреевич', roles: [RoleCode.USER] },
  { email: 'user2@helpdesk.local', fullName: 'Соколова Мария Николаевна', roles: [RoleCode.USER] },
  { email: 'user3@helpdesk.local', fullName: 'Лебедев Павел Олегович', roles: [RoleCode.USER] },
];

const TITLES = [
  'Не печатает принтер в бухгалтерии',
  'Не запускается 1С после обновления',
  'Нет доступа к общей папке отдела',
  'Медленно работает интернет',
  'Не приходит почта на корпоративный адрес',
  'Нужна установка графического редактора',
  'Сломалась клавиатура на рабочем месте',
  'Не подключается VPN из дома',
  'Требуется сброс пароля от учётной записи',
  'Монитор периодически гаснет',
];

const PATHS: TicketStatus[][] = [
  [TicketStatus.NEW],
  [TicketStatus.NEW, TicketStatus.ASSIGNED],
  [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS],
  [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER],
  [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [
    TicketStatus.NEW,
    TicketStatus.ASSIGNED,
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
];

async function seedReferenceData(): Promise<Map<RoleCode, number>> {
  for (const role of ROLES) {
    await prisma.role.upsert({ where: { code: role.code }, update: {}, create: role });
  }
  for (const policy of POLICIES) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: {},
      create: {
        priority: policy.priority,
        reactionMinutes: policy.reaction,
        resolutionMinutes: policy.resolution,
      },
    });
  }
  for (const [name, description] of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name, description } });
  }
  const roles = await prisma.role.findMany();
  return new Map(roles.map((role) => [role.code, role.id]));
}

async function seedDemoData(roleIds: Map<RoleCode, number>): Promise<void> {
  const passwordHash = await argon2.hash(SEED_PASSWORD);
  const users = await Promise.all(
    USERS.map((user) =>
      prisma.user.create({
        data: {
          email: user.email,
          fullName: user.fullName,
          passwordHash,
          roles: { create: user.roles.map((code) => ({ roleId: roleIds.get(code)! })) },
        },
      }),
    ),
  );
  const [manager, agent1, agent2, ...requesters] = users;
  const agents = [agent1, agent2];
  const categories = await prisma.category.findMany();
  const policies = new Map(
    (await prisma.slaPolicy.findMany()).map((policy) => [policy.priority, policy]),
  );
  const priorities = Object.values(TicketPriority);
  const now = Date.now();

  for (let i = 0; i < 60; i += 1) {
    const path = PATHS[i % PATHS.length];
    const status = path[path.length - 1];
    const priority = priorities[i % priorities.length];
    const policy = policies.get(priority)!;
    const author = requesters[i % requesters.length];
    const isFinished = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
    const isLate = isFinished && i % 10 === 4;
    const openDeadline =
      status === TicketStatus.NEW ? policy.reactionMinutes : policy.resolutionMinutes;
    const openAge = (i % 8 === 0 ? openDeadline + 30 : openDeadline * 0.4) * MINUTE;
    const createdAt = new Date(
      now - (isFinished ? ((i % 13) + 1) * DAY + (i + 1) * 37 * MINUTE : openAge),
    );
    const assignee = status === TicketStatus.NEW ? null : agents[i % agents.length];
    const reactionDueAt = new Date(createdAt.getTime() + policy.reactionMinutes * MINUTE);
    const resolutionDueAt = new Date(createdAt.getTime() + policy.resolutionMinutes * MINUTE);
    const resolvedIndex = path.indexOf(TicketStatus.RESOLVED);
    const stepMinutes = isLate ? (policy.resolutionMinutes + 20) / (resolvedIndex + 1) : 3;
    const step = (index: number) =>
      new Date(createdAt.getTime() + (index + 1) * stepMinutes * MINUTE);
    const closedIndex = path.indexOf(TicketStatus.CLOSED);
    const resolvedAt = resolvedIndex >= 0 ? step(resolvedIndex) : null;
    const isReacted = assignee !== null;

    await prisma.ticket.create({
      data: {
        title: TITLES[i % TITLES.length],
        description: `Описание проблемы по заявке. Проблема возникла ${(i % 9) + 1} дн. назад и мешает работе.`,
        status,
        priority,
        categoryId: categories[i % categories.length].id,
        authorId: author.id,
        assigneeId: assignee?.id ?? null,
        createdAt,
        reactionDueAt,
        resolutionDueAt,
        reactedAt: isReacted ? step(0) : null,
        resolvedAt,
        closedAt: closedIndex >= 0 ? step(closedIndex) : null,
        reactionBreachedAt: !isReacted && reactionDueAt.getTime() < now ? reactionDueAt : null,
        resolutionBreachedAt:
          isLate || (!isFinished && resolutionDueAt.getTime() < now) ? resolutionDueAt : null,
        statusHistory: {
          create: path.map((toStatus, index) => ({
            fromStatus: index === 0 ? null : path[index - 1],
            toStatus,
            changedById: index === 0 ? author.id : (assignee ?? manager).id,
            createdAt: step(index),
          })),
        },
        comments: assignee
          ? {
              create: [
                {
                  authorId: assignee.id,
                  body: 'Заявка принята, уточняем детали.',
                  createdAt: step(0),
                },
                {
                  authorId: author.id,
                  body: 'Спасибо, жду решения.',
                  createdAt: step(1),
                },
              ],
            }
          : undefined,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: manager.id,
      action: 'SEED_COMPLETED',
      entityType: 'System',
      details: { users: users.length, tickets: 60 },
    },
  });
}

async function main(): Promise<void> {
  const roleIds = await seedReferenceData();
  if ((await prisma.user.count()) > 0) {
    console.log('Seed: пользователи уже есть, демонстрационные данные пропущены');
    return;
  }
  await seedDemoData(roleIds);
  console.log('Seed: данные созданы');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
