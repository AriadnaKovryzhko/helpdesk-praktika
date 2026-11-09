import { RoleCode, TicketStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/auth/auth-user';
import { AppException } from '../common/errors/app.exception';
import { TicketsService } from '../tickets/tickets.service';
import { AttachmentStorageService } from './attachment-storage.service';
import { AttachmentsRepository, AttachmentWithUploader } from './attachments.repository';
import { AttachmentsService, cleanFileName, MAX_ATTACHMENT_BYTES } from './attachments.service';
import { detectAllowedFile } from './file-signature';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const user = (id: string, ...roles: RoleCode[]): AuthUser => ({
  id,
  email: `${id}@t.ru`,
  fullName: id,
  roles,
});
const author = user('author', RoleCode.USER);

const attachment = (uploaderId = 'author'): AttachmentWithUploader => ({
  id: 'a1',
  ticketId: 't1',
  uploaderId,
  originalName: 'file.png',
  storedName: 'stored.png',
  mimeType: 'image/png',
  sizeBytes: 9,
  createdAt: new Date(),
  uploader: { id: uploaderId, fullName: uploaderId, email: `${uploaderId}@t.ru` },
});

describe('detectAllowedFile', () => {
  it('распознаёт разрешённые форматы по содержимому', () => {
    expect(detectAllowedFile(PNG)?.mimeType).toBe('image/png');
    expect(detectAllowedFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.extension).toBe('jpg');
    expect(detectAllowedFile(Buffer.from('%PDF-1.7'))?.extension).toBe('pdf');
  });

  it('отличает docx от обычного zip-архива', () => {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(
      detectAllowedFile(Buffer.concat([zipHeader, Buffer.from('word/document.xml')]))?.extension,
    ).toBe('docx');
    expect(detectAllowedFile(Buffer.concat([zipHeader, Buffer.from('other.txt')]))).toBeNull();
  });

  it('отклоняет исполняемый файл с разрешённым расширением', () => {
    expect(detectAllowedFile(Buffer.from('MZ\x90\x00'))).toBeNull();
    expect(detectAllowedFile(Buffer.from('<script>alert(1)</script>'))).toBeNull();
  });
});

describe('cleanFileName', () => {
  it('восстанавливает кириллицу и убирает путь', () => {
    const raw = Buffer.from('../../отчёт.pdf', 'utf8').toString('latin1');
    expect(cleanFileName(raw)).toBe('отчёт.pdf');
  });

  it('подставляет имя для пустого значения', () => {
    expect(cleanFileName('')).toBe('file');
  });
});

describe('AttachmentsService', () => {
  let repo: jest.Mocked<AttachmentsRepository>;
  let storage: jest.Mocked<AttachmentStorageService>;
  let tickets: jest.Mocked<Pick<TicketsService, 'getAccessible'>>;
  let service: AttachmentsService;

  const openTicket = { id: 't1', status: TicketStatus.IN_PROGRESS };
  const file = { originalname: 'file.png', buffer: PNG, size: PNG.length };

  beforeEach(() => {
    repo = {
      findByTicket: jest.fn(),
      findInTicket: jest.fn(),
      countByTicket: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue(attachment()),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AttachmentsRepository>;
    storage = {
      save: jest.fn().mockResolvedValue('stored.png'),
      open: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<AttachmentStorageService>;
    tickets = { getAccessible: jest.fn().mockResolvedValue(openTicket) };
    service = new AttachmentsService(
      repo,
      storage,
      tickets as unknown as TicketsService,
      { record: jest.fn() } as unknown as AuditService,
    );
  });

  const code = async (promise: Promise<unknown>) => {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppException);
    return (error as AppException).code;
  };

  it('сохраняет файл с типом, определённым по содержимому', async () => {
    await service.upload('t1', file, author);
    expect(storage.save).toHaveBeenCalledWith(PNG, 'png');
    expect(repo.create.mock.calls[0][0].mimeType).toBe('image/png');
  });

  it('отклоняет файл неверного типа', async () => {
    expect(await code(service.upload('t1', { ...file, buffer: Buffer.from('text') }, author))).toBe(
      'UNSUPPORTED_FILE_TYPE',
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('отклоняет слишком большой файл', async () => {
    expect(
      await code(service.upload('t1', { ...file, size: MAX_ATTACHMENT_BYTES + 1 }, author)),
    ).toBe('FILE_TOO_LARGE');
  });

  it('требует наличие файла', async () => {
    expect(await code(service.upload('t1', undefined, author))).toBe('FILE_REQUIRED');
  });

  it('запрещает загрузку в закрытую заявку', async () => {
    tickets.getAccessible.mockResolvedValue({
      ...openTicket,
      status: TicketStatus.CLOSED,
    } as never);
    expect(await code(service.upload('t1', file, author))).toBe('TICKET_CLOSED');
  });

  it('удаляет файл, если запись в базе не создалась', async () => {
    repo.create.mockRejectedValue(new Error('сбой'));
    await expect(service.upload('t1', file, author)).rejects.toThrow('сбой');
    expect(storage.remove).toHaveBeenCalledWith('stored.png');
  });

  it('не отдаёт файл без доступа к заявке', async () => {
    tickets.getAccessible.mockRejectedValue(new AppException(404, 'TICKET_NOT_FOUND', 'нет'));
    expect(await code(service.download('t1', 'a1', author))).toBe('TICKET_NOT_FOUND');
    expect(storage.open).not.toHaveBeenCalled();
  });

  it('запрещает удалять чужое вложение', async () => {
    repo.findInTicket.mockResolvedValue(attachment('other'));
    expect(await code(service.remove('t1', 'a1', author))).toBe('FORBIDDEN');
  });

  it('удаляет своё вложение из базы и с диска', async () => {
    repo.findInTicket.mockResolvedValue(attachment());
    await service.remove('t1', 'a1', author);
    expect(repo.delete).toHaveBeenCalledWith('a1');
    expect(storage.remove).toHaveBeenCalledWith('stored.png');
  });
});
