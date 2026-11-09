import { RoleCode, TicketStatus } from '@prisma/client';
import { AuthUser } from '../common/auth/auth-user';
import { TicketPolicyService } from './ticket-policy.service';

const user = (id: string, ...roles: RoleCode[]): AuthUser => ({
  id,
  email: `${id}@test.ru`,
  fullName: id,
  roles,
});

const author = user('author', RoleCode.USER);
const stranger = user('stranger', RoleCode.USER);
const agent = user('agent', RoleCode.AGENT);
const otherAgent = user('other', RoleCode.AGENT);
const manager = user('manager', RoleCode.MANAGER);

const ticket = (status: TicketStatus, assigneeId: string | null = 'agent') => ({
  status,
  authorId: 'author',
  assigneeId,
});

describe('TicketPolicyService', () => {
  const policy = new TicketPolicyService();

  describe('просмотр', () => {
    it('разрешает автору, исполнителю и руководителю', () => {
      const target = ticket(TicketStatus.IN_PROGRESS);
      expect(policy.canView(target, author)).toBe(true);
      expect(policy.canView(target, agent)).toBe(true);
      expect(policy.canView(target, manager)).toBe(true);
    });

    it('запрещает постороннему пользователю и чужому исполнителю', () => {
      const target = ticket(TicketStatus.IN_PROGRESS);
      expect(policy.canView(target, stranger)).toBe(false);
      expect(policy.canView(target, otherAgent)).toBe(false);
    });

    it('показывает исполнителям заявки без назначения', () => {
      expect(policy.canView(ticket(TicketStatus.NEW, null), otherAgent)).toBe(true);
    });
  });

  describe('фильтр списка', () => {
    it('ограничивает пользователя своими заявками', () => {
      expect(policy.visibilityFilter(author)).toEqual({ authorId: 'author' });
    });

    it('не ограничивает руководителя', () => {
      expect(policy.visibilityFilter(manager)).toEqual({});
    });

    it('показывает исполнителю свои и свободные заявки', () => {
      expect(policy.visibilityFilter(agent)).toEqual({
        OR: [{ authorId: 'agent' }, { assigneeId: 'agent' }, { assigneeId: null }],
      });
    });
  });

  describe('действия', () => {
    it('позволяет автору менять и удалять только новую заявку', () => {
      expect(policy.canEdit(ticket(TicketStatus.NEW, null), author)).toBe(true);
      expect(policy.canDelete(ticket(TicketStatus.NEW, null), author)).toBe(true);
      expect(policy.canEdit(ticket(TicketStatus.IN_PROGRESS), author)).toBe(false);
      expect(policy.canDelete(ticket(TicketStatus.IN_PROGRESS), author)).toBe(false);
    });

    it('не даёт менять закрытую заявку даже руководителю', () => {
      expect(policy.canEdit(ticket(TicketStatus.CLOSED), manager)).toBe(false);
    });

    it('даёт взять только свободную новую заявку исполнителю', () => {
      expect(policy.canTake(ticket(TicketStatus.NEW, null), agent)).toBe(true);
      expect(policy.canTake(ticket(TicketStatus.NEW, null), author)).toBe(false);
      expect(policy.canTake(ticket(TicketStatus.ASSIGNED), agent)).toBe(false);
    });

    it('даёт назначать только руководителю и только открытые заявки', () => {
      expect(policy.canAssign(ticket(TicketStatus.ASSIGNED), manager)).toBe(true);
      expect(policy.canAssign(ticket(TicketStatus.ASSIGNED), agent)).toBe(false);
      expect(policy.canAssign(ticket(TicketStatus.RESOLVED), manager)).toBe(false);
    });
  });

  describe('разделение автора и обработки', () => {
    const own = { status: TicketStatus.NEW, authorId: 'agent', assigneeId: null };

    it('не даёт исполнителю взять свою заявку', () => {
      expect(policy.canTake(own, agent)).toBe(false);
    });

    it('не даёт руководителю назначать исполнителя на свою заявку', () => {
      expect(policy.canAssign({ ...own, authorId: 'manager' }, manager)).toBe(false);
    });

    it('не считает автора ответственным даже с ролью руководителя', () => {
      const target = { status: TicketStatus.IN_PROGRESS, authorId: 'manager', assigneeId: 'agent' };
      expect(policy.isResponsible(target, manager)).toBe(false);
      expect(policy.allowedTransitions(target, manager)).toEqual([]);
    });
  });

  describe('разрешённые переходы', () => {
    it('не предлагает назначение как обычный переход', () => {
      expect(policy.allowedTransitions(ticket(TicketStatus.NEW, null), manager)).toEqual([]);
    });

    it('предлагает исполнителю переходы из работы', () => {
      expect(policy.allowedTransitions(ticket(TicketStatus.IN_PROGRESS), agent)).toEqual([
        TicketStatus.WAITING_USER,
        TicketStatus.RESOLVED,
      ]);
    });

    it('не даёт автору завершить заявку в работе', () => {
      expect(policy.allowedTransitions(ticket(TicketStatus.IN_PROGRESS), author)).toEqual([]);
    });

    it('даёт автору ответить и закрыть решённую заявку', () => {
      expect(policy.allowedTransitions(ticket(TicketStatus.WAITING_USER), author)).toEqual([
        TicketStatus.IN_PROGRESS,
      ]);
      expect(policy.allowedTransitions(ticket(TicketStatus.RESOLVED), author)).toEqual([
        TicketStatus.CLOSED,
        TicketStatus.IN_PROGRESS,
      ]);
    });

    it('не предлагает переходов из закрытой заявки', () => {
      expect(policy.allowedTransitions(ticket(TicketStatus.CLOSED), manager)).toEqual([]);
    });
  });
});
